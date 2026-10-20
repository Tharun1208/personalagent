import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db, ensureDbReady, flushDb } from '@/lib/db';
import {
  getDropboxAccessToken,
  isDropboxConfigured,
  listDropboxBackups,
  pruneOldDropboxBackups,
  sanitizeBackupPayload,
  uploadDropboxBackup,
} from '@/lib/dropbox/backup';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const AUTO_BACKUP_INTERVAL_MS = 24 * 60 * 60 * 1000;

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

function notConnected() {
  return NextResponse.json(
    { error: 'Dropbox is not connected. Connect it from Settings → Backup.' },
    { status: 400 },
  );
}

export async function GET(req: NextRequest) {
  await ensureDbReady();
  const user = auth.getUserFromRequest(req);
  if (!user) return unauthorized();

  const integration = db.getDropboxIntegration(user.id);
  if (!integration?.refreshToken) return notConnected();
  if (!isDropboxConfigured()) {
    return NextResponse.json({ error: 'Dropbox is not configured on the server.' }, { status: 501 });
  }

  try {
    const accessToken = await getDropboxAccessToken(integration.refreshToken);
    const files = await listDropboxBackups(accessToken);
    return NextResponse.json({
      success: true,
      lastBackupAt: integration.lastBackupAt || null,
      files: files.map((f) => ({
        id: f.id,
        name: f.name,
        createdAt: f.createdTime,
        size: f.size,
      })),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Could not list Dropbox backups' }, { status: 502 });
  }
}

export async function POST(req: NextRequest) {
  await ensureDbReady();
  const user = auth.getUserFromRequest(req);
  if (!user) return unauthorized();

  const integration = db.getDropboxIntegration(user.id);
  if (!integration?.refreshToken) return notConnected();
  if (!isDropboxConfigured()) {
    return NextResponse.json({ error: 'Dropbox is not configured on the server.' }, { status: 501 });
  }

  const body = await req.json().catch(() => ({}));
  const isAuto = Boolean(body.auto);

  if (isAuto) {
    if (!user.preferences?.autoDropboxBackupEnabled) {
      return NextResponse.json({ success: true, skipped: true, reason: 'auto_backup_disabled' });
    }
    if (integration.lastBackupAt) {
      const elapsed = Date.now() - new Date(integration.lastBackupAt).getTime();
      if (elapsed < AUTO_BACKUP_INTERVAL_MS) {
        return NextResponse.json({
          success: true,
          skipped: true,
          reason: 'recent_backup',
          lastBackupAt: integration.lastBackupAt,
        });
      }
    }
  }

  try {
    const accessToken = await getDropboxAccessToken(integration.refreshToken);
    const payload = sanitizeBackupPayload(db.exportUserData(user.id));
    payload.backupMeta = {
      app: 'Assistance',
      kind: 'dropbox',
      accountEmail: user.email,
      createdAt: new Date().toISOString(),
    };

    const file = await uploadDropboxBackup(accessToken, payload);
    const pruned = await pruneOldDropboxBackups(accessToken);
    const now = new Date().toISOString();

    db.updateDropboxIntegration(user.id, {
      lastBackupAt: now,
      lastBackupFileId: file.id,
    });
    await flushDb();

    return NextResponse.json({
      success: true,
      file: { id: file.id, name: file.name, createdAt: file.createdTime },
      lastBackupAt: now,
      pruned,
    });
  } catch (err: any) {
    const message = err?.message || 'Dropbox backup failed';
    if (/invalid_grant|invalid_client|expired_access_token|revoked|unauthorized/i.test(message)) {
      db.deleteDropboxIntegration(user.id);
      await flushDb();
      return NextResponse.json(
        { error: 'Dropbox access expired. Please reconnect Dropbox in Settings.' },
        { status: 401 },
      );
    }
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
