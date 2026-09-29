import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { ensureDbReady } from '@/lib/db';

export async function GET(req: NextRequest) {
  await ensureDbReady();
  const user = auth.getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ user: null }, { status: 200 });
  }
  return NextResponse.json({ user }, { status: 200 });
}

export async function POST(req: NextRequest) {
  const res = NextResponse.json({ success: true });
  res.cookies.delete(auth.getCookieName());
  return res;
}
