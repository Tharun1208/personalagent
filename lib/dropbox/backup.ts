/**
 * Dropbox helpers for WhatsApp-style cloud backups.
 *
 * Uses an "App folder" scoped app: the app only sees the dedicated
 * `Apps/<app-name>` directory, never the rest of the user's Dropbox.
 */

import { sanitizeBackupPayload } from '@/lib/backup/sanitize';

const DROPBOX_AUTH_URL = 'https://www.dropbox.com/oauth2/authorize';
const DROPBOX_TOKEN_URL = 'https://api.dropboxapi.com/oauth2/token';
const DROPBOX_API = 'https://api.dropboxapi.com/2';
const DROPBOX_CONTENT_API = 'https://content.dropboxapi.com/2';
const FILE_PREFIX = 'assistance-backup-';
const MAX_BACKUPS = 5;

export { sanitizeBackupPayload };

export interface DropboxFile {
  id: string;
  name: string;
  createdTime?: string;
  size?: number;
}

export function isDropboxConfigured(): boolean {
  return Boolean(process.env.DROPBOX_APP_KEY && process.env.DROPBOX_APP_SECRET);
}

export function getAppOrigin(fallbackOrigin?: string): string {
  const configured = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL;
  const origin = configured || fallbackOrigin || 'http://localhost:3000';
  return origin.replace(/\/$/, '');
}

export function getDropboxRedirectUri(fallbackOrigin?: string): string {
  return `${getAppOrigin(fallbackOrigin)}/api/dropbox/callback`;
}

export function buildDropboxAuthUrl(state: string, redirectUri: string): string {
  const params = new URLSearchParams({
    client_id: process.env.DROPBOX_APP_KEY || '',
    response_type: 'code',
    token_access_type: 'offline',
    redirect_uri: redirectUri,
    state,
  });
  return `${DROPBOX_AUTH_URL}?${params.toString()}`;
}

export async function exchangeDropboxCode(
  code: string,
  redirectUri: string,
): Promise<{ access_token: string; refresh_token?: string; scope?: string; expires_in?: number }> {
  const res = await fetch(DROPBOX_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      grant_type: 'authorization_code',
      client_id: process.env.DROPBOX_APP_KEY || '',
      client_secret: process.env.DROPBOX_APP_SECRET || '',
      redirect_uri: redirectUri,
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.access_token) {
    throw new Error(data.error_description || data.error || 'Dropbox token exchange failed');
  }
  return data;
}

export async function getDropboxAccessToken(refreshToken: string): Promise<string> {
  const res = await fetch(DROPBOX_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
      client_id: process.env.DROPBOX_APP_KEY || '',
      client_secret: process.env.DROPBOX_APP_SECRET || '',
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.access_token) {
    throw new Error(data.error_description || data.error || 'Dropbox token refresh failed');
  }
  return data.access_token as string;
}

async function dropboxApi(accessToken: string, endpoint: string, body: unknown) {
  const res = await fetch(`${DROPBOX_API}${endpoint}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body ?? {}),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Dropbox error (${res.status}): ${text.slice(0, 300)}`);
  }
  return res;
}

export async function getDropboxEmail(accessToken: string): Promise<string | undefined> {
  try {
    const res = await dropboxApi(accessToken, '/users/get_current_account', null);
    const data = await res.json();
    return typeof data?.email === 'string' ? data.email : undefined;
  } catch {
    return undefined;
  }
}

export async function uploadDropboxBackup(
  accessToken: string,
  payload: unknown,
): Promise<DropboxFile> {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const path = `/${FILE_PREFIX}${stamp}.json`;
  const arg = JSON.stringify({
    path,
    mode: 'add',
    autorename: true,
    mute: true,
  });

  const res = await fetch(`${DROPBOX_CONTENT_API}/files/upload`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/octet-stream',
      'Dropbox-API-Arg': arg,
    },
    body: JSON.stringify(payload, null, 2),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Dropbox upload error (${res.status}): ${text.slice(0, 300)}`);
  }

  const file = await res.json();
  return {
    id: file.path_lower || file.path_display || path,
    name: file.name || path.split('/').pop() || path,
    createdTime: file.server_modified,
    size: file.size,
  };
}

export async function listDropboxBackups(accessToken: string): Promise<DropboxFile[]> {
  const res = await dropboxApi(accessToken, '/files/list_folder', {
    path: '',
    recursive: false,
    include_deleted: false,
    limit: 100,
  });
  const data = await res.json();
  const entries = Array.isArray(data?.entries) ? data.entries : [];

  return entries
    .filter(
      (entry: any) =>
        entry['.tag'] === 'file' &&
        typeof entry.name === 'string' &&
        entry.name.startsWith(FILE_PREFIX),
    )
    .map((entry: any) => ({
      id: entry.path_lower || entry.path_display,
      name: entry.name,
      createdTime: entry.server_modified,
      size: entry.size,
    }))
    .sort((a: DropboxFile, b: DropboxFile) => (b.createdTime || '').localeCompare(a.createdTime || ''));
}

export async function downloadDropboxBackup(accessToken: string, path: string): Promise<any> {
  const res = await fetch(`${DROPBOX_CONTENT_API}/files/download`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Dropbox-API-Arg': JSON.stringify({ path }),
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Dropbox download error (${res.status}): ${text.slice(0, 300)}`);
  }
  return res.json();
}

export async function deleteDropboxBackup(accessToken: string, path: string): Promise<void> {
  await dropboxApi(accessToken, '/files/delete_v2', { path });
}

/** Keeps only the newest MAX_BACKUPS files in the app folder. */
export async function pruneOldDropboxBackups(accessToken: string): Promise<number> {
  const files = await listDropboxBackups(accessToken);
  const stale = files.slice(MAX_BACKUPS);
  for (const file of stale) {
    try {
      await deleteDropboxBackup(accessToken, file.id);
    } catch {
      /* best-effort cleanup */
    }
  }
  return stale.length;
}
