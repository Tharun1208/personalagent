import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db, ensureDbReady, flushDb } from '@/lib/db';
import { downloadBackupFile, getAccessToken, isDriveConfigured } from '@/lib/google/drive';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  await ensureDbReady();
  const user = auth.getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const integration = db.getIntegration(user.id);
  if (!integration?.refreshToken) {
    return NextResponse.json(
      { error: 'Google Drive is not connected. Connect it from Settings → Backup.' },
      { status: 400 },
    );
  }
  if (!isDriveConfigured()) {
    return NextResponse.json({ error: 'Google Drive is not configured on the server.' }, { status: 501 });
  }

  const body = await req.json().catch(() => ({}));
  const fileId = typeof body.fileId === 'string' ? body.fileId : '';
  if (!fileId) {
    return NextResponse.json({ error: 'fileId is required' }, { status: 400 });
  }

  try {
    const accessToken = await getAccessToken(integration.refreshToken);
    const backup = await downloadBackupFile(accessToken, fileId);

    if (!backup || typeof backup !== 'object' || (!backup.tasks && !backup.memories && !backup.notes)) {
      return NextResponse.json({ error: 'This file is not a valid Assistance backup.' }, { status: 400 });
    }

    const result = db.importUserData(user.id, backup);
    await flushDb();

    return NextResponse.json({
      success: true,
      imported: result.imported,
      sourceFileId: fileId,
      message: 'Backup restored from Google Drive.',
    });
  } catch (err: any) {
    const message = err?.message || 'Restore from Google Drive failed';
    if (/invalid_grant|invalid_client|unauthorized/i.test(message)) {
      db.deleteIntegration(user.id);
      await flushDb();
      return NextResponse.json(
        { error: 'Google Drive access expired. Please reconnect Drive in Settings.' },
        { status: 401 },
      );
    }
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
