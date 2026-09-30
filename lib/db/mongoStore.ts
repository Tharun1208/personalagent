import { connectToDatabase, isMongoConfigured as mongodbIsConfigured } from './mongodb';

// Keep this as a local named export. This avoids Turbopack treating the
// re-export as absent while preserving the public mongoStore API.
export function isMongoConfigured(): boolean {
  return mongodbIsConfigured();
}
import {
  UserModel,
  CredentialModel,
  ConversationModel,
  MessageModel,
  MemoryModel,
  TaskModel,
  ReminderModel,
  GoalModel,
  HabitModel,
  AgentActionModel,
  NotificationModel,
  ConfirmationModel,
  LedgerModel,
} from './models';

/**
 * MongoStore — Atlas-backed primary store with an in-process mirror.
 *
 * Hybrid strategy (chosen for fast ship):
 *  - Cold start: hydrate the FULL dataset from Atlas into module memory
 *  - Reads: served instantly from the mirror (same signatures as before)
 *  - Writes: mutate the mirror immediately, then persist the affected
 *    document to Atlas (fire-and-forget write-through)
 *
 * On a single long-running process (Fly.io/local) this is fully consistent.
 * On serverless (Vercel) each warm instance holds a mirror; cross-instance
 * staleness is possible but re-hydration happens on every cold start, and
 * writes are persisted immediately — acceptable for personal use.
 */

export interface DbSchema {
  users: any[];
  userCredentials: { userId: string; passwordHash: string }[];
  conversations: any[];
  messages: any[];
  memories: any[];
  tasks: any[];
  reminders: any[];
  goals: any[];
  habits: any[];
  agentActions: any[];
  notifications: any[];
  confirmations: any[];
  ledger: any[];
}

const COLLECTION_MAP = {
  users: UserModel,
  userCredentials: CredentialModel,
  conversations: ConversationModel,
  messages: MessageModel,
  memories: MemoryModel,
  tasks: TaskModel,
  reminders: ReminderModel,
  goals: GoalModel,
  habits: HabitModel,
  agentActions: AgentActionModel,
  notifications: NotificationModel,
  confirmations: ConfirmationModel,
  ledger: LedgerModel,
} as const;

export type CollectionName = keyof typeof COLLECTION_MAP;

let mirror: DbSchema | null = null;
let hydrationPromise: Promise<DbSchema> | null = null;

function emptySchema(): DbSchema {
  return {
    users: [],
    userCredentials: [],
    conversations: [],
    messages: [],
    memories: [],
    tasks: [],
    reminders: [],
    goals: [],
    habits: [],
    agentActions: [],
    notifications: [],
    confirmations: [],
    ledger: [],
  };
}

/** Strip mongoose internals so mirror docs look like plain JSON objects */
function lean<T = any>(doc: any): T {
  if (!doc) return doc;
  return JSON.parse(JSON.stringify(doc));
}

let isHydrated = false;

/**
 * Hydrate the mirror from Atlas. Safe to call repeatedly — the promise is
 * cached, and every NEW serverless invocation gets a fresh module scope,
 * so each cold start re-hydrates automatically.
 */
export async function hydrateStore(): Promise<DbSchema> {
  if (isHydrated && mirror) return mirror;
  if (!isMongoConfigured()) {
    mirror = emptySchema();
    isHydrated = true;
    return mirror;
  }
  if (hydrationPromise) return hydrationPromise;

  hydrationPromise = (async () => {
    // Fill the SAME object that getMirror() may have already handed out —
    // avoids the early-write-lost race where mutations made before hydration
    // would be discarded when `mirror` was reassigned.
    const data = getMirror();
    const conn = await connectToDatabase();
    if (!conn) {
      return data;
    }

    const loads: Promise<void>[] = (
      Object.keys(COLLECTION_MAP) as CollectionName[]
    ).map(async (name) => {
      try {
        const docs = await (COLLECTION_MAP[name] as any).find({}).lean();
        (data as any)[name] = docs.map(lean);
      } catch (err) {
        console.error(`⚠️ hydrate ${name} failed:`, err);
        (data as any)[name] = (data as any)[name] || [];
      }
    });

    await Promise.all(loads);
    isHydrated = true;
    console.log(
      `✅ MongoStore hydrated: ${data.users.length} users, ${data.conversations.length} conversations, ${data.tasks.length} tasks`,
    );
    return data;
  })();

  return hydrationPromise;
}

/** Get the mirror (call after hydrateStore in every db method entrypoint) */
export function getMirror(): DbSchema {
  if (!mirror) {
    // Synchronous fallback — starts empty; hydrateStore fills it async.
    // db methods that need data should be preceded by hydrateStore().
    mirror = emptySchema();
  }
  return mirror;
}

let pendingWrites: Promise<any>[] = [];

/**
 * Persist one document (upsert by its natural key).
 * Returns the write promise and tracks it in pendingWrites for flushDb().
 */
export function persistDoc(collection: CollectionName, doc: any): Promise<any> {
  if (!isMongoConfigured()) return Promise.resolve();

  const keyField = getKeyField(collection);
  const model: any = COLLECTION_MAP[collection];

  // Clone without mongoose-hostile fields; _id handled by Mongo
  const payload = JSON.parse(JSON.stringify(doc));
  delete payload._id;
  delete payload.__v;

  const writePromise = (async () => {
    try {
      const conn = await connectToDatabase();
      if (!conn) return;
      return await model.findOneAndUpdate({ [keyField]: payload[keyField] }, payload, {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      });
    } catch (err: any) {
      console.error(`⚠️ persist ${collection} failed:`, err?.message || err);
    }
  })();

  pendingWrites.push(writePromise);
  writePromise.finally(() => {
    pendingWrites = pendingWrites.filter((p) => p !== writePromise);
  });

  return writePromise;
}

/** Delete one document by natural key */
export function deleteDoc(collection: CollectionName, key: string | number): Promise<any> {
  if (!isMongoConfigured()) return Promise.resolve();
  const keyField = getKeyField(collection);

  const deletePromise = (async () => {
    try {
      const conn = await connectToDatabase();
      if (!conn) return;
      return await (COLLECTION_MAP[collection] as any).deleteOne({ [keyField]: key });
    } catch (err: any) {
      console.error(`⚠️ delete ${collection} failed:`, err?.message || err);
    }
  })();

  pendingWrites.push(deletePromise);
  deletePromise.finally(() => {
    pendingWrites = pendingWrites.filter((p) => p !== deletePromise);
  });

  return deletePromise;
}

/** Await all in-flight writes to MongoDB before serverless response finishes */
export async function flushDb(): Promise<void> {
  if (pendingWrites.length > 0) {
    await Promise.allSettled([...pendingWrites]);
  }
}

/** Natural key per collection (matches the JSON-file id semantics) */
export function getKeyField(collection: CollectionName): string {
  switch (collection) {
    case 'userCredentials':
      return 'userId';
    default:
      return 'id';
  }
}
