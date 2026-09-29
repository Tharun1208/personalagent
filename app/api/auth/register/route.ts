import { NextRequest, NextResponse } from 'next/server';
import { db, ensureDbReady } from '@/lib/db';
import { auth } from '@/lib/auth';
import { User } from '@/types';

export async function POST(req: NextRequest) {
  try {
    await ensureDbReady();
    const { name, email: rawEmail, password } = await req.json();
    const email = typeof rawEmail === 'string' ? rawEmail.trim().toLowerCase() : rawEmail;

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Name, email and password are required.' }, { status: 400 });
    }

    const existing = db.getUserByEmail(email);
    if (existing) {
      return NextResponse.json({ error: 'An account with this email already exists.' }, { status: 409 });
    }

    const userId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const passwordHash = auth.hashPassword(password);

    const newUser: User = {
      id: userId,
      email,
      name,
      avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`,
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

    db.createUser(newUser, passwordHash);
    const token = auth.signToken({ userId: newUser.id, email: newUser.email });

    const res = NextResponse.json({ success: true, user: newUser, token }, { status: 201 });
    res.cookies.set(auth.getCookieName(), token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 86400,
      path: '/',
    });

    return res;
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Registration failed' }, { status: 500 });
  }
}
