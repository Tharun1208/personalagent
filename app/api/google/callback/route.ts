import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { exchangeCode, getDriveEmail, getRedirectUri } from '@/lib/google/drive';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const origin = url.origin;

  const error = url.searchParams.get('error');
  if (error) {
    return NextResponse.redirect(new URL('/#settings?drive=denied', origin));
  }

  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  if (!code || !state) {
    return NextResponse.redirect(new URL('/#settings?drive=invalid', origin));
  }

  const payload = auth.verifyToken(state);
  if (!payload?.userId) {
    return NextResponse.redirect(new URL('/#settings?drive=invalid', origin));
  }

  try {
    const tokens = await exchangeCode(code, getRedirectUri(origin));
    const existing = db.getIntegration(payload.userId);
    const refreshToken = tokens.refresh_token || existing?.refreshToken;

    if (!refreshToken) {
      return NextResponse.redirect(new URL('/#settings?drive=no_refresh_token', origin));
    }

    const email = await getDriveEmail(tokens.access_token);

    db.saveIntegration({
      id: existing?.id || `gdrive_${payload.userId}`,
      userId: payload.userId,
      refreshToken,
      email: email || existing?.email,
      scope: tokens.scope,
      connectedAt: existing?.connectedAt || new Date().toISOString(),
      lastBackupAt: existing?.lastBackupAt,
      lastBackupFileId: existing?.lastBackupFileId,
    });

    return NextResponse.redirect(new URL('/#settings?drive=connected', origin));
  } catch (err: any) {
    console.error('Google Drive callback failed:', err?.message);
    return NextResponse.redirect(new URL('/#settings?drive=error', origin));
  }
}
