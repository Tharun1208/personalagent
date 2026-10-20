import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db, ensureDbReady } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * GET /api/export
 * Downloads a complete JSON snapshot of the signed-in user's data: tasks,
 * reminders, memories, goals, habits, notes, ledger, spending, conversations,
 * messages and agent actions. The file can be re-imported from Settings.
 */
export async function GET(req: NextRequest) {
  await ensureDbReady();
  const user = auth.getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const data = db.exportUserData(user.id);
  const date = new Date().toISOString().slice(0, 10);

  return new NextResponse(JSON.stringify(data, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="assistance-backup-${date}.json"`,
      'Cache-Control': 'no-store',
    },
  });
}
