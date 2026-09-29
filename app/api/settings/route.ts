import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  const user = auth.getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  return NextResponse.json({ user, preferences: user.preferences });
}

export async function PATCH(req: NextRequest) {
  const user = auth.getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { name, ...prefs } = body;

  let updatedUser = user;
  if (name !== undefined) {
    updatedUser = db.updateUser(user.id, { name }) || user;
  }
  if (Object.keys(prefs).length > 0) {
    updatedUser = db.updateUserPreferences(user.id, prefs) || updatedUser;
  }

  return NextResponse.json({ success: true, user: updatedUser });
}

export async function POST(req: NextRequest) {
  const user = auth.getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { action } = await req.json();

  if (action === 'export') {
    const data = db.exportUserData(user.id);
    return NextResponse.json({ export: data });
  }

  if (action === 'wipe') {
    db.wipeUserData(user.id);
    return NextResponse.json({ success: true, message: 'All personal data has been securely deleted.' });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
