/**
 * Local deletion tombstones.
 *
 * The app keeps a copy of every collection in localStorage so it can render
 * instantly (and offline). Without a record of deletions, a refresh can merge
 * a stale local copy back into state — and even re-upload it to the server,
 * making deleted items reappear. Tombstones mark recently deleted ids so the
 * merge ignores them.
 */

const STORAGE_KEY = 'assistance_deleted_ids';
const TTL_MS = 15 * 60 * 1000;

type TombstoneMap = Record<string, Record<string, number>>;

function read(): TombstoneMap {
  if (typeof window === 'undefined') return {};
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function write(map: TombstoneMap): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    /* storage unavailable */
  }
}

export function markDeleted(collection: string, id: string): void {
  if (typeof window === 'undefined' || !collection || !id) return;
  const map = read();
  const bucket = map[collection] || {};
  bucket[id] = Date.now();
  map[collection] = bucket;
  write(map);
}

export function isDeleted(collection: string, id: string): boolean {
  const map = read();
  const ts = map[collection]?.[id];
  if (!ts) return false;
  return Date.now() - ts <= TTL_MS;
}

export function filterDeleted<T>(
  collection: string,
  items: T[] | undefined | null,
): T[] {
  if (!Array.isArray(items)) return [];
  if (typeof window === 'undefined') return items;
  return items.filter((item) => {
    const id = (item as { id?: string } | null | undefined)?.id;
    return !id || !isDeleted(collection, id);
  });
}

/** Drop tombstones that are old enough that the server must have caught up. */
export function pruneTombstones(): void {
  if (typeof window === 'undefined') return;
  const map = read();
  const now = Date.now();
  let changed = false;

  for (const collection of Object.keys(map)) {
    const bucket = map[collection];
    for (const id of Object.keys(bucket)) {
      if (now - bucket[id] > TTL_MS) {
        delete bucket[id];
        changed = true;
      }
    }
    if (Object.keys(bucket).length === 0) {
      delete map[collection];
      changed = true;
    }
  }

  if (changed) write(map);
}
