import mongoose from 'mongoose';
import dns from 'node:dns';

/** Hard ceiling for DNS + TCP + TLS + auth handshake to Atlas. */
const SERVER_SELECTION_TIMEOUT_MS = 5000;
/** After a failed attempt, skip reconnecting briefly so requests fail fast. */
const FAILURE_COOLDOWN_MS = 60_000;

let resolversChecked = false;

/**
 * Some environments (notably Windows dev setups) expose only a loopback
 * resolver that refuses SRV queries, which breaks `mongodb+srv://` URIs with
 * `querySrv ECONNREFUSED` even though the OS resolves fine. When that is the
 * case, fall back to public resolvers so Atlas connections can succeed.
 */
function ensureUsableResolvers(): void {
  if (resolversChecked) return;
  resolversChecked = true;
  try {
    const servers = dns.getServers();
    const onlyLocal =
      servers.length === 0 ||
      servers.every((s) => s === '127.0.0.1' || s === '::1' || s === 'localhost');
    if (onlyLocal) {
      dns.setServers(['8.8.8.8', '1.1.1.1']);
      console.log('ℹ️ Using public DNS resolvers for MongoDB SRV lookups');
    }
  } catch {
    /* non-fatal — keep default resolver behavior */
  }
}

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

export async function connectToDatabase(): Promise<typeof mongoose | null> {
  const uri = getUri().trim();

  if (!uri) {
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
    if (uri.startsWith('mongodb+srv://')) ensureUsableResolvers();

    const opts = {
      bufferCommands: false,
      maxPoolSize: 10,
      autoIndex: false,
      serverSelectionTimeoutMS: SERVER_SELECTION_TIMEOUT_MS,
      connectTimeoutMS: SERVER_SELECTION_TIMEOUT_MS,
      socketTimeoutMS: 20_000,
      maxIdleTimeMS: 60_000,
    };

    cached.promise = mongoose
      .connect(uri, opts)
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
        console.error(
          `❌ MongoDB connection error (${SERVER_SELECTION_TIMEOUT_MS}ms budget):`,
          cached.lastError,
        );
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
