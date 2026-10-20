import mongoose from 'mongoose';
import dns from 'node:dns';

/** Hard ceiling for DNS + TCP + TLS + auth handshake to Atlas. */
const SERVER_SELECTION_TIMEOUT_MS = 5000;
/** After a failed attempt, skip reconnecting briefly so requests fail fast. */
const FAILURE_COOLDOWN_MS = 5 * 60_000;
/** Avoid flooding the terminal with one identical error per request. */
const ERROR_LOG_INTERVAL_MS = 5 * 60_000;

declare global {
  // eslint-disable-next-line no-var
  var mongooseConnection:
    | {
        conn: typeof mongoose | null;
        promise: Promise<typeof mongoose> | null;
        lastFailureAt: number;
        lastError: string | null;
      }
    | undefined;
  // eslint-disable-next-line no-var
  var __mongoErrorLoggedAt: number | undefined;
}

function getCache() {
  if (!global.mongooseConnection) {
    global.mongooseConnection = {
      conn: null,
      promise: null,
      lastFailureAt: 0,
      lastError: null,
    };
  }
  return global.mongooseConnection;
}

const cached = getCache();

function getUri(): string {
  return process.env.MONGODB_URI || process.env.MONGO_URI || '';
}

export function isMongoConfigured(): boolean {
  return Boolean(getUri().trim());
}

/**
 * Static generation runs inside `next build`. Connecting to Atlas there adds
 * seconds of latency, logs auth failures into the deployment output, and can
 * never persist anything useful. Runtime requests connect normally.
 */
function isBuildPhase(): boolean {
  return process.env.NEXT_PHASE === 'phase-production-build';
}

/** True while we are inside the post-failure cooldown window. */
export function isMongoCoolingDown(): boolean {
  return Date.now() - cached.lastFailureAt < FAILURE_COOLDOWN_MS;
}

export function getMongoStatus() {
  return {
    configured: isMongoConfigured(),
    connected: Boolean(cached.conn),
    coolingDown: isMongoCoolingDown(),
    lastError: cached.lastError,
  };
}

/**
 * Some Node runtimes ship with a resolver that fails SRV lookups even though
 * plain lookups work. Rebuild the connection string from the resolved SRV/TXT
 * records so the driver can connect without doing its own SRV query.
 */
function publicResolver(): dns.Resolver {
  const resolver = new dns.Resolver();
  resolver.setServers(['8.8.8.8', '1.1.1.1']);
  return resolver;
}

async function resolveSrvWithFallback(
  host: string,
): Promise<Array<{ name: string; port: number }>> {
  try {
    return await dns.promises.resolveSrv(host);
  } catch {
    return new Promise((resolve, reject) => {
      publicResolver().resolveSrv(host, (err, records) => (err ? reject(err) : resolve(records)));
    });
  }
}

async function resolveTxtWithFallback(host: string): Promise<string> {
  try {
    const txt = await dns.promises.resolveTxt(host);
    return txt.map((chunks) => chunks.join('')).join('&');
  } catch {
    const txt = await new Promise<string[][]>((resolve, reject) => {
      publicResolver().resolveTxt(host, (err, records) => (err ? reject(err) : resolve(records)));
    });
    return txt.map((chunks) => chunks.join('')).join('&');
  }
}

async function resolveSrvToDirectUri(uri: string): Promise<string | null> {
  try {
    const rest = uri.slice('mongodb+srv://'.length);
    const at = rest.lastIndexOf('@');
    if (at === -1) return null;

    const auth = rest.slice(0, at + 1);
    const hostAndPath = rest.slice(at + 1);
    const slash = hostAndPath.indexOf('/');
    const host = slash === -1 ? hostAndPath : hostAndPath.slice(0, slash);
    const pathAndQuery = slash === -1 ? '/' : hostAndPath.slice(slash);
    const [path, existingQuery = ''] = pathAndQuery.split('?');

    const records = await resolveSrvWithFallback(`_mongodb._tcp.${host}`);
    if (!records.length) return null;

    let txtOptions = '';
    try {
      txtOptions = await resolveTxtWithFallback(host);
    } catch {
      /* TXT is optional */
    }

    const params = new URLSearchParams(existingQuery);
    for (const [key, value] of new URLSearchParams(txtOptions)) {
      if (!params.has(key)) params.set(key, value);
    }
    if (!params.has('tls')) params.set('tls', 'true');

    const seeds = records.map((record) => `${record.name}:${record.port}`).join(',');
    return `mongodb://${auth}${seeds}${path || '/'}?${params.toString()}`;
  } catch (err) {
    console.warn('⚠️ SRV fallback resolution failed:', (err as Error)?.message || err);
    return null;
  }
}

export async function connectToDatabase(): Promise<typeof mongoose | null> {
  const uri = getUri().trim();

  if (!uri) {
    return null;
  }

  if (isBuildPhase()) {
    return null;
  }

  if (cached.conn) {
    return cached.conn;
  }

  // Fail fast for a short window after a connection failure instead of paying
  // the full server-selection timeout on every single request.
  if (isMongoCoolingDown()) {
    return null;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      maxPoolSize: 10,
      autoIndex: false,
      serverSelectionTimeoutMS: SERVER_SELECTION_TIMEOUT_MS,
      connectTimeoutMS: SERVER_SELECTION_TIMEOUT_MS,
      socketTimeoutMS: 20_000,
      maxIdleTimeMS: 60_000,
    };

    const connectWithSrvFallback = async () => {
      try {
        return await mongoose.connect(uri, opts);
      } catch (err) {
        const message = String((err as Error)?.message || '');
        if (
          uri.startsWith('mongodb+srv://') &&
          /querySrv|ENOTFOUND|ECONNREFUSED|ETIMEOUT/i.test(message)
        ) {
          const directUri = await resolveSrvToDirectUri(uri);
          if (directUri) {
            console.log('ℹ️ SRV lookup failed; retrying MongoDB with resolved hosts');
            return mongoose.connect(directUri, opts);
          }
        }
        throw err;
      }
    };

    cached.promise = connectWithSrvFallback()
      .then((mongooseInstance) => {
        console.log('✅ Connected to MongoDB successfully');
        cached.lastFailureAt = 0;
        cached.lastError = null;
        return mongooseInstance;
      })
      .catch((err) => {
        cached.promise = null;
        cached.conn = null;
        cached.lastFailureAt = Date.now();
        cached.lastError = err?.message || 'MongoDB connection failed';
        const lastLogged = globalThis.__mongoErrorLoggedAt || 0;
        if (Date.now() - lastLogged > ERROR_LOG_INTERVAL_MS) {
          globalThis.__mongoErrorLoggedAt = Date.now();
          const authFailed = /bad auth|authentication failed/i.test(cached.lastError || '');
          const hint = authFailed
            ? ' Fix MONGODB_URI credentials (Atlas → Database Access) — until then, data written on this host will not persist.'
            : ' The app is running on the local fallback store; fix MONGODB_URI to restore persistent storage.';
          console.warn(
            `⚠️ MongoDB is configured but unreachable (${SERVER_SELECTION_TIMEOUT_MS}ms budget): ${cached.lastError}.` +
              ` Continuing on the local fallback store; next retry in 5 minutes.${hint}`,
          );
        }
        throw err;
      });
  }

  try {
    cached.conn = await cached.promise;
  } catch {
    cached.promise = null;
    return null;
  }

  return cached.conn;
}
