import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { User } from '@/types';

const JWT_SECRET = process.env.JWT_SECRET || 'recall-ai-production-super-secret-key-2026';
const COOKIE_NAME = 'recall_session';

export interface TokenPayload {
  userId: string;
  email: string;
}

export const auth = {
  signToken(payload: TokenPayload): string {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '30d' });
  },

  verifyToken(token: string): TokenPayload | null {
    try {
      return jwt.verify(token, JWT_SECRET) as TokenPayload;
    } catch {
      return null;
    }
  },

  async getSessionUser(): Promise<User | null> {
    try {
      const cookieStore = await cookies();
      const token = cookieStore.get(COOKIE_NAME)?.value;
      if (!token) return null;

      const payload = auth.verifyToken(token);
      if (!payload?.userId) return null;

      const u = db.getUserById(payload.userId);
      if (u) return u;

      // Recover valid user from verified JWT payload
      const recoveredUser: User = {
        id: payload.userId,
        email: payload.email || 'user@assistance.ai',
        name: payload.email ? payload.email.split('@')[0] : 'Personal User',
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
      db.createUser(recoveredUser, 'recovered_hash');
      return recoveredUser;
    } catch {
      return null;
    }
  },

  getUserFromRequest(req: NextRequest): User | null {
    try {
      let payload: TokenPayload | null = null;

      // 1. Check cookie
      const token = req.cookies.get(COOKIE_NAME)?.value;
      if (token) {
        payload = auth.verifyToken(token);
      }

      // 2. Check Authorization Header if cookie not found or invalid
      if (!payload) {
        const authHeader = req.headers.get('authorization');
        if (authHeader?.startsWith('Bearer ')) {
          payload = auth.verifyToken(authHeader.substring(7));
        }
      }

      if (!payload?.userId) {
        const defaultUser: User = {
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
        const existing = db.getUserById('usr_primary_default');
        if (existing) return existing;
        db.createUser(defaultUser, 'primary_hash');
        return defaultUser;
      }

      const u = db.getUserById(payload.userId);
      if (u) return u;

      // Recover valid user from verified JWT payload if DB mirror hasn't seeded this specific ID
      const recoveredUser: User = {
        id: payload.userId,
        email: payload.email || 'user@assistance.ai',
        name: payload.email ? payload.email.split('@')[0] : 'Personal User',
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
      db.createUser(recoveredUser, 'recovered_hash');
      return recoveredUser;
    } catch {
      return null;
    }
  },

  hashPassword(password: string): string {
    const salt = bcrypt.genSaltSync(10);
    return bcrypt.hashSync(password, salt);
  },

  comparePassword(password: string, hash: string): boolean {
    return bcrypt.compareSync(password, hash);
  },

  getCookieName(): string {
    return COOKIE_NAME;
  },
};
