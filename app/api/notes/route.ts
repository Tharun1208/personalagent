import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db, ensureDbReady } from '@/lib/db';
import { Note, NoteFolder, NoteColor } from '@/types';

export const dynamic = 'force-dynamic';

const NOTE_COLORS: NoteColor[] = ['cream', 'mint', 'peach', 'lavender', 'slate'];
const FOLDER_THEMES = ['amber', 'peach', 'slate', 'mint', 'lavender'] as const;

export async function GET(req: NextRequest) {
  await ensureDbReady();
  const user = auth.getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  return NextResponse.json({
    notes: db.getNotes(user.id),
    folders: db.getNoteFolders(user.id),
  });
}

export async function POST(req: NextRequest) {
  await ensureDbReady();
  const user = auth.getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const kind = body.kind === 'folder' ? 'folder' : 'note';

  if (kind === 'folder') {
    if (!body.name || !String(body.name).trim()) {
      return NextResponse.json({ error: 'Folder name is required' }, { status: 400 });
    }
    const folder: NoteFolder = {
      id: body.id || `folder_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId: user.id,
      name: String(body.name).trim(),
      icon: body.icon || '📁',
      badge: body.badge,
      themeColor: FOLDER_THEMES.includes(body.themeColor) ? body.themeColor : 'slate',
      createdAt: body.createdAt || new Date().toISOString(),
    };
    return NextResponse.json({ folder: db.createNoteFolder(folder) }, { status: 201 });
  }

  if (!body.title || !String(body.title).trim()) {
    return NextResponse.json({ error: 'Note title is required' }, { status: 400 });
  }

  const now = new Date().toISOString();
  const note: Note = {
    id: body.id || `note_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    userId: user.id,
    title: String(body.title).trim(),
    content: typeof body.content === 'string' ? body.content : '',
    folderId: body.folderId || undefined,
    color: NOTE_COLORS.includes(body.color) ? body.color : 'cream',
    category: body.category,
    isPinned: Boolean(body.isPinned),
    goalId: body.goalId,
    goalTitle: body.goalTitle,
    createdAt: body.createdAt || now,
    updatedAt: now,
  };

  return NextResponse.json({ note: db.createNote(note) }, { status: 201 });
}
