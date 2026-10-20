import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  buildDropboxAuthUrl,
  getDropboxRedirectUri,
  isDropboxConfigured,
} from '@/lib/dropbox/backup';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const user = auth.getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!isDropboxConfigured()) {
    return NextResponse.json(
      {
        error:
          'Dropbox is not configured. Add DROPBOX_APP_KEY and DROPBOX_APP_SECRET to your environment.',
      },
      { status: 501 },
    );
  }

  const origin = new URL(req.url).origin;
  const state = auth.signToken({ userId: user.id, email: user.email });
  return NextResponse.redirect(buildDropboxAuthUrl(state, getDropboxRedirectUri(origin)));
}
