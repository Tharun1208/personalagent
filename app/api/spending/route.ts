import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db, ensureDbReady, flushDb, isStorageDegraded } from '@/lib/db';
import { SpendingEntry } from '@/types';

function normalizeEntry(body: any, userId: string): SpendingEntry {
  const amount = typeof body?.amount === 'number' ? body.amount : parseFloat(body?.amount || '0');
  if (isNaN(amount) || amount <= 0) {
    throw new Error('Amount must be a positive number.');
  }
  const now = new Date();
  return {
    id: body?.id || `spend_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    userId,
    amount: Math.round(amount * 100) / 100,
    category: (body?.category || 'other').toString().trim().toLowerCase() || 'other',
    note: body?.note ? body.note.toString().trim() : undefined,
    date: body?.date || now.toISOString().slice(0, 10),
    createdAt: body?.createdAt || now.toISOString(),
    updatedAt: now.toISOString(),
  };
}

export async function GET(req: NextRequest) {
  try {
    await ensureDbReady();
    const user = auth.getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized', spending: [] }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date');
    const spending = db
      .getSpendingEntries(user.id)
      .filter((entry) => !date || entry.date === date);

    return NextResponse.json({ spending });
  } catch (error: any) {
    console.error('Error in GET /api/spending:', error);
    return NextResponse.json({ error: error?.message || 'Internal Server Error', spending: [] }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensureDbReady();
    const user = auth.getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const entry = normalizeEntry(body, user.id);
    const saved = db.createSpendingEntry(entry);
    await flushDb();
    return NextResponse.json({ entry: saved, success: true }, { status: 201 });
  } catch (error: any) {
    const status = error?.message?.includes('positive number') ? 400 : 500;
    if (status === 500) console.error('Error in POST /api/spending:', error);
    return NextResponse.json({ error: error?.message || 'Internal Server Error', success: false }, { status });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await ensureDbReady();
    const user = auth.getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    if (!body?.id) return NextResponse.json({ error: 'Missing entry id' }, { status: 400 });

    const patch: Partial<SpendingEntry> = {};
    if (body.amount !== undefined) {
      const amount = parseFloat(body.amount);
      if (isNaN(amount) || amount <= 0) {
        return NextResponse.json({ error: 'Amount must be a positive number.' }, { status: 400 });
      }
      patch.amount = Math.round(amount * 100) / 100;
    }
    if (body.category !== undefined) patch.category = body.category.toString().trim().toLowerCase();
    if (body.note !== undefined) patch.note = body.note.toString().trim();
    if (body.date !== undefined) patch.date = body.date;

    const updated = db.updateSpendingEntry(body.id, user.id, patch);
    if (!updated) return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    await flushDb();
    return NextResponse.json({ entry: updated, success: true });
  } catch (error: any) {
    console.error('Error in PATCH /api/spending:', error);
    return NextResponse.json({ error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await ensureDbReady();
    const user = auth.getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (isStorageDegraded()) {
      return NextResponse.json({ error: 'Storage temporarily unavailable', success: false }, { status: 503 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing entry id' }, { status: 400 });

    const success = db.deleteSpendingEntry(id, user.id);
    await flushDb();
    return NextResponse.json({ success });
  } catch (error: any) {
    console.error('Error in DELETE /api/spending:', error);
    return NextResponse.json({ error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}
