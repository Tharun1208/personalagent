import { toolRegistry } from '@/lib/tools';
import { db, getStorageStatus } from '@/lib/db';
import type { ToolExecutionStep } from '@/types';

/**
 * Deterministic CRUD intent router.
 *
 * The orchestrator does not use LLM function-calling, so every capability the
 * agent exposes must have an explicit phrase pattern. This module covers
 * create/read/update/delete for the entities that used to be missing or
 * read-only: notes & note folders, habits, goals, reminders, tasks/subtasks,
 * ledger, preferences, notifications, conversations and projects.
 */

export interface CrudIntentResult {
  reply: string;
  toolSteps: ToolExecutionStep[];
  requiresConfirmation?: boolean;
  confirmationPayload?: any;
}

interface RunOutcome {
  success: boolean;
  message: string;
  data?: any;
}

async function run(
  toolName: string,
  action: string,
  args: Record<string, any>,
  userId: string,
  steps: ToolExecutionStep[],
): Promise<RunOutcome | null> {
  const tool = toolRegistry[toolName];
  if (!tool) {
    steps.push({
      toolName,
      action,
      input: args,
      status: 'failed',
      output: { success: false, message: `Tool ${toolName} is not registered.` },
    });
    return null;
  }

  const startedAt = Date.now();
  steps.push({ toolName, action, input: args, status: 'executing' });
  try {
    const result = await tool.execute(action, args, userId);
    steps[steps.length - 1] = {
      toolName,
      action,
      input: args,
      output: { success: result.success, message: result.message },
      status: result.success ? 'success' : 'failed',
      executionTimeMs: Date.now() - startedAt,
      confirmationMessage: result.requiresConfirmation ? result.message : undefined,
    };
    return result;
  } catch (err: any) {
    steps[steps.length - 1] = {
      toolName,
      action,
      input: args,
      status: 'failed',
      output: { success: false, message: err?.message || 'Tool execution failed.' },
      executionTimeMs: Date.now() - startedAt,
    };
    return { success: false, message: `⚠ ${toolName} failed: ${err?.message || 'unknown error'}` };
  }
}

function quoted(text: string): string | null {
  const match = text.match(/["“”'‘’]([^"“”'‘’]{1,160})["“”'‘’]/);
  return match ? match[1].trim() : null;
}

function stripFiller(value: string): string {
  return value
    .replace(/^(?:the|my|a|an|this|that|from|in|into|to|for|of|called|named|titled)\s+/i, '')
    .replace(/[.!?]+$/g, '')
    .trim();
}

function grab(text: string, pattern: RegExp): string | null {
  const match = text.match(pattern);
  if (!match || !match[1]) return null;
  const value = stripFiller(match[1]);
  return value.length > 0 ? value : null;
}

/** Minimal natural-language date parser for reschedule/update commands. */
function parseWhen(text: string): string | null {
  const iso = text.match(/\b(\d{4}-\d{2}-\d{2}(?:[T ]\d{2}:\d{2})?)\b/);
  if (iso) {
    const date = new Date(iso[1].replace(' ', 'T'));
    if (!isNaN(date.getTime())) return date.toISOString();
  }

  const relative = text.match(/\bin\s+(\d{1,3})\s*(minutes?|mins?|hours?|hrs?|days?)\b/i);
  if (relative) {
    const amount = parseInt(relative[1], 10);
    const unit = relative[2].toLowerCase();
    const ms = unit.startsWith('min')
      ? amount * 60_000
      : unit.startsWith('hour') || unit.startsWith('hr')
        ? amount * 3_600_000
        : amount * 86_400_000;
    return new Date(Date.now() + ms).toISOString();
  }

  const dayMatch = text.match(/\b(today|tomorrow|tonight)\b/i);
  const timeMatch = text.match(/\b(?:at|by)\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/i);
  if (dayMatch || timeMatch) {
    const date = new Date();
    if (dayMatch) {
      const day = dayMatch[1].toLowerCase();
      if (day === 'tomorrow') date.setDate(date.getDate() + 1);
      if (day === 'tonight') date.setHours(20, 0, 0, 0);
    }
    if (timeMatch) {
      let hours = parseInt(timeMatch[1], 10);
      const minutes = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
      const meridiem = timeMatch[3]?.toLowerCase();
      if (meridiem === 'pm' && hours < 12) hours += 12;
      if (meridiem === 'am' && hours === 12) hours = 0;
      date.setHours(hours, minutes, 0, 0);
    } else {
      date.setHours(9, 0, 0, 0);
    }
    return date.toISOString();
  }

  return null;
}

const CREATE_VERB = /\b(?:create|add|new|make|save|write|start|track|log|record)\b/i;
const UPDATE_VERB = /\b(?:update|edit|change|rename|retitle|modify|set|move|reschedule|append|add\s+to|mark)\b/i;
const DELETE_VERB = /\b(?:delete|remove|trash|erase|drop)\b/i;
const LIST_VERB = /\b(?:show|list|view|get|read|open|see|display|what|which)\b/i;

export async function handleCrudIntent({
  userPrompt,
  userId,
  conversationId,
}: {
  userPrompt: string;
  userId: string;
  conversationId?: string | null;
}): Promise<CrudIntentResult | null> {
  const text = userPrompt.trim();
  const lower = text.toLowerCase();
  const steps: ToolExecutionStep[] = [];

  // Never hijack explanatory/how-to questions. Keep "how much / how many / how is my ..." data queries.
  if (/^why\b/.test(lower)) return null;
  if (/^how\b/.test(lower) && !/^how\s+(?:much|many|is|are|was|were|long|far|often)\b/.test(lower)) return null;

  // ── NOTES ───────────────────────────────────────────────────
  if (/\bnotes?\b/.test(lower) || /\bfolders?\b/.test(lower)) {
    const isFolder = /\bfolders?\b/.test(lower);

    // Move note into folder
    const moveMatch = text.match(/\bmove\s+(?:the\s+|my\s+)?note\s+(.+?)\s+(?:in)?to\s+(?:the\s+|my\s+)?folder\s+(.+)$/i);
    if (moveMatch) {
      const res = await run('NoteTool', 'updateNote', { noteId: stripFiller(moveMatch[1]), folderName: stripFiller(moveMatch[2]) }, userId, steps);
      if (res) return { reply: res.message, toolSteps: steps };
    }

    if (isFolder) {
      if (CREATE_VERB.test(lower)) {
        const name =
          grab(text, /(?:create|add|make|new)\s+(?:a\s+|an\s+|new\s+)?folder(?:\s+(?:called|named))?\s+(.+)$/i) ||
          quoted(text);
        if (name) {
          const res = await run('NoteTool', 'createFolder', { name }, userId, steps);
          if (res) return { reply: res.message, toolSteps: steps };
        }
      }

      if (DELETE_VERB.test(lower)) {
        const name =
          grab(text, /(?:delete|remove|trash|drop)\s+(?:the\s+|my\s+)?folder(?:\s+(?:called|named))?\s+(.+)$/i) ||
          quoted(text);
        if (name) {
          const res = await run('NoteTool', 'deleteFolder', { folderId: name }, userId, steps);
          if (res) return { reply: res.message, toolSteps: steps };
        }
      }

      if (LIST_VERB.test(lower)) {
        const res = await run('NoteTool', 'getFolders', {}, userId, steps);
        if (res?.data?.length) {
          const rows = res.data.map((f: any) => `• **${f.icon || '📁'} ${f.name}** — ${f.noteCount} note(s)`).join('\n');
          return { reply: `### Your note folders\n\n${rows}`, toolSteps: steps };
        }
      }
    }

    if (CREATE_VERB.test(lower) && /\bnotes?\b/.test(lower) && !/\b(add|append)\s+to\b/.test(lower)) {
      const noteThat = text.match(/\bnote\s+that\s+(.+)$/i);
      const titleMatch =
        grab(text, /(?:create|add|write|save|make|new)\s+(?:a\s+|an\s+|new\s+)?note(?:\s+(?:called|titled|named))?\s+(.+)$/i) ||
        quoted(text);
      const title = noteThat ? noteThat[1].slice(0, 60).trim() : titleMatch;
      if (title) {
        const content = noteThat ? noteThat[1].trim() : '';
        const folderName = grab(text, /\bin\s+(?:the\s+|my\s+)?(?:folder\s+)?(.+?)\s+folder\b/i) || undefined;
        const res = await run('NoteTool', 'createNote', { title, content, folderName }, userId, steps);
        if (res) return { reply: res.message, toolSteps: steps };
      }
    }

    if (UPDATE_VERB.test(lower) && /\bnotes?\b/.test(lower)) {
      const renameMatch = text.match(/\b(?:rename|retitle)\s+(?:the\s+|my\s+)?note\s+(.+?)\s+to\s+(.+)$/i);
      if (renameMatch) {
        const res = await run('NoteTool', 'updateNote', { noteId: stripFiller(renameMatch[1]), title: stripFiller(renameMatch[2]) }, userId, steps);
        if (res) return { reply: res.message, toolSteps: steps };
      }

      const appendMatch = text.match(/\b(?:append|add)\s+(.+?)\s+to\s+(?:the\s+|my\s+)?note\s+(.+)$/i);
      if (appendMatch) {
        const res = await run('NoteTool', 'updateNote', { noteId: stripFiller(appendMatch[2]), appendContent: appendMatch[1].trim() }, userId, steps);
        if (res) return { reply: res.message, toolSteps: steps };
      }

      const editMatch = text.match(/\b(?:update|edit|change)\s+(?:the\s+|my\s+)?note\s+(.+?)(?:\s+(?:to|with|content)\s+(.+))?$/i);
      if (editMatch) {
        const args: Record<string, any> = { noteId: stripFiller(editMatch[1]) };
        if (editMatch[2]) args.content = editMatch[2].trim();
        const res = await run('NoteTool', 'updateNote', args, userId, steps);
        if (res) return { reply: res.message, toolSteps: steps };
      }
    }

    if (DELETE_VERB.test(lower) && /\bnotes?\b/.test(lower)) {
      const name =
        grab(text, /(?:delete|remove|trash|erase)\s+(?:the\s+|my\s+)?note(?:\s+(?:called|named|titled))?\s+(.+)$/i) ||
        quoted(text);
      if (name) {
        const res = await run('NoteTool', 'deleteNote', { noteId: name }, userId, steps);
        if (res) return { reply: res.message, toolSteps: steps };
      }
    }

    if (LIST_VERB.test(lower)) {
      const folderName = grab(text, /\b(?:in|from)\s+(?:the\s+|my\s+)?folder\s+(.+)$/i) || undefined;
      const query = grab(text, /\b(?:about|containing|matching|search)\s+(.+)$/i) || undefined;
      const res = await run('NoteTool', 'getNotes', { folderName, query }, userId, steps);
      if (res?.data?.length) {
        const rows = res.data
          .slice(0, 20)
          .map((n: any) => `• **${n.title}** — ${n.preview?.slice(0, 90) || 'empty'}`)
          .join('\n');
        return { reply: `### Notes\n\n${rows}`, toolSteps: steps };
      }
      if (res) return { reply: res.message, toolSteps: steps };
    }
  }

  // ── HABITS ──────────────────────────────────────────────────
  if (/\bhabits?\b/.test(lower)) {
    const toggleMatch = text.match(/\b(?:mark|complete|finish|check\s*off|done\s+with)\s+(?:the\s+|my\s+)?habit\s+(.+?)(?:\s+(?:as\s+)?(?:done|complete))?$/i);
    if (toggleMatch) {
      const res = await run('HabitTool', 'toggleHabit', { habitId: stripFiller(toggleMatch[1]) }, userId, steps);
      if (res) return { reply: res.message, toolSteps: steps };
    }

    if (CREATE_VERB.test(lower)) {
      const title =
        grab(text, /(?:create|add|start|track|new)\s+(?:a\s+|an\s+|new\s+)?habit(?:\s+(?:called|named))?\s+(.+)$/i) ||
        quoted(text);
      if (title) {
        const frequency = /\bweekly\b/i.test(lower) ? 'weekly' : 'daily';
        const res = await run('HabitTool', 'createHabit', { title, frequency }, userId, steps);
        if (res) return { reply: res.message, toolSteps: steps };
      }
    }

    if (UPDATE_VERB.test(lower)) {
      const renameMatch = text.match(/\b(?:rename|retitle)\s+(?:the\s+|my\s+)?habit\s+(.+?)\s+to\s+(.+)$/i);
      if (renameMatch) {
        const res = await run('HabitTool', 'updateHabit', { habitId: stripFiller(renameMatch[1]), title: stripFiller(renameMatch[2]) }, userId, steps);
        if (res) return { reply: res.message, toolSteps: steps };
      }
    }

    if (DELETE_VERB.test(lower)) {
      const name =
        grab(text, /(?:delete|remove|drop)\s+(?:the\s+|my\s+)?habit(?:\s+(?:called|named))?\s+(.+)$/i) ||
        quoted(text);
      if (name) {
        const res = await run('HabitTool', 'deleteHabit', { habitId: name }, userId, steps);
        if (res) return { reply: res.message, toolSteps: steps };
      }
    }

    if (LIST_VERB.test(lower)) {
      const res = await run('HabitTool', 'getHabits', {}, userId, steps);
      if (res?.data?.length) {
        const rows = res.data
          .map((h: any) => `• **${h.title}** — ${h.streak || 0} day streak (${h.frequency || 'daily'})`)
          .join('\n');
        return { reply: `### Your habits\n\n${rows}`, toolSteps: steps };
      }
      if (res) return { reply: res.message, toolSteps: steps };
    }
  }

  // ── GOALS ───────────────────────────────────────────────────
  if (/\b(goal|goals|okr|okrs|milestone|milestones)\b/.test(lower)) {
    const milestoneAdd = text.match(/\badd\s+(?:a\s+)?milestone\s+(.+?)\s+to\s+(?:the\s+|my\s+)?goal\s+(.+)$/i);
    if (milestoneAdd) {
      const res = await run('GoalTool', 'addMilestone', { goalTitle: stripFiller(milestoneAdd[2]), title: stripFiller(milestoneAdd[1]) }, userId, steps);
      if (res) return { reply: res.message, toolSteps: steps };
    }

    const milestoneToggle = text.match(/\b(?:mark|complete|finish|check\s*off)\s+(?:the\s+)?milestone\s+(.+?)\s+(?:as\s+)?(?:done|complete|in)?\s*(?:for|of|in)\s+(?:the\s+|my\s+)?goal\s+(.+)$/i);
    if (milestoneToggle) {
      const res = await run('GoalTool', 'toggleMilestone', { goalTitle: stripFiller(milestoneToggle[2]), milestone: stripFiller(milestoneToggle[1]) }, userId, steps);
      if (res) return { reply: res.message, toolSteps: steps };
    }

    if (DELETE_VERB.test(lower)) {
      const name =
        grab(text, /(?:delete|remove|drop|trash)\s+(?:the\s+|my\s+)?goal(?:\s+(?:called|named))?\s+(.+)$/i) ||
        quoted(text);
      if (name) {
        const res = await run('GoalTool', 'deleteGoal', { goalTitle: name }, userId, steps);
        if (res) return { reply: res.message, toolSteps: steps };
      }
    }

    if (UPDATE_VERB.test(lower)) {
      const progress = text.match(/\bprogress\s+(?:to|is|at)?\s*(\d{1,3})\s*%/i) || text.match(/\b(\d{1,3})\s*%\s*(?:done|complete|progress)?/i);
      const renameMatch = text.match(/\b(?:rename|retitle)\s+(?:the\s+|my\s+)?goal\s+(.+?)\s+to\s+(.+)$/i);
      const args: Record<string, any> = {};
      if (renameMatch) {
        args.goalTitle = stripFiller(renameMatch[1]);
        args.title = stripFiller(renameMatch[2]);
      } else {
        args.goalTitle =
          grab(text, /(?:update|edit|change|set)\s+(?:the\s+|my\s+)?goal\s+(.+?)\s+(?:progress|status|to|as)/i) ||
          quoted(text);
      }
      if (progress) args.progress = Math.min(100, parseInt(progress[1], 10));
      if (/\bcompleted|complete\b/.test(lower) && !renameMatch) args.status = 'completed';
      if (args.goalTitle) {
        const res = await run('GoalTool', 'updateGoal', args, userId, steps);
        if (res) return { reply: res.message, toolSteps: steps };
      }
    }

    if (LIST_VERB.test(lower)) {
      const projectName = grab(text, /\bgoal\s+(.+)$/i);
      const res = projectName
        ? await run('GoalTool', 'getGoalDetails', { goalTitle: projectName }, userId, steps)
        : await run('GoalTool', 'getGoals', {}, userId, steps);
      if (res?.data?.length) {
        const rows = res.data.map((g: any) => `• **${g.title}** — ${g.progress || 0}% (${g.status || 'active'})`).join('\n');
        return { reply: `### Goals\n\n${rows}`, toolSteps: steps };
      }
      if (res) return { reply: res.message, toolSteps: steps };
    }
  }

  // ── REMINDERS ───────────────────────────────────────────────
  if (/\breminders?\b/.test(lower) && !CREATE_VERB.test(lower)) {
    if (DELETE_VERB.test(lower)) {
      const name =
        grab(text, /(?:delete|remove|cancel|drop)\s+(?:the\s+|my\s+)?reminder(?:\s+(?:called|named))?\s+(.+)$/i) ||
        quoted(text);
      if (name) {
        const res = await run('ReminderTool', 'deleteReminder', { reminderId: name }, userId, steps);
        if (res) return { reply: res.message, toolSteps: steps };
      }
    }

    if (UPDATE_VERB.test(lower)) {
      const target =
        grab(text, /(?:reschedule|move|update|change|rename)\s+(?:the\s+|my\s+)?reminder\s+(.+?)\s+(?:to|for)\b/i) ||
        quoted(text);
      if (target) {
        const when = parseWhen(text);
        const args: Record<string, any> = { reminderId: target };
        if (when) args.dueDateTime = when;
        const rename = text.match(/\brename\s+(?:the\s+|my\s+)?reminder\s+.+?\s+to\s+(.+)$/i);
        if (rename) args.title = stripFiller(rename[1]);
        if (when || args.title) {
          const res = await run('ReminderTool', 'updateReminder', args, userId, steps);
          if (res) return { reply: res.message, toolSteps: steps };
        }
      }
    }

    if (LIST_VERB.test(lower)) {
      const res = await run('ReminderTool', 'getReminders', {}, userId, steps);
      if (res?.data?.length) {
        const tz =
          (db.getUserById(userId)?.preferences as any)?.timezone || 'Asia/Kolkata';
        const keyOf = (value?: string) => {
          const date = new Date(value as string);
          return Number.isNaN(date.getTime())
            ? ''
            : new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(date);
        };

        let reminders: any[] = res.data.filter((r: any) => r.status !== 'dismissed');
        const scoped = /\b(?:today|tomorrow|this week|next week)\b/i.test(lower);
        if (scoped) {
          const now = new Date();
          const todayKey = new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(now);
          const tomorrowKey = new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(
            new Date(now.getTime() + 86_400_000),
          );
          const weekEndKey = new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(
            new Date(now.getTime() + 7 * 86_400_000),
          );
          const wantsTomorrow = /\btomorrow\b/i.test(lower);
          const wantsToday = /\btoday\b/i.test(lower) && !wantsTomorrow;
          reminders = reminders.filter((r: any) => {
            const key = keyOf(r.dueDateTime);
            if (!key) return false;
            if (wantsTomorrow) return key === tomorrowKey;
            if (wantsToday) return key === todayKey;
            return key >= todayKey && key <= weekEndKey;
          });
        }

        reminders.sort(
          (a: any, b: any) =>
            new Date(a.dueDateTime).getTime() - new Date(b.dueDateTime).getTime(),
        );

        const rows = reminders
          .slice(0, 20)
          .map(
            (r: any) =>
              `• **${r.title}** — ${new Date(r.dueDateTime).toLocaleString([], {
                timeZone: tz,
                dateStyle: 'medium',
                timeStyle: 'short',
              })}`,
          )
          .join('\n');

        if (!rows) {
          return {
            reply: `### Reminders\n\nNo reminders scheduled for that period.${
              getStorageStatus().degraded
                ? '\n\n> ⚠️ **Storage is offline.** Saved reminders could not be loaded.'
                : ''
            }`,
            toolSteps: steps,
          };
        }
        return { reply: `### Reminders\n\n${rows}`, toolSteps: steps };
      }
      if (res) {
        const storage = getStorageStatus();
        const warning = storage.degraded
          ? `\n\n> ⚠️ **Storage is offline.** I could not load your saved reminders, so this is not proof that none exist. Fix the database connection (\`MONGODB_URI\`) and try again.`
          : '';
        return { reply: `${res.message}${warning}`, toolSteps: steps };
      }
    }
  }

  // ── TASKS / SUBTASKS ────────────────────────────────────────
  if (/\b(task|tasks|subtask|subtasks|checklist)\b/.test(lower)) {
    const subtaskAdd = text.match(/\badd\s+(?:a\s+)?subtask\s+(.+?)\s+to\s+(?:the\s+)?task\s+(.+)$/i);
    if (subtaskAdd) {
      const res = await run('TaskTool', 'createSubtask', { taskId: stripFiller(subtaskAdd[2]), title: stripFiller(subtaskAdd[1]) }, userId, steps);
      if (res) return { reply: res.message, toolSteps: steps };
    }

    const subtaskDone = text.match(/\b(?:mark|complete|finish|check\s*off)\s+(?:the\s+)?subtask\s+(.+?)\s+(?:as\s+)?(?:done|complete|in)?\s*(?:for|of|in)\s+(?:the\s+)?task\s+(.+)$/i);
    if (subtaskDone) {
      const res = await run('TaskTool', 'toggleSubtask', { taskId: stripFiller(subtaskDone[2]), subtask: stripFiller(subtaskDone[1]) }, userId, steps);
      if (res) return { reply: res.message, toolSteps: steps };
    }

    const subtaskDelete = text.match(/\b(?:delete|remove)\s+(?:the\s+)?subtask\s+(.+?)\s+(?:from|in)\s+(?:the\s+)?task\s+(.+)$/i);
    if (subtaskDelete) {
      const res = await run('TaskTool', 'deleteSubtask', { taskId: stripFiller(subtaskDelete[2]), subtask: stripFiller(subtaskDelete[1]) }, userId, steps);
      if (res) return { reply: res.message, toolSteps: steps };
    }

    if (DELETE_VERB.test(lower)) {
      const name =
        grab(text, /(?:delete|remove|drop|trash)\s+(?:the\s+|my\s+)?task(?:\s+(?:called|named))?\s+(.+)$/i) ||
        quoted(text);
      if (name) {
        const res = await run('TaskTool', 'deleteTask', { taskId: name }, userId, steps);
        if (res) return { reply: res.message, toolSteps: steps };
      }
    }

    if (UPDATE_VERB.test(lower)) {
      const renameMatch = text.match(/\b(?:rename|retitle)\s+(?:the\s+|my\s+)?task\s+(.+?)\s+to\s+(.+)$/i);
      const priorityMatch = text.match(/\b(?:set|change|update)\s+(?:the\s+)?task\s+(.+?)\s+priority\s+(?:to\s+)?(low|medium|high|urgent)\b/i);
      const dueMatch = text.match(/\b(?:set|change|update|move)\s+(?:the\s+)?task\s+(.+?)\s+(?:due|deadline)\s+(?:to|for|on)\s+(.+)$/i);
      let args: Record<string, any> | null = null;
      if (renameMatch) args = { taskId: stripFiller(renameMatch[1]), patch: { title: stripFiller(renameMatch[2]) } };
      else if (priorityMatch) args = { taskId: stripFiller(priorityMatch[1]), patch: { priority: priorityMatch[2].toLowerCase() } };
      else if (dueMatch) {
        const when = parseWhen(dueMatch[2]);
        args = { taskId: stripFiller(dueMatch[1]), patch: { dueDate: when || dueMatch[2].trim() } };
      }
      if (args) {
        const res = await run('TaskTool', 'updateTask', args, userId, steps);
        if (res) return { reply: res.message, toolSteps: steps };
      }
    }
  }

  // ── DAILY SPENDING ─────────────────────────────────────────
  const EXPENSE_WORD = /\b(?:expenses?|spending|spend|spent|purchase[ds]?|bought)\b/i;
  const DEBT_WORD = /\b(?:owe|owed|debt|ledger|borrow|borrowed|lend|lent|receivable|payable)\b/i;
  if (EXPENSE_WORD.test(lower) && !DEBT_WORD.test(lower)) {
    const wantsList = /\b(?:show|list|view|what|which|how\s+much|total)\b/i.test(lower);
    const wantsCreate = CREATE_VERB.test(lower) || /\b(?:spent|paid|bought)\b/i.test(lower);

    if (wantsList && !wantsCreate) {
      const date = /\byesterday\b/i.test(lower)
        ? new Date(Date.now() - 86_400_000).toISOString().slice(0, 10)
        : /\btoday\b/i.test(lower)
          ? new Date().toISOString().slice(0, 10)
          : undefined;
      const res = await run('SpendingTool', 'getExpenses', date ? { date } : {}, userId, steps);
      if (res) {
        const storage = getStorageStatus();
        const warning = storage.degraded
          ? `\n\n> ⚠️ **Storage is offline.** I could not load your saved expenses, so this is not proof that none exist. Fix the database connection (\`MONGODB_URI\`) and try again.`
          : '';
        return { reply: `${res.message}${warning}`, toolSteps: steps };
      }
    }

    if (wantsCreate) {
      const amountMatch =
        text.match(/(?:₹|rs\.?|inr|\$|€|£)\s*(\d+(?:[.,]\d{1,2})?)/i) ||
        text.match(/\b(?:expense|spent|spend|paid|purchase|bought|of|for)\s*(?:of\s*)?(?:₹|rs\.?|inr|\$|€|£)?\s*(\d+(?:[.,]\d{1,2})?)/i) ||
        text.match(/\b(\d+(?:[.,]\d{1,2})?)\s*(?:rupees?|rs\.?|inr|dollars?|usd)\b/i);
      if (amountMatch) {
        const amount = parseFloat(amountMatch[1].replace(',', '.'));
        const noteMatch = text.match(/(?:for|on)\s+(.+?)(?:\s+(?:today|yesterday|tomorrow|at\s+\d.*))?[.!?]*$/i);
        const note = noteMatch ? stripFiller(noteMatch[1]) : undefined;
        const haystack = `${note || ''} ${text}`.toLowerCase();
        const category =
          /\b(?:lunch|dinner|breakfast|food|restaurant|meal|snack)\b/.test(haystack) ? 'food' :
          /\b(?:coffee|tea|cafe|starbucks)\b/.test(haystack) ? 'coffee' :
          /\b(?:cab|uber|ola|auto|bus|train|metro|fuel|petrol|transport|travel)\b/.test(haystack) ? 'transport' :
          /\b(?:shopping|clothes|amazon|flipkart|shoes)\b/.test(haystack) ? 'shopping' :
          /\b(?:groceries|grocery|supermarket|vegetables)\b/.test(haystack) ? 'groceries' :
          /\b(?:bill|electricity|water|gas|recharge)\b/.test(haystack) ? 'bills' :
          /\b(?:rent|housing|maintenance)\b/.test(haystack) ? 'rent' :
          /\b(?:health|medicine|doctor|pharmacy|hospital|gym)\b/.test(haystack) ? 'health' :
          /\b(?:phone|internet|wifi|mobile)\b/.test(haystack) ? 'phone' :
          'other';
        const date = /\byesterday\b/i.test(lower)
          ? new Date(Date.now() - 86_400_000).toISOString().slice(0, 10)
          : /\btomorrow\b/i.test(lower)
            ? new Date(Date.now() + 86_400_000).toISOString().slice(0, 10)
            : new Date().toISOString().slice(0, 10);

        const res = await run('SpendingTool', 'addExpense', { amount, note, category, date }, userId, steps);
        if (res) return { reply: res.message, toolSteps: steps };
      }
    }
  }

  // ── LEDGER ──────────────────────────────────────────────────
  if (/\b(ledger|owe|owed|debt|debtor|receivable|payable)\b/.test(lower) && UPDATE_VERB.test(lower)) {
    const person = quoted(text) || grab(text, /(?:for|to|from)\s+([A-Za-z][\w\s.'-]{1,40}?)\s+(?:to|is|amount|as)\b/i);
    const amountMatch = text.match(/(?:to|amount(?:\s+is)?|as)\s*([₹$€£]?\s?\d+(?:[.,]\d{1,2})?)/i);
    if (person && amountMatch) {
      const amount = parseFloat(amountMatch[1].replace(/[^\d.]/g, ''));
      const res = await run('LedgerTool', 'updateLedgerEntry', { id: person, amount }, userId, steps);
      if (res) return { reply: res.message, toolSteps: steps };
    }
  }

  // ── PREFERENCES / PROFILE ───────────────────────────────────
  if (/\b(theme|dark mode|light mode|provider|model|voice|settings|preferences|profile)\b/.test(lower)) {
    const prefs: Record<string, any> = {};
    if (/\b(?:dark|light|system)\s*(?:mode|theme)?\b/.test(lower) && /\b(?:set|switch|change|use|enable|turn)\b/.test(lower)) {
      const theme = lower.match(/\b(dark|light|system)\b/)?.[1];
      if (theme) prefs.theme = theme;
    }
    const provider = lower.match(/\b(?:provider|use)\s+(?:to\s+)?(groq|gemini|openai|anthropic|ollama|builtin)\b/);
    if (provider) prefs.aiProvider = provider[1];
    const model = text.match(/\bmodel\s+(?:to|as)\s+([\w./:-]+)/i);
    if (model) prefs.model = model[1];
    if (/\bvoice\b/.test(lower)) {
      if (/\b(?:turn|switch)\s+(?:on|enable)\b|\benable\b/.test(lower)) prefs.voiceEnabled = true;
      if (/\b(?:turn|switch)\s+(?:off|disable)\b|\bdisable\b/.test(lower)) prefs.voiceEnabled = false;
    }
    if (/\b(?:sound effects|sounds)\b/.test(lower)) {
      if (/\b(?:turn|switch)\s+(?:on|enable)\b|\benable\b/.test(lower)) prefs.soundEffects = true;
      if (/\b(?:turn|switch)\s+(?:off|disable)\b|\bdisable\b/.test(lower)) prefs.soundEffects = false;
    }
    if (Object.keys(prefs).length > 0) {
      const res = await run('PreferencesTool', 'updatePreferences', prefs, userId, steps);
      if (res) return { reply: res.message, toolSteps: steps };
    }

    const nameMatch = text.match(/\b(?:rename me|change my name|call me|set my name)\s+(?:to\s+)?(.+)$/i);
    if (nameMatch) {
      const res = await run('PreferencesTool', 'updateProfile', { name: stripFiller(nameMatch[1]) }, userId, steps);
      if (res) return { reply: res.message, toolSteps: steps };
    }
  }

  // ── NOTIFICATIONS ───────────────────────────────────────────
  if (/\bnotifications?\b/.test(lower)) {
    if (/\b(?:mark|set)\b.*\b(?:all|everything)\b.*\bread\b/i.test(text) || /\bclear\s+(?:all\s+)?unread\b/i.test(text)) {
      const res = await run('NotificationTool', 'markAllNotificationsRead', {}, userId, steps);
      if (res) return { reply: res.message, toolSteps: steps };
    }
    if (/\b(?:delete|remove|clear)\b/.test(lower)) {
      const id = quoted(text) || grab(text, /notification\s+(.+)$/i);
      if (id) {
        const res = await run('NotificationTool', 'deleteNotification', { notificationId: id }, userId, steps);
        if (res) return { reply: res.message, toolSteps: steps };
      }
    }
    if (LIST_VERB.test(lower)) {
      const res = await run('NotificationTool', 'getNotifications', {}, userId, steps);
      if (res?.data?.length) {
        const rows = res.data.slice(0, 15).map((n: any) => `• ${n.read ? '✓' : '●'} **${n.title}** — ${n.message}`).join('\n');
        return { reply: `### Notifications\n\n${rows}`, toolSteps: steps };
      }
      if (res) return { reply: res.message, toolSteps: steps };
    }
  }

  // ── CONVERSATIONS ───────────────────────────────────────────
  if (/\b(chat|conversation)\b/.test(lower) && conversationId) {
    const rename = text.match(/\brename\s+(?:this\s+|the\s+|current\s+)?(?:chat|conversation)\s+to\s+(.+)$/i);
    if (rename) {
      const res = await run('ConversationTool', 'renameConversation', { conversationId, title: stripFiller(rename[1]) }, userId, steps);
      if (res) return { reply: res.message, toolSteps: steps };
    }
    const del = text.match(/\bdelete\s+(?:this\s+|the\s+|current\s+)?(?:chat|conversation)\b/i);
    if (del) {
      const res = await run('ConversationTool', 'deleteConversation', { conversationId }, userId, steps);
      if (res) return { reply: res.message, toolSteps: steps };
    }
  }

  // ── PROJECTS ────────────────────────────────────────────────
  if (/\bprojects?\b/.test(lower)) {
    const detail = text.match(/\b(?:in|for|details?\s+(?:of|for)|show|status\s+of)\s+(?:the\s+|my\s+)?project\s+(.+)$/i)
      || text.match(/\bproject\s+(.+?)\s+(?:status|details|progress)\b/i);
    if (detail) {
      const res = await run('ProjectTool', 'getProjectDetails', { projectName: stripFiller(detail[1]) }, userId, steps);
      if (res?.data) {
        const d = res.data;
        const rows = (d.tasks || [])
          .map((t: any) => `• ${t.status === 'completed' ? '✓' : '○'} **${t.title}**`)
          .join('\n');
        return {
          reply: `### ${d.name}\n\n**Progress:** ${d.progress}% (${d.completed}/${d.total} tasks)\n\n${rows}`,
          toolSteps: steps,
        };
      }
      if (res) return { reply: res.message, toolSteps: steps };
    }
    if (LIST_VERB.test(lower)) {
      const res = await run('ProjectTool', 'getProjects', {}, userId, steps);
      if (res?.data?.length) {
        const rows = res.data.map((p: any) => `• **${p.name}** — ${p.completed}/${p.total} done, ${p.open} open`).join('\n');
        return { reply: `### Projects\n\n${rows}`, toolSteps: steps };
      }
      if (res) return { reply: res.message, toolSteps: steps };
    }
  }

  return null;
}
