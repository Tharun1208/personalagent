import { enqueueMutation, isQueueableRequest } from './offline/queueStore';

/**
 * Universal Authenticated API Fetcher
 * Automatically resolves remote URLs when running inside Android Capacitor / offline APK,
 * attaches stored JWT token as Authorization Bearer header,
 * and gracefully falls back on offline errors without crashing the application.
 * Mutating requests made offline are queued and replayed with conflict handling.
 */

export const REMOTE_API_URL = 'https://personalagent-one.vercel.app';

export function getRemoteApiUrl(): string {
  if (typeof window !== 'undefined') {
    const custom = localStorage.getItem('recall_server_url');
    if (custom && custom.trim()) {
      return custom.trim().replace(/\/+$/, '');
    }
  }
  return REMOTE_API_URL;
}

export function resolveApiUrl(url: string | URL): string {
  if (typeof url !== 'string') return url.toString();
  if (url.startsWith('http://') || url.startsWith('https://')) return url;

  if (typeof window !== 'undefined') {
    const origin = window.location.origin;
    if (origin && (origin.startsWith('http://') || origin.startsWith('https://'))) {
      if (!origin.includes('localhost') || window.location.port === '3000' || window.location.port === '3001') {
        return url;
      }
    }

    const isCapacitor =
      (window as any).Capacitor?.isNativePlatform?.() ||
      window.location.protocol === 'capacitor:' ||
      window.location.protocol === 'file:';
    if (isCapacitor) {
      const baseUrl = getRemoteApiUrl();
      const cleanPath = url.startsWith('/') ? url : `/${url}`;
      return `${baseUrl}${cleanPath}`;
    }
  }
  return url;
}

function registerBackgroundSync(): void {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
  try {
    navigator.serviceWorker.ready
      .then((registration: any) => registration.sync?.register('assistance-sync'))
      .catch(() => {});
  } catch {
    /* background sync unsupported */
  }
}

function queuedResponse(url: string): Response {
  return new Response(
    JSON.stringify({
      success: true,
      queued: true,
      offline: true,
      url,
      message: 'Saved offline — will sync when you are back online.',
    }),
    {
      status: 202,
      statusText: 'Accepted (offline queue)',
      headers: { 'Content-Type': 'application/json' },
    },
  );
}

export async function apiFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('recall_token');
    if (token && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  }

  let targetUrl: RequestInfo | URL = input;
  if (typeof input === 'string') {
    targetUrl = resolveApiUrl(input);
  }

  const method = (init.method || 'GET').toUpperCase();
  const relativeUrl = typeof input === 'string' ? input : '';
  const canQueue =
    typeof window !== 'undefined' &&
    relativeUrl.length > 0 &&
    isQueueableRequest(relativeUrl, method) &&
    (typeof init.body === 'string' || method === 'DELETE');

  // Offline: persist the mutation instead of failing.
  if (
    canQueue &&
    typeof navigator !== 'undefined' &&
    navigator.onLine === false
  ) {
    const contentType = headers.get('Content-Type') || undefined;
    enqueueMutation(method, relativeUrl, init.body as string, contentType);
    registerBackgroundSync();
    return queuedResponse(relativeUrl);
  }

  try {
    const isRemote =
      typeof targetUrl === 'string'
        ? targetUrl.startsWith('http')
        : targetUrl instanceof URL
        ? targetUrl.protocol.startsWith('http')
        : false;
    const res = await fetch(targetUrl, {
      ...init,
      headers,
      credentials: isRemote ? 'omit' : 'same-origin',
      // Deletes must survive an immediate page refresh: without keepalive the
      // browser cancels the request on unload and the item reappears.
      keepalive: init.keepalive ?? method === 'DELETE',
      // Never let a stale browser cache serve an old collection after a
      // mutation — always revalidate collection reads.
      cache: init.cache ?? (method === 'GET' ? 'no-store' : 'default'),
    });

    // Server unreachable / gateway failure: keep the mutation for later.
    if (canQueue && [502, 503, 504].includes(res.status)) {
      const contentType = headers.get('Content-Type') || undefined;
      enqueueMutation(method, relativeUrl, init.body as string, contentType);
      registerBackgroundSync();
      return queuedResponse(relativeUrl);
    }

    return res;
  } catch (err: any) {
    if (canQueue) {
      const contentType = headers.get('Content-Type') || undefined;
      enqueueMutation(method, relativeUrl, init.body as string, contentType);
      registerBackgroundSync();
      return queuedResponse(relativeUrl);
    }
    // Only return fallback response if the network request actually threw an error
    return new Response(JSON.stringify({ error: err?.message || 'Network request failed', offline: true, success: false }), {
      status: 503,
      statusText: 'Service Unavailable',
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function safeJson<T = any>(res: Response): Promise<T | null> {
  if (!res.ok) return null;
  const contentType = res.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) return null;
  try {
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

