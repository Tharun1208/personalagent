import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db, ensureDbReady } from '@/lib/db';
import { generateIcsCalendar, createGoogleDriveBackupPayload } from '@/lib/google/sync';

export async function GET(req: NextRequest) {
  try {
    await ensureDbReady();
    const user = auth.getUserFromRequest(req) || { id: 'usr_default_main' };
    const { searchParams } = new URL(req.url);
    const format = searchParams.get('format') || 'ics';

    if (format === 'ics') {
      const ics = generateIcsCalendar(user.id);
      return new NextResponse(ics, {
        status: 200,
        headers: {
          'Content-Type': 'text/calendar; charset=utf-8',
          'Content-Disposition': 'attachment; filename="recall-calendar.ics"',
        },
      });
    }

    const payload = createGoogleDriveBackupPayload(user.id);
    return NextResponse.json({ success: true, payload });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to generate sync payload' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensureDbReady();
    const user = auth.getUserFromRequest(req) || { id: 'usr_default_main' };
    const body = await req.json();

    const { action, googleToken } = body;

    if (action === 'drive_backup') {
      const payload = createGoogleDriveBackupPayload(user.id);
      
      // If client supplied Google OAuth token, we can upload directly to Drive API
      if (googleToken) {
        const fileContent = JSON.stringify(payload, null, 2);
        const metadata = {
          name: `recall_ai_backup_${new Date().toISOString().slice(0, 10)}.json`,
          mimeType: 'application/json',
        };

        const form = new FormData();
        form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
        form.append('file', new Blob([fileContent], { type: 'application/json' }));

        const driveRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${googleToken}`,
          },
          body: form,
        });

        if (!driveRes.ok) {
          const err = await driveRes.text();
          return NextResponse.json({ success: false, error: `Google Drive API error: ${err}` }, { status: 400 });
        }

        const driveData = await driveRes.json();
        return NextResponse.json({
          success: true,
          message: 'Backed up to Google Drive successfully!',
          fileId: driveData.id,
          timestamp: new Date().toISOString(),
        });
      }

      // Return backup metadata
      return NextResponse.json({
        success: true,
        message: 'Cloud backup package generated successfully',
        size: JSON.stringify(payload).length,
        timestamp: new Date().toISOString(),
      });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Sync failed' }, { status: 500 });
  }
}
