import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db, ensureDbReady, flushDb, isStorageDegraded } from '@/lib/db';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await ensureDbReady();
  const user = auth.getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const memory = db.getMemoryById(id, user.id);
  if (!memory) return NextResponse.json({ error: 'Memory not found' }, { status: 404 });

  return NextResponse.json({ memory });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await ensureDbReady();
  const user = auth.getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const updated = db.updateMemory(id, user.id, body);
  if (!updated) return NextResponse.json({ error: 'Memory not found' }, { status: 404 });

  await flushDb();
  return NextResponse.json({ memory: updated });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await ensureDbReady();
  const user = auth.getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (isStorageDegraded()) {
    return NextResponse.json({ error: 'Storage temporarily unavailable', success: false }, { status: 503 });
  }

  const { id } = await params;
  const ok = db.deleteMemory(id, user.id);
  await flushDb();
  return NextResponse.json({ success: ok });
}
