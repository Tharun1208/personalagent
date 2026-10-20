import mongoose from 'mongoose';

/** Hard ceiling for DNS + TCP + TLS + auth handshake to Atlas. */
const SERVER_SELECTION_TIMEOUT_MS = 5000;
/** After a failed attempt, skip reconnecting briefly so requests fail fast. */
const FAILURE_COOLDOWN_MS = 60_000;

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
