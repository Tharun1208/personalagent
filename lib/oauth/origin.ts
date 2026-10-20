import type { NextRequest } from 'next/server';

/**
 * Resolves the public origin of the current request.
 *
 * OAuth redirect URIs must exactly match what is registered with the provider,
 * so we cannot rely on `new URL(req.url).origin` alone: in local development
 * Next.js may report `0.0.0.0` when the dev server binds to all interfaces.
 */
export function getRequestOrigin(req: NextRequest): string {
  const configured = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL;
  if (configured) return configured.replace(/\/$/, '');

  const forwardedHost = req.headers.get('x-forwarded-host');
  const host =
    forwardedHost || req.headers.get('host') || new URL(req.url).host;
  const forwardedProto = req.headers.get('x-forwarded-proto');

  const isLocal = /^(localhost|127\.|0\.0\.0\.0|\[::1\])/i.test(host);
  const proto = forwardedProto || (isLocal ? 'http' : 'https');
  const safeHost = host.replace(/^0\.0\.0\.0(?=:|$)/, 'localhost');

  return `${proto}://${safeHost}`;
}
