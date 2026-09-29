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

      return db.getUserById(payload.userId);
    } catch {
      return null;
    }
  },

  getUserFromRequest(req: NextRequest): User | null {
    try {
      // 1. Check cookie
      const token = req.cookies.get(COOKIE_NAME)?.value;
      if (token) {
        const payload = auth.verifyToken(token);
        if (payload?.userId) {
          const u = db.getUserById(payload.userId);
          if (u) return u;
        }
      }

      // 2. Check Authorization Header
      const authHeader = req.headers.get('authorization');
      if (authHeader?.startsWith('Bearer ')) {
        const bearerToken = authHeader.substring(7);
        const payload = auth.verifyToken(bearerToken);
        if (payload?.userId) {
          const u = db.getUserById(payload.userId);
          if (u) return u;
        }
      }

      // No session → no user. Never fall back to a shared/seeded account:
      // that would leak one user's data into guest sessions.
      return null;
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
