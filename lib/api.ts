/**
 * Universal Authenticated API Fetcher
 * Automatically resolves remote URLs when running inside Android Capacitor / offline APK,
 * attaches stored JWT token as Authorization Bearer header,
 * and gracefully falls back on offline errors without crashing the application.
 */

export const REMOTE_API_URL = 'https://fathers-printable-lil-evidence.trycloudflare.com';

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

  try {
    const isRemote =
      typeof targetUrl === 'string'
        ? targetUrl.startsWith('http')
        : targetUrl instanceof URL
        ? targetUrl.protocol.startsWith('http')
        : false;
    return await fetch(targetUrl, {
      ...init,
      headers,
      credentials: isRemote ? 'omit' : 'same-origin',
    });
  } catch (err: any) {
    // Only return fallback response if the network request actually threw an error
    return new Response(JSON.stringify({ error: err?.message || 'Network request failed', offline: false, success: false }), {
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

