/**
 * Offline mutation queue with conflict handling.
 *
 * Mutating API calls made while offline are persisted in localStorage and
 * replayed when the connection returns. Before replaying an update/delete we
 * fetch the current server record and compare `updatedAt` timestamps:
 *
 *  - server newer than the queued edit  -> conflict, server version is kept
 *  - queued edit newer or equal          -> replay the request
 *
 * Conflicts are surfaced to the UI via the `assistance:offline-conflict`
 * window event so the user can be told what happened.
 */

import { apiFetch } from '@/lib/api';
import {
  getQueuedMutations,
  writeOfflineQueue,
  type QueuedMutation,
} from './queueStore';

export type { QueuedMutation } from './queueStore';
export { enqueueMutation, getQueuedMutations, isQueueableRequest } from './queueStore';

export interface OfflineConflict {
  id: string;
  url: string;
  method: string;
  reason: string;
  serverUpdatedAt?: string;
  clientUpdatedAt?: string;
  server?: any;
}

export interface FlushResult {
  attempted: number;
  synced: number;
  conflicts: OfflineConflict[];
  remaining: number;
  offline: boolean;
}

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
}

function removeQueued(id: string): void {
  writeOfflineQueue(getQueuedMutations().filter((op) => op.id !== id));
}

function resolveEntity(payload: any): any {
  if (!payload || typeof payload !== 'object') return null;
  const candidates = [
    payload.task,
    payload.note,
    payload.folder,
    payload.goal,
    payload.habit,
    payload.reminder,
    payload.entry,
    payload.ledgerEntry,
    payload.memory,
    payload.conversation,
    payload.notification,
    payload.data,
    payload.item,
  ];
  for (const candidate of candidates) {
    if (candidate && typeof candidate === 'object' && candidate.updatedAt) return candidate;
  }
  if (payload.updatedAt) return payload;
  return null;
}

/**
 * Checks whether the server copy of a resource changed after the local edit.
 * Returns a conflict descriptor when the server is newer.
 */
async function detectConflict(op: QueuedMutation): Promise<OfflineConflict | null> {
  if (op.method === 'POST') return null; // creates can't conflict
  if (!op.url.includes('/api/')) return null;
  if (op.url.startsWith('/api/conversations')) return null;

  try {
    const res = await apiFetch(op.url, { method: 'GET' });
    if (!res.ok) return null;
    const data = await res.json().catch(() => null);
    const server = resolveEntity(data);
    if (!server?.updatedAt) return null;

    const serverTime = new Date(server.updatedAt).getTime();
    const clientTime = new Date(op.clientUpdatedAt).getTime();
    if (Number.isNaN(serverTime) || Number.isNaN(clientTime)) return null;

    if (serverTime > clientTime) {
      return {
        id: op.id,
        url: op.url,
        method: op.method,
        reason: 'server_newer',
        serverUpdatedAt: server.updatedAt,
        clientUpdatedAt: op.clientUpdatedAt,
        server,
      };
    }
    return null;
  } catch {
    // If the check itself fails, still attempt the replay.
    return null;
  }
}

function dispatchConflicts(conflicts: OfflineConflict[]): void {
  if (!isBrowser() || conflicts.length === 0) return;
  try {
    window.dispatchEvent(
      new CustomEvent('assistance:offline-conflict', { detail: { conflicts } }),
    );
  } catch {
    /* ignore */
  }
}

let flushInFlight = false;

/**
 * Replays queued mutations in order. Stops at the first network failure so
 * nothing is lost; conflicts are skipped (server version wins) and reported.
 */
export async function flushOfflineQueue(): Promise<FlushResult> {
  const empty: FlushResult = {
    attempted: 0,
    synced: 0,
    conflicts: [],
    remaining: getQueuedMutations().length,
    offline: false,
  };

  if (!isBrowser()) return empty;
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return { ...empty, offline: true };
  }
  if (flushInFlight) return empty;

  flushInFlight = true;
  const conflicts: OfflineConflict[] = [];
  let synced = 0;
  let attempted = 0;

  try {
    const queue = getQueuedMutations();
    for (const op of queue) {
      const conflict = await detectConflict(op);
      if (conflict) {
        conflicts.push(conflict);
        removeQueued(op.id);
        continue;
      }

      attempted += 1;
      try {
        const headers: Record<string, string> = {};
        if (op.contentType) headers['Content-Type'] = op.contentType;

        const res = await apiFetch(op.url, {
          method: op.method,
          headers,
          body: op.body,
        });

        if (res.ok) {
          const payload = await res.clone().json().catch(() => null);
          if (payload?.queued) {
            // apiFetch re-queued it because the server is still unreachable.
            break;
          }
          synced += 1;
          removeQueued(op.id);
          continue;
        }

        if (res.status === 409) {
          const payload = await res.json().catch(() => null);
          conflicts.push({
            id: op.id,
            url: op.url,
            method: op.method,
            reason: 'conflict',
            server: payload,
          });
          removeQueued(op.id);
          continue;
        }

        if (res.status >= 500) {
          // Server unavailable — keep the op and retry on the next flush.
          break;
        }

        // Permanent client error (404/400) — drop to avoid an infinite loop.
        removeQueued(op.id);
      } catch {
        break;
      }
    }
  } finally {
    flushInFlight = false;
  }

  const result: FlushResult = {
    attempted,
    synced,
    conflicts,
    remaining: getQueuedMutations().length,
    offline: false,
  };

  dispatchConflicts(conflicts);
  if (isBrowser() && (synced > 0 || conflicts.length > 0)) {
    try {
      window.dispatchEvent(
        new CustomEvent('assistance:offline-synced', { detail: result }),
      );
    } catch {
      /* ignore */
    }
  }

  return result;
}

/** Human-readable timestamp of the oldest pending change, if any. */
export function getOldestQueuedAt(): string | null {
  const queue = getQueuedMutations();
  return queue.length > 0 ? queue[0].createdAt : null;
}
