import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db, ensureDbReady, flushDb, isStorageDegraded } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await ensureDbReady();
  const user = auth.getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  if (body.kind === 'folder') {
    const { kind, ...patch } = body;
    const folder = db.updateNoteFolder(id, user.id, patch);
    if (!folder) return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
    await flushDb();
    return NextResponse.json({ folder });
  }

  const { kind, ...patch } = body;
  const note = db.updateNote(id, user.id, patch);
  if (!note) return NextResponse.json({ error: 'Note not found' }, { status: 404 });
  await flushDb();
  return NextResponse.json({ note });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await ensureDbReady();
  const user = auth.getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (isStorageDegraded()) {
    return NextResponse.json({ error: 'Storage temporarily unavailable', success: false }, { status: 503 });
  }

  const { id } = await params;
  const kind = req.nextUrl.searchParams.get('kind');

  if (kind === 'folder') {
    const result = db.deleteNoteFolder(id, user.id);
    await flushDb();
    return NextResponse.json({ success: result.deleted, ...result });
  }

  const ok = db.deleteNote(id, user.id);
  await flushDb();
  return NextResponse.json({ success: ok });
}
