import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db, ensureDbReady } from '@/lib/db';
import { User } from '@/types';

function getOrCreateUser(req: NextRequest): User {
  const user = auth.getUserFromRequest(req);
  if (user) return user;

  // Fallback to first user in database
  const data = (db as any).getAllUsers ? (db as any).getAllUsers() : [];
  if (data.length > 0) return data[0];

  // If no user exists, create default primary user
  const newUser: User = {
    id: `usr_primary_${Date.now()}`,
    email: 'user@assistance.ai',
    name: 'Personal User',
    createdAt: new Date().toISOString(),
    preferences: {
      theme: 'dark',
      aiProvider: 'builtin',
      model: 'Recall Core Ultra',
      voiceEnabled: true,
      voiceAutoRead: false,
      proactiveReminders: true,
      soundEffects: true,
      confirmDestructiveActions: true,
    },
  };
  return db.createUser(newUser, auth.hashPassword('default_password'));
}

export async function GET(req: NextRequest) {
  await ensureDbReady();
  const user = getOrCreateUser(req);
  return NextResponse.json({ success: true, user, preferences: user.preferences });
}

export async function PATCH(req: NextRequest) {
  await ensureDbReady();
  const user = getOrCreateUser(req);

  const body = await req.json();
  const { name, email, avatar, preferences, ...rest } = body;

  let updatedUser = user;
  const userPatch: Partial<User> = {};
  if (name !== undefined && typeof name === 'string') userPatch.name = name.trim();
  if (email !== undefined && typeof email === 'string') userPatch.email = email.trim();
  if (avatar !== undefined) userPatch.avatar = avatar;

  if (Object.keys(userPatch).length > 0) {
    updatedUser = db.updateUser(user.id, userPatch) || updatedUser;
  }

  const prefsToUpdate = preferences || (Object.keys(rest).length > 0 ? rest : null);
  if (prefsToUpdate) {
    updatedUser = db.updateUserPreferences(user.id, prefsToUpdate) || updatedUser;
  }

  const token = auth.signToken({ userId: updatedUser.id, email: updatedUser.email });
  const res = NextResponse.json({ success: true, user: updatedUser, token });
  res.cookies.set(auth.getCookieName(), token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 365 * 24 * 60 * 60,
    path: '/',
  });

  return res;
}

export async function POST(req: NextRequest) {
  await ensureDbReady();
  const user = getOrCreateUser(req);

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
