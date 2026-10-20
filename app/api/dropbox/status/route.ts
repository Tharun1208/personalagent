import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db, ensureDbReady, flushDb } from '@/lib/db';
import { isDropboxConfigured } from '@/lib/dropbox/backup';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  await ensureDbReady();
  const user = auth.getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const integration = db.getDropboxIntegration(user.id);
  return NextResponse.json({
    configured: isDropboxConfigured(),
    connected: Boolean(integration?.refreshToken),
    email: integration?.email || null,
    connectedAt: integration?.connectedAt || null,
    lastBackupAt: integration?.lastBackupAt || null,
    autoBackupEnabled: Boolean(user.preferences?.autoDropboxBackupEnabled),
  });
}

export async function POST(req: NextRequest) {
  await ensureDbReady();
  const user = auth.getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  if (typeof body.autoBackupEnabled === 'boolean') {
    db.updateUserPreferences(user.id, { autoDropboxBackupEnabled: body.autoBackupEnabled });
    await flushDb();
  }

  const integration = db.getDropboxIntegration(user.id);
  return NextResponse.json({
    success: true,
    autoBackupEnabled: Boolean(db.getUserById(user.id)?.preferences?.autoDropboxBackupEnabled),
    connected: Boolean(integration?.refreshToken),
  });
}

export async function DELETE(req: NextRequest) {
  await ensureDbReady();
  const user = auth.getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const removed = db.deleteDropboxIntegration(user.id);
  await flushDb();
  return NextResponse.json({ success: removed, connected: false });
}
