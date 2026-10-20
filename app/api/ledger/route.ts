import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db, ensureDbReady, flushDb } from '@/lib/db';
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

    const body = await req.json().catch(() => ({}));
    const { personName, amount, currency, type, description, dueDate, category, status, paidAmount, payments, settledAt } = body || {};

    const cleanName = (personName || body?.name || 'Unnamed').toString().trim();
    const numAmount = typeof amount === 'number' ? amount : parseFloat(amount || '0');
    const validAmount = isNaN(numAmount) ? 0 : Math.max(0, numAmount);
    const validType = type === 'receive' ? 'receive' : 'give';

    const newEntry: LedgerEntry = {
      id: body?.id || `ledg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId: user.id,
      personName: cleanName || 'Unnamed',
      amount: validAmount,
      currency: currency || '₹',
      type: validType,
      status: status || 'pending',
      paidAmount: paidAmount || (status === 'settled' ? validAmount : 0),
      payments: Array.isArray(payments) ? payments : [],
      settledAt: settledAt,
      description: description?.toString()?.trim() || undefined,
      dueDate: dueDate || undefined,
      category: category || 'personal',
      createdAt: body?.createdAt || new Date().toISOString(),
    };

    const saved = db.createLedgerEntry(newEntry);
    await flushDb();
    return NextResponse.json({ entry: saved, success: true }, { status: 201 });
  } catch (error: any) {
    console.error('Error in POST /api/ledger:', error);
    return NextResponse.json({ error: error?.message || 'Internal Server Error', success: false }, { status: 500 });
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
      await flushDb();
      return NextResponse.json({ entry: settled, success: true });
    }

    if (action === 'partial_payment') {
      const { paymentAmount, note } = body;
      const numPayment = parseFloat(paymentAmount);
      if (isNaN(numPayment) || numPayment <= 0) {
        return NextResponse.json({ error: 'Invalid payment amount' }, { status: 400 });
      }
      const updated = db.recordPartialPayment(id, user.id, numPayment, note);
      await flushDb();
      return NextResponse.json({ entry: updated, success: true });
    }

    const updated = db.updateLedgerEntry(id, user.id, updates);
    await flushDb();
    return NextResponse.json({ entry: updated, success: true });
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
    await flushDb();
    return NextResponse.json({ success });
  } catch (error: any) {
    console.error('Error in DELETE /api/ledger:', error);
    return NextResponse.json({ error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}
