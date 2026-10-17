import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db, ensureDbReady } from '@/lib/db';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await ensureDbReady();
  const user = auth.getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  const updated = db.updateReminder(id, user.id, body);
  return NextResponse.json({ reminder: updated, success: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await ensureDbReady();
  const user = auth.getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const ok = db.deleteReminder(id, user.id);
  return NextResponse.json({ success: ok });
}
