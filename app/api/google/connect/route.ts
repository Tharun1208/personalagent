import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { buildAuthUrl, getRedirectUri, isDriveConfigured } from '@/lib/google/drive';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const user = auth.getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!isDriveConfigured()) {
    return NextResponse.json(
      {
        error:
          'Google Drive is not configured. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to your environment.',
      },
      { status: 501 },
    );
  }

  const origin = new URL(req.url).origin;
  const state = auth.signToken({ userId: user.id, email: user.email });
  return NextResponse.redirect(buildAuthUrl(state, getRedirectUri(origin)));
}
