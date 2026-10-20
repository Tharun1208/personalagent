/**
 * Storage for offline mutations (no network imports, safe for lib/api.ts).
 */

const QUEUE_KEY = 'assistance_offline_queue_v1';
const MAX_QUEUE_SIZE = 500;

export interface QueuedMutation {
  id: string;
  url: string;
  method: string;
  body?: string;
  contentType?: string;
  createdAt: string;
  clientUpdatedAt: string;
}

/** Only these mutating requests are eligible for the offline queue. */
const QUEUEABLE_PREFIXES = [
  '/api/tasks',
  '/api/notes',
  '/api/reminders',
  '/api/goals',
  '/api/habits',
  '/api/ledger',
  '/api/memories',
  '/api/conversations',
  '/api/notifications',
];

const NEVER_QUEUE_PREFIXES = [
  '/api/chat',
  '/api/auth',
  '/api/backup',
  '/api/settings',
  '/api/tools',
  '/api/sync',
];

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
}

export function isQueueableRequest(url: string, method: string): boolean {
  const m = (method || 'GET').toUpperCase();
  if (!['POST', 'PATCH', 'PUT', 'DELETE'].includes(m)) return false;
  if (!url.startsWith('/api/')) return false;
  if (NEVER_QUEUE_PREFIXES.some((p) => url.startsWith(p))) return false;
  return QUEUEABLE_PREFIXES.some((p) => url.startsWith(p));
}

export function getQueuedMutations(): QueuedMutation[] {
  if (!isBrowser()) return [];
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeOfflineQueue(queue: QueuedMutation[]): void {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue.slice(-MAX_QUEUE_SIZE)));
    window.dispatchEvent(
      new CustomEvent('assistance:offline-queue-changed', { detail: { size: queue.length } }),
    );
  } catch {
    /* storage full — drop silently, next online sync still runs */
  }
}

function extractTimestamp(body?: string): string {
  if (body) {
    try {
      const parsed = JSON.parse(body);
      if (parsed?.updatedAt) return parsed.updatedAt;
      if (parsed?.createdAt) return parsed.createdAt;
    } catch {
      /* not JSON */
    }
  }
  return new Date().toISOString();
}

/**
 * Adds a mutation to the offline queue. Repeated updates to the same resource
 * are collapsed so the queue stays small and the last local edit wins.
 */
export function enqueueMutation(
  method: string,
  url: string,
  body?: string,
  contentType?: string,
): QueuedMutation {
  const normalizedMethod = method.toUpperCase();
  const entry: QueuedMutation = {
    id: `op_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    url,
    method: normalizedMethod,
    body,
    contentType,
    createdAt: new Date().toISOString(),
    clientUpdatedAt: extractTimestamp(body),
  };

  const queue = getQueuedMutations();
  const existingIndex = queue.findIndex(
    (op) => op.url === entry.url && op.method === normalizedMethod,
  );

  if (existingIndex >= 0 && ['PATCH', 'PUT', 'DELETE'].includes(normalizedMethod)) {
    queue[existingIndex] = {
      ...entry,
      // Keep the earliest creation time so ordering stays stable.
      createdAt: queue[existingIndex].createdAt,
    };
  } else {
    queue.push(entry);
  }

  writeOfflineQueue(queue);
  return entry;
}
