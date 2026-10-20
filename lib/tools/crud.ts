import { db } from '@/lib/db';
import { Habit, Note, NoteFolder, NoteColor } from '@/types';
import type { ToolModule } from './index';

/** Resolve an entity by exact id first, then by fuzzy title/name match. */
function resolveByIdOrTitle<T extends { id: string }>(
  items: T[],
  query: string | undefined,
  getLabel: (item: T) => string,
): T | null {
  if (!query) return null;
  const q = query.trim().toLowerCase();
  if (!q) return null;

  const byId = items.find((i) => i.id === query);
  if (byId) return byId;

  const exact = items.find((i) => getLabel(i).toLowerCase() === q);
  if (exact) return exact;

  const contains = items.find((i) => getLabel(i).toLowerCase().includes(q));
  if (contains) return contains;

  const words = q.split(/\s+/).filter((w) => w.length > 3);
  return items.find((i) => words.some((w) => getLabel(i).toLowerCase().includes(w))) || null;
}

// ── HABIT TOOL ───────────────────────────────────────────────
const HabitTool: ToolModule = {
  name: 'HabitTool',
  description: 'Creates, tracks, updates and deletes daily/weekly habits and streaks.',
  actions: {
    createHabit: {
      name: 'createHabit',
      description: 'Creates a new habit to track.',
      parameters: {
        title: { type: 'string', description: 'Habit name', required: true },
        frequency: { type: 'string', description: 'daily | weekly' },
      },
      permissionLevel: 'WRITE',
    },
    getHabits: {
      name: 'getHabits',
      description: 'Lists all habits with streak and completion history.',
      parameters: {},
      permissionLevel: 'READ',
    },
    updateHabit: {
      name: 'updateHabit',
      description: 'Renames a habit or changes its frequency.',
      parameters: {
        habitId: { type: 'string', description: 'Habit ID or name', required: true },
        title: { type: 'string', description: 'New title' },
        frequency: { type: 'string', description: 'daily | weekly' },
      },
      permissionLevel: 'WRITE',
    },
    toggleHabit: {
      name: 'toggleHabit',
      description: 'Marks a habit complete/incomplete for today and updates the streak.',
      parameters: {
        habitId: { type: 'string', description: 'Habit ID or name', required: true },
      },
      permissionLevel: 'WRITE',
    },
    deleteHabit: {
      name: 'deleteHabit',
      description: 'Deletes a habit permanently.',
      parameters: {
        habitId: { type: 'string', description: 'Habit ID or name', required: true },
      },
      permissionLevel: 'DESTRUCTIVE',
    },
  },
  async execute(action, args, userId) {
    const habits = () => db.getHabits(userId);

    if (action === 'createHabit') {
      if (!args.title) return { success: false, message: 'Habit title is required.' };
      const habit: Habit = {
        id: `habit_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        userId,
        title: String(args.title).trim(),
        frequency: args.frequency === 'weekly' ? 'weekly' : 'daily',
        streak: 0,
        history: [],
        createdAt: new Date().toISOString(),
      };
      db.createHabit(habit);
      return { success: true, data: habit, message: `✓ Habit created: "${habit.title}" (${habit.frequency}).` };
    }

    if (action === 'getHabits') {
      const list = habits();
      return { success: true, data: list, message: list.length ? `You are tracking ${list.length} habit(s).` : 'No habits tracked yet.' };
    }

    if (action === 'updateHabit') {
      const target = resolveByIdOrTitle(habits(), args.habitId, (h) => h.title);
      if (!target) return { success: false, message: `Habit "${args.habitId}" not found.` };
      const patch: Partial<Habit> = {};
      if (args.title) patch.title = String(args.title).trim();
      if (args.frequency) patch.frequency = args.frequency === 'weekly' ? 'weekly' : 'daily';
      const updated = db.updateHabit(target.id, userId, patch);
      return { success: !!updated, data: updated, message: updated ? `✓ Habit updated: "${updated.title}".` : 'Update failed.' };
    }

    if (action === 'toggleHabit') {
      const target = resolveByIdOrTitle(habits(), args.habitId, (h) => h.title);
      if (!target) return { success: false, message: `Habit "${args.habitId}" not found.` };
      const updated = db.toggleHabit(target.id, userId);
      return {
        success: !!updated,
        data: updated,
        message: updated ? `✓ "${updated.title}" — streak is now ${updated.streak}.` : 'Update failed.',
      };
    }

    if (action === 'deleteHabit') {
      const target = resolveByIdOrTitle(habits(), args.habitId, (h) => h.title);
      if (!target) return { success: false, message: `Habit "${args.habitId}" not found.` };
      const ok = db.deleteHabit(target.id, userId);
      return { success: ok, message: ok ? `✓ Habit deleted: "${target.title}".` : 'Delete failed.' };
    }

    return { success: false, message: `Unknown habit action: ${action}` };
  },
};

// ── NOTE TOOL (notes + folders) ──────────────────────────────
const NOTE_COLORS: NoteColor[] = ['cream', 'mint', 'peach', 'lavender', 'slate'];

const NoteTool: ToolModule = {
  name: 'NoteTool',
  description: 'Creates, reads, updates and deletes notes and note folders.',
  actions: {
    createNote: {
      name: 'createNote',
      description: 'Creates a new note, optionally inside a folder.',
      parameters: {
        title: { type: 'string', description: 'Note title', required: true },
        content: { type: 'string', description: 'Note body (Markdown supported)', required: true },
        folderName: { type: 'string', description: 'Existing folder name or ID' },
        color: { type: 'string', description: 'cream | mint | peach | lavender | slate' },
        category: { type: 'string', description: 'Free-form category' },
      },
      permissionLevel: 'WRITE',
    },
    getNotes: {
      name: 'getNotes',
      description: 'Lists notes, optionally filtered by folder or search query.',
      parameters: {
        folderName: { type: 'string', description: 'Folder name or ID' },
        query: { type: 'string', description: 'Search text' },
      },
      permissionLevel: 'READ',
    },
    getNote: {
      name: 'getNote',
      description: 'Reads the full content of one note.',
      parameters: {
        noteId: { type: 'string', description: 'Note ID or title', required: true },
      },
      permissionLevel: 'READ',
    },
    updateNote: {
      name: 'updateNote',
      description: 'Edits a note title/body/folder/color, or appends text to it.',
      parameters: {
        noteId: { type: 'string', description: 'Note ID or title', required: true },
        title: { type: 'string', description: 'New title' },
        content: { type: 'string', description: 'Replacement content' },
        appendContent: { type: 'string', description: 'Text to append to the note' },
        folderName: { type: 'string', description: 'Move to folder (name/ID, or "none")' },
        color: { type: 'string', description: 'cream | mint | peach | lavender | slate' },
      },
      permissionLevel: 'WRITE',
    },
    deleteNote: {
      name: 'deleteNote',
      description: 'Deletes a note permanently.',
      parameters: {
        noteId: { type: 'string', description: 'Note ID or title', required: true },
      },
      permissionLevel: 'DESTRUCTIVE',
    },
    createFolder: {
      name: 'createFolder',
      description: 'Creates a note folder.',
      parameters: {
        name: { type: 'string', description: 'Folder name', required: true },
        icon: { type: 'string', description: 'Emoji icon' },
        themeColor: { type: 'string', description: 'amber | peach | slate | mint | lavender' },
      },
      permissionLevel: 'WRITE',
    },
    getFolders: {
      name: 'getFolders',
      description: 'Lists note folders with note counts.',
      parameters: {},
      permissionLevel: 'READ',
    },
    updateFolder: {
      name: 'updateFolder',
      description: 'Renames or restyles a note folder.',
      parameters: {
        folderId: { type: 'string', description: 'Folder ID or name', required: true },
        name: { type: 'string', description: 'New name' },
        icon: { type: 'string', description: 'New emoji icon' },
        themeColor: { type: 'string', description: 'amber | peach | slate | mint | lavender' },
      },
      permissionLevel: 'WRITE',
    },
    deleteFolder: {
      name: 'deleteFolder',
      description: 'Deletes a folder; its notes are moved to unassigned.',
      parameters: {
        folderId: { type: 'string', description: 'Folder ID or name', required: true },
      },
      permissionLevel: 'DESTRUCTIVE',
    },
  },
  async execute(action, args, userId) {
    const notes = () => db.getNotes(userId);
    const folders = () => db.getNoteFolders(userId);
    const findFolder = (nameOrId?: string) =>
      nameOrId ? resolveByIdOrTitle(folders(), nameOrId, (f) => f.name) : null;

    if (action === 'createNote') {
      if (!args.title) return { success: false, message: 'Note title is required.' };
      const folder = findFolder(args.folderName);
      if (args.folderName && !folder) {
        return { success: false, message: `Folder "${args.folderName}" not found. Create it first.` };
      }
      const now = new Date().toISOString();
      const note: Note = {
        id: `note_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        userId,
        title: String(args.title).trim(),
        content: String(args.content || ''),
        folderId: folder?.id,
        color: NOTE_COLORS.includes(args.color) ? args.color : 'cream',
        category: args.category,
        createdAt: now,
        updatedAt: now,
      };
      db.createNote(note);
      return { success: true, data: note, message: `✓ Note created: "${note.title}"${folder ? ` in ${folder.name}` : ''}.` };
    }

    if (action === 'getNotes') {
      let list = notes();
      if (args.folderName) {
        const folder = findFolder(args.folderName);
        if (!folder) return { success: false, message: `Folder "${args.folderName}" not found.` };
        list = list.filter((n) => n.folderId === folder.id);
      }
      if (args.query) {
        const q = String(args.query).toLowerCase();
        list = list.filter((n) => n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q));
      }
      return {
        success: true,
        data: list.map((n) => ({ id: n.id, title: n.title, folderId: n.folderId, updatedAt: n.updatedAt, preview: n.content.slice(0, 160) })),
        message: list.length ? `Found ${list.length} note(s).` : 'No notes found.',
      };
    }

    if (action === 'getNote') {
      const note = resolveByIdOrTitle(notes(), args.noteId, (n) => n.title);
      if (!note) return { success: false, message: `Note "${args.noteId}" not found.` };
      return { success: true, data: note, message: `Note: "${note.title}"` };
    }

    if (action === 'updateNote') {
      const note = resolveByIdOrTitle(notes(), args.noteId, (n) => n.title);
      if (!note) return { success: false, message: `Note "${args.noteId}" not found.` };

      const patch: Partial<Note> = {};
      if (args.title) patch.title = String(args.title).trim();
      if (typeof args.content === 'string') patch.content = args.content;
      if (args.appendContent) {
        const existing = typeof args.content === 'string' ? args.content : note.content;
        patch.content = `${existing}${existing.endsWith('\n') ? '' : '\n'}${args.appendContent}`;
      }
      if (args.folderName) {
        if (String(args.folderName).toLowerCase() === 'none') {
          patch.folderId = undefined;
        } else {
          const folder = findFolder(args.folderName);
          if (!folder) return { success: false, message: `Folder "${args.folderName}" not found.` };
          patch.folderId = folder.id;
        }
      }
      if (NOTE_COLORS.includes(args.color)) patch.color = args.color;

      const updated = db.updateNote(note.id, userId, patch);
      return { success: !!updated, data: updated, message: updated ? `✓ Note updated: "${updated.title}".` : 'Update failed.' };
    }

    if (action === 'deleteNote') {
      const note = resolveByIdOrTitle(notes(), args.noteId, (n) => n.title);
      if (!note) return { success: false, message: `Note "${args.noteId}" not found.` };
      const ok = db.deleteNote(note.id, userId);
      return { success: ok, message: ok ? `✓ Note deleted: "${note.title}".` : 'Delete failed.' };
    }

    if (action === 'createFolder') {
      if (!args.name) return { success: false, message: 'Folder name is required.' };
      const folder: NoteFolder = {
        id: `folder_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        userId,
        name: String(args.name).trim(),
        icon: args.icon || '📁',
        themeColor: ['amber', 'peach', 'slate', 'mint', 'lavender'].includes(args.themeColor) ? args.themeColor : 'slate',
        createdAt: new Date().toISOString(),
      };
      db.createNoteFolder(folder);
      return { success: true, data: folder, message: `✓ Folder created: "${folder.name}".` };
    }

    if (action === 'getFolders') {
      const list = folders();
      const allNotes = notes();
      return {
        success: true,
        data: list.map((f) => ({ ...f, noteCount: allNotes.filter((n) => n.folderId === f.id).length })),
        message: list.length ? `You have ${list.length} folder(s).` : 'No folders yet.',
      };
    }

    if (action === 'updateFolder') {
      const folder = findFolder(args.folderId);
      if (!folder) return { success: false, message: `Folder "${args.folderId}" not found.` };
      const patch: Partial<NoteFolder> = {};
      if (args.name) patch.name = String(args.name).trim();
      if (args.icon) patch.icon = args.icon;
      if (['amber', 'peach', 'slate', 'mint', 'lavender'].includes(args.themeColor)) patch.themeColor = args.themeColor;
      const updated = db.updateNoteFolder(folder.id, userId, patch);
      return { success: !!updated, data: updated, message: updated ? `✓ Folder updated: "${updated.name}".` : 'Update failed.' };
    }

    if (action === 'deleteFolder') {
      const folder = findFolder(args.folderId);
      if (!folder) return { success: false, message: `Folder "${args.folderId}" not found.` };
      const result = db.deleteNoteFolder(folder.id, userId);
      return {
        success: result.deleted,
        data: result,
        message: result.deleted
          ? `✓ Folder "${folder.name}" deleted. ${result.unassignedNotes} note(s) moved to unassigned.`
          : 'Delete failed.',
      };
    }

    return { success: false, message: `Unknown note action: ${action}` };
  },
};

// ── NOTIFICATION TOOL ────────────────────────────────────────
const NotificationTool: ToolModule = {
  name: 'NotificationTool',
  description: 'Lists, marks read and deletes in-app notifications.',
  actions: {
    getNotifications: {
      name: 'getNotifications',
      description: 'Lists recent notifications.',
      parameters: { unreadOnly: { type: 'boolean', description: 'Only unread items' } },
      permissionLevel: 'READ',
    },
    markNotificationRead: {
      name: 'markNotificationRead',
      description: 'Marks one notification as read.',
      parameters: { notificationId: { type: 'string', description: 'Notification ID', required: true } },
      permissionLevel: 'WRITE',
    },
    markAllNotificationsRead: {
      name: 'markAllNotificationsRead',
      description: 'Marks every notification as read.',
      parameters: {},
      permissionLevel: 'WRITE',
    },
    deleteNotification: {
      name: 'deleteNotification',
      description: 'Deletes a notification.',
      parameters: { notificationId: { type: 'string', description: 'Notification ID', required: true } },
      permissionLevel: 'DESTRUCTIVE',
    },
  },
  async execute(action, args, userId) {
    if (action === 'getNotifications') {
      let list = db.getNotifications(userId);
      if (args.unreadOnly) list = list.filter((n) => !n.read);
      return { success: true, data: list, message: `${list.length} notification(s).` };
    }
    if (action === 'markNotificationRead') {
      const ok = db.markNotificationRead(args.notificationId, userId);
      return { success: ok, message: ok ? '✓ Notification marked read.' : 'Notification not found.' };
    }
    if (action === 'markAllNotificationsRead') {
      const ok = db.markAllNotificationsRead(userId);
      return { success: ok, message: '✓ All notifications marked read.' };
    }
    if (action === 'deleteNotification') {
      const ok = db.deleteNotification(args.notificationId, userId);
      return { success: ok, message: ok ? '✓ Notification deleted.' : 'Notification not found.' };
    }
    return { success: false, message: `Unknown notification action: ${action}` };
  },
};

// ── PREFERENCES / SETTINGS TOOL ──────────────────────────────
const PreferencesTool: ToolModule = {
  name: 'PreferencesTool',
  description: 'Reads and updates the user profile, theme, AI provider, model and feature toggles.',
  actions: {
    getPreferences: {
      name: 'getPreferences',
      description: 'Returns the current profile and preferences (API keys are masked).',
      parameters: {},
      permissionLevel: 'READ',
    },
    updatePreferences: {
      name: 'updatePreferences',
      description: 'Updates theme, provider, model, voice, notifications and alarm settings.',
      parameters: {
        theme: { type: 'string', description: 'light | dark | system' },
        aiProvider: { type: 'string', description: 'groq | gemini | openai | anthropic | ollama | builtin' },
        model: { type: 'string', description: 'Model id' },
        voiceEnabled: { type: 'boolean', description: 'Enable voice dictation' },
        voiceAutoRead: { type: 'boolean', description: 'Read replies aloud' },
        proactiveReminders: { type: 'boolean', description: 'Enable proactive reminders' },
        soundEffects: { type: 'boolean', description: 'Enable UI sounds' },
        confirmDestructiveActions: { type: 'boolean', description: 'Require confirmation for destructive tools' },
        alarmTone: { type: 'string', description: 'digital | chime | zen | radar | gentle | retro | cyber | custom' },
        alarmVolume: { type: 'number', description: '0 to 100' },
        autoExtractMemories: { type: 'boolean', description: 'Auto-save memories from chat' },
      },
      permissionLevel: 'WRITE',
    },
    updateProfile: {
      name: 'updateProfile',
      description: 'Updates the user display name, email or avatar.',
      parameters: {
        name: { type: 'string', description: 'Display name' },
        email: { type: 'string', description: 'Email address' },
        avatar: { type: 'string', description: 'Avatar URL' },
      },
      permissionLevel: 'WRITE',
    },
  },
  async execute(action, args, userId) {
    if (action === 'getPreferences') {
      const user = db.getUserById(userId);
      if (!user) return { success: false, message: 'User not found.' };
      const prefs = { ...user.preferences };
      if (prefs.apiKey) prefs.apiKey = '••••' + prefs.apiKey.slice(-4);
      if (prefs.githubToken) prefs.githubToken = '••••';
      return { success: true, data: { name: user.name, email: user.email, preferences: prefs }, message: 'Loaded your current settings.' };
    }

    if (action === 'updatePreferences') {
      const allowed = [
        'theme', 'aiProvider', 'model', 'voiceEnabled', 'voiceAutoRead', 'proactiveReminders',
        'soundEffects', 'confirmDestructiveActions', 'alarmTone', 'alarmVolume', 'autoExtractMemories',
      ];
      const patch: Record<string, any> = {};
      for (const key of allowed) {
        if (args[key] !== undefined) patch[key] = args[key];
      }
      if (Object.keys(patch).length === 0) {
        return { success: false, message: 'No valid preference fields supplied.' };
      }
      const updated = db.updateUserPreferences(userId, patch);
      return {
        success: !!updated,
        data: { changed: Object.keys(patch) },
        message: updated ? `✓ Settings updated: ${Object.keys(patch).join(', ')}.` : 'Update failed.',
      };
    }

    if (action === 'updateProfile') {
      const patch: Record<string, any> = {};
      if (args.name) patch.name = String(args.name).trim();
      if (args.email) patch.email = String(args.email).trim();
      if (args.avatar) patch.avatar = args.avatar;
      if (Object.keys(patch).length === 0) return { success: false, message: 'Nothing to update.' };
      const updated = db.updateUser(userId, patch as any);
      return { success: !!updated, data: updated, message: updated ? '✓ Profile updated.' : 'Update failed.' };
    }

    return { success: false, message: `Unknown preferences action: ${action}` };
  },
};

// ── CONVERSATION TOOL ────────────────────────────────────────
const ConversationTool: ToolModule = {
  name: 'ConversationTool',
  description: 'Lists, renames and deletes chat conversations and messages.',
  actions: {
    getConversations: {
      name: 'getConversations',
      description: 'Lists conversations with titles and dates.',
      parameters: {},
      permissionLevel: 'READ',
    },
    renameConversation: {
      name: 'renameConversation',
      description: 'Renames a conversation.',
      parameters: {
        conversationId: { type: 'string', description: 'Conversation ID or title', required: true },
        title: { type: 'string', description: 'New title', required: true },
      },
      permissionLevel: 'WRITE',
    },
    deleteConversation: {
      name: 'deleteConversation',
      description: 'Deletes a conversation and its messages.',
      parameters: {
        conversationId: { type: 'string', description: 'Conversation ID or title', required: true },
      },
      permissionLevel: 'DESTRUCTIVE',
    },
  },
  async execute(action, args, userId) {
    if (action === 'getConversations') {
      const list = db.getConversations(userId);
      return { success: true, data: list, message: `${list.length} conversation(s).` };
    }
    const list = db.getConversations(userId);
    const target = resolveByIdOrTitle(list, args.conversationId, (c) => c.title);
    if (!target) return { success: false, message: `Conversation "${args.conversationId}" not found.` };

    if (action === 'renameConversation') {
      const updated = db.updateConversation(target.id, userId, { title: String(args.title).trim() });
      return { success: !!updated, data: updated, message: updated ? `✓ Renamed to "${updated.title}".` : 'Rename failed.' };
    }
    if (action === 'deleteConversation') {
      const ok = db.deleteConversation(target.id, userId);
      return { success: ok, message: ok ? `✓ Conversation "${target.title}" deleted.` : 'Delete failed.' };
    }
    return { success: false, message: `Unknown conversation action: ${action}` };
  },
};

// ── PROJECT TOOL (project context derived from tasks) ────────
const ProjectTool: ToolModule = {
  name: 'ProjectTool',
  description: 'Reads project context and task groupings, and moves tasks between projects.',
  actions: {
    getProjects: {
      name: 'getProjects',
      description: 'Lists all projects derived from task groupings with open/closed counts.',
      parameters: {},
      permissionLevel: 'READ',
    },
    getProjectDetails: {
      name: 'getProjectDetails',
      description: 'Returns every task belonging to a project with progress.',
      parameters: {
        projectName: { type: 'string', description: 'Project ID or name', required: true },
      },
      permissionLevel: 'READ',
    },
    assignTaskToProject: {
      name: 'assignTaskToProject',
      description: 'Moves a task into a project (creates the grouping if needed).',
      parameters: {
        taskId: { type: 'string', description: 'Task ID or title', required: true },
        projectName: { type: 'string', description: 'Project name', required: true },
      },
      permissionLevel: 'WRITE',
    },
  },
  async execute(action, args, userId) {
    const tasks = db.getTasks(userId);
    const grouped = new Map<string, typeof tasks>();
    tasks.forEach((t) => {
      const key = t.projectId || 'Unassigned';
      grouped.set(key, [...(grouped.get(key) || []), t]);
    });

    if (action === 'getProjects') {
      const projects = Array.from(grouped.entries()).map(([name, list]) => ({
        name,
        total: list.length,
        completed: list.filter((t) => t.status === 'completed').length,
        open: list.filter((t) => t.status !== 'completed').length,
      }));
      return { success: true, data: projects, message: `${projects.length} project grouping(s).` };
    }

    if (action === 'getProjectDetails') {
      const q = String(args.projectName || '').toLowerCase();
      const entry = Array.from(grouped.entries()).find(([name]) => name.toLowerCase() === q)
        || Array.from(grouped.entries()).find(([name]) => name.toLowerCase().includes(q));
      if (!entry) return { success: false, message: `Project "${args.projectName}" not found.` };
      const [name, list] = entry;
      const completed = list.filter((t) => t.status === 'completed').length;
      return {
        success: true,
        data: { name, tasks: list, completed, total: list.length, progress: list.length ? Math.round((completed / list.length) * 100) : 0 },
        message: `Project "${name}": ${completed}/${list.length} tasks completed.`,
      };
    }

    if (action === 'assignTaskToProject') {
      const task = resolveByIdOrTitle(tasks, args.taskId, (t) => t.title);
      if (!task) return { success: false, message: `Task "${args.taskId}" not found.` };
      const updated = db.updateTask(task.id, userId, { projectId: String(args.projectName).trim() });
      return {
        success: !!updated,
        data: updated,
        message: updated ? `✓ "${task.title}" moved to project "${args.projectName}".` : 'Update failed.',
      };
    }

    return { success: false, message: `Unknown project action: ${action}` };
  },
};

export const crudTools: Record<string, ToolModule> = {
  HabitTool,
  NoteTool,
  NotificationTool,
  PreferencesTool,
  ConversationTool,
  ProjectTool,
};
