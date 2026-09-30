import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db, ensureDbReady } from '@/lib/db';
import { LedgerEntry } from '@/types';

export async function GET(req: NextRequest) {
  try {
    await ensureDbReady();
    const user = auth.getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized', ledger: [] }, { status: 401 });

    const ledger = db.getLedgerEntries(user.id) || [];
    return NextResponse.json({ ledger });
  } catch (error: any) {
    console.error('Error in GET /api/ledger:', error);
    return NextResponse.json({ error: error?.message || 'Internal Server Error', ledger: [] }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensureDbReady();
    const user = auth.getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { personName, amount, currency, type, description, dueDate, category } = body;

    if (!personName || !amount || !type) {
      return NextResponse.json({ error: 'Missing required fields: personName, amount, type' }, { status: 400 });
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }

    const newEntry: LedgerEntry = {
      id: `ledg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId: user.id,
      personName: personName.trim(),
      amount: numAmount,
      currency: currency || '₹',
      type: type === 'give' ? 'give' : 'receive',
      status: 'pending',
      description: description?.trim() || undefined,
      dueDate: dueDate || undefined,
      category: category || 'personal',
      createdAt: new Date().toISOString(),
    };

    const saved = db.createLedgerEntry(newEntry);
    return NextResponse.json({ entry: saved }, { status: 201 });
  } catch (error: any) {
    console.error('Error in POST /api/ledger:', error);
    return NextResponse.json({ error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await ensureDbReady();
    const user = auth.getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { id, action, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'Missing entry id' }, { status: 400 });
    }

    if (action === 'settle') {
      const settled = db.settleLedgerEntry(id, user.id);
      if (!settled) return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
      return NextResponse.json({ entry: settled });
    }

    const updated = db.updateLedgerEntry(id, user.id, updates);
    if (!updated) return NextResponse.json({ error: 'Entry not found' }, { status: 404 });

    return NextResponse.json({ entry: updated });
  } catch (error: any) {
    console.error('Error in PATCH /api/ledger:', error);
    return NextResponse.json({ error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await ensureDbReady();
    const user = auth.getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing entry id' }, { status: 400 });
    }

    const success = db.deleteLedgerEntry(id, user.id);
    return NextResponse.json({ success });
  } catch (error: any) {
    console.error('Error in DELETE /api/ledger:', error);
    return NextResponse.json({ error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}
