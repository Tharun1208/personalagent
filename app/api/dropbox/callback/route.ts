import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import {
  exchangeDropboxCode,
  getDropboxEmail,
  getDropboxRedirectUri,
} from '@/lib/dropbox/backup';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const origin = url.origin;

  const error = url.searchParams.get('error');
  if (error) {
    return NextResponse.redirect(new URL('/#settings?dropbox=denied', origin));
  }

  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  if (!code || !state) {
    return NextResponse.redirect(new URL('/#settings?dropbox=invalid', origin));
  }

  const payload = auth.verifyToken(state);
  if (!payload?.userId) {
    return NextResponse.redirect(new URL('/#settings?dropbox=invalid', origin));
  }

  try {
    const tokens = await exchangeDropboxCode(code, getDropboxRedirectUri(origin));
    const existing = db.getDropboxIntegration(payload.userId);
    const refreshToken = tokens.refresh_token || existing?.refreshToken;

    if (!refreshToken) {
      return NextResponse.redirect(new URL('/#settings?dropbox=no_refresh_token', origin));
    }

    const email = await getDropboxEmail(tokens.access_token);

    db.saveDropboxIntegration({
      id: existing?.id || `dropbox_${payload.userId}`,
      userId: payload.userId,
      refreshToken,
      email: email || existing?.email,
      scope: tokens.scope,
      connectedAt: existing?.connectedAt || new Date().toISOString(),
      lastBackupAt: existing?.lastBackupAt,
      lastBackupFileId: existing?.lastBackupFileId,
    });

    return NextResponse.redirect(new URL('/#settings?dropbox=connected', origin));
  } catch (err: any) {
    console.error('Dropbox callback failed:', err?.message);
    return NextResponse.redirect(new URL('/#settings?dropbox=error', origin));
  }
}
