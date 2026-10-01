import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db, ensureDbReady } from '@/lib/db';
import { User } from '@/types';

export const dynamic = 'force-dynamic';

/**
 * POST /api/auth/guest
 * Seamlessly creates / initializes the primary permanent user profile.
 * No login or registration required.
 */
export async function POST(req: NextRequest) {
  try {
    await ensureDbReady();
    const allUsers = db.getAllUsers();
    let primaryUser = db.getUserById('usr_primary_default') || (allUsers.length > 0 ? allUsers[0] : null);
    if (!primaryUser) {
      primaryUser = {
        id: 'usr_primary_default',
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
      db.createUser(primaryUser, auth.hashPassword('primary_fixed_secret'));
    }
    const token = auth.signToken({ userId: primaryUser.id, email: primaryUser.email });

    const res = NextResponse.json({ success: true, user: primaryUser, token }, { status: 201 });
    res.cookies.set(auth.getCookieName(), token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 365 * 24 * 60 * 60, // 1 year persistent session
      path: '/',
    });

    return res;
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Session initialization failed' }, { status: 500 });
  }
}
