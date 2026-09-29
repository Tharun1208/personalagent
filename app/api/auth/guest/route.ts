import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db, ensureDbReady } from '@/lib/db';
import { User } from '@/types';
import { makeGuestEmail } from '@/lib/guest';

/**
 * POST /api/auth/guest
 * Creates an isolated guest user + session so guest data never mixes with
 * real accounts. Every guest gets their own user id in the DB.
 */
export async function POST(req: NextRequest) {
  try {
    await ensureDbReady();
    const guestUser: User = {
      id: `usr_guest_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      email: makeGuestEmail(),
      name: 'Guest User',
      createdAt: new Date().toISOString(),
      preferences: {
        theme: 'light',
        aiProvider: 'builtin',
        model: 'Recall Core Ultra',
        voiceEnabled: true,
        voiceAutoRead: false,
        proactiveReminders: true,
        soundEffects: true,
        confirmDestructiveActions: true,
      },
    };

    // Guests have no password — credential row with an unmatchable hash
    db.createUser(guestUser, auth.hashPassword(Math.random().toString(36) + Date.now()));
    const token = auth.signToken({ userId: guestUser.id, email: guestUser.email });

    const res = NextResponse.json({ success: true, user: guestUser, token }, { status: 201 });
    res.cookies.set(auth.getCookieName(), token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60, // guest session: 24h
      path: '/',
    });

    return res;
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Guest session failed' }, { status: 500 });
  }
}
