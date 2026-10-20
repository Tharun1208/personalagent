/**
 * Google Drive helpers for WhatsApp-style cloud backups.
 *
 * Uses the `drive.file` scope: the app can only see files it created itself,
 * so the rest of the user's Drive stays private.
 */

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const DRIVE_API = 'https://www.googleapis.com/drive/v3/files';
const DRIVE_UPLOAD_URL = 'https://www.googleapis.com/upload/drive/v3/files';
const BACKUP_FOLDER_NAME = 'Assistance Backups';
const MAX_BACKUPS = 5;

export const DRIVE_SCOPES = [
  'openid',
  'email',
  'https://www.googleapis.com/auth/drive.file',
];

export interface DriveFile {
  id: string;
  name: string;
  createdTime?: string;
  size?: string;
}

export function isDriveConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export function getAppOrigin(fallbackOrigin?: string): string {
  const configured = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL;
  const origin = configured || fallbackOrigin || 'http://localhost:3000';
  return origin.replace(/\/$/, '');
}

export function getRedirectUri(fallbackOrigin?: string): string {
  return `${getAppOrigin(fallbackOrigin)}/api/google/callback`;
}

export function buildAuthUrl(state: string, redirectUri: string): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID || '',
    redirect_uri: redirectUri,
    response_type: 'code',
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: 'true',
    scope: DRIVE_SCOPES.join(' '),
    state,
  });
  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

export async function exchangeCode(
  code: string,
  redirectUri: string,
): Promise<{ access_token: string; refresh_token?: string; scope?: string; expires_in?: number }> {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID || '',
      client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.access_token) {
    throw new Error(data.error_description || data.error || 'Google token exchange failed');
  }
  return data;
}

export async function getAccessToken(refreshToken: string): Promise<string> {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: process.env.GOOGLE_CLIENT_ID || '',
      client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
      grant_type: 'refresh_token',
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.access_token) {
    throw new Error(data.error_description || data.error || 'Google token refresh failed');
  }
  return data.access_token as string;
}

export async function getDriveEmail(accessToken: string): Promise<string | undefined> {
  try {
    const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return undefined;
    const data = await res.json();
    return typeof data.email === 'string' ? data.email : undefined;
  } catch {
    return undefined;
  }
}

async function driveFetch(accessToken: string, url: string, init: RequestInit = {}) {
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(init.headers || {}),
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Google Drive error (${res.status}): ${text.slice(0, 300)}`);
  }
  return res;
}

/** Finds (or creates) the visible "Assistance Backups" folder. */
export async function ensureBackupFolder(accessToken: string): Promise<string> {
  const q = `name='${BACKUP_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
  const params = new URLSearchParams({ q, fields: 'files(id,name)', spaces: 'drive' });
  const listRes = await driveFetch(accessToken, `${DRIVE_API}?${params.toString()}`);
  const list = await listRes.json();
  if (Array.isArray(list.files) && list.files.length > 0) {
    return list.files[0].id as string;
  }

  const createRes = await driveFetch(accessToken, `${DRIVE_API}?fields=id`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: BACKUP_FOLDER_NAME,
      mimeType: 'application/vnd.google-apps.folder',
    }),
  });
  const created = await createRes.json();
  return created.id as string;
}

export async function uploadBackupFile(
  accessToken: string,
  payload: unknown,
): Promise<DriveFile> {
  const folderId = await ensureBackupFolder(accessToken);
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const name = `assistance-backup-${stamp}.json`;
  const metadata = {
    name,
    mimeType: 'application/json',
    parents: [folderId],
  };
  const fileContent = JSON.stringify(payload, null, 2);
  const boundary = `----assistanceBackup${Date.now()}`;

  const body =
    `--${boundary}\r\n` +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    `${JSON.stringify(metadata)}\r\n` +
    `--${boundary}\r\n` +
    'Content-Type: application/json\r\n\r\n' +
    `${fileContent}\r\n` +
    `--${boundary}--`;

  const res = await driveFetch(
    accessToken,
    `${DRIVE_UPLOAD_URL}?uploadType=multipart&fields=id,name,createdTime,size`,
    {
      method: 'POST',
      headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
      body,
    },
  );

  const file = await res.json();
  return file as DriveFile;
}

export async function listBackupFiles(accessToken: string): Promise<DriveFile[]> {
  const folderId = await ensureBackupFolder(accessToken);
  const params = new URLSearchParams({
    q: `'${folderId}' in parents and trashed=false`,
    orderBy: 'createdTime desc',
    pageSize: String(MAX_BACKUPS * 2),
    fields: 'files(id,name,createdTime,size)',
    spaces: 'drive',
  });
  const res = await driveFetch(accessToken, `${DRIVE_API}?${params.toString()}`);
  const data = await res.json();
  return Array.isArray(data.files) ? (data.files as DriveFile[]) : [];
}

export async function downloadBackupFile(accessToken: string, fileId: string): Promise<any> {
  const res = await driveFetch(accessToken, `${DRIVE_API}/${encodeURIComponent(fileId)}?alt=media`);
  return res.json();
}

export async function deleteBackupFile(accessToken: string, fileId: string): Promise<void> {
  await driveFetch(accessToken, `${DRIVE_API}/${encodeURIComponent(fileId)}`, { method: 'DELETE' });
}

/** Keeps only the newest MAX_BACKUPS files in the backup folder. */
export async function pruneOldBackups(accessToken: string): Promise<number> {
  const files = await listBackupFiles(accessToken);
  const stale = files.slice(MAX_BACKUPS);
  for (const file of stale) {
    try {
      await deleteBackupFile(accessToken, file.id);
    } catch {
      /* best-effort cleanup */
    }
  }
  return stale.length;
}

/** Removes secrets before a snapshot leaves the server. */
export function sanitizeBackupPayload(payload: Record<string, any>): Record<string, any> {
  const clone = JSON.parse(JSON.stringify(payload || {}));
  const prefs = clone?.user?.preferences;
  if (prefs) {
    delete prefs.apiKey;
    delete prefs.githubToken;
    delete prefs.telegramBotToken;
    delete prefs.telegramChatId;
    delete prefs.customAlarmUrl;
  }
  return clone;
}
