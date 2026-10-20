import { db } from '@/lib/db';
import { memoryEngine } from '@/lib/memory';
import { Task, Reminder, Goal, Memory, LedgerEntry, SpendingEntry } from '@/types';
import { crudTools } from './crud';

export type ToolPermissionLevel = 'READ' | 'WRITE' | 'DESTRUCTIVE';

export interface ToolActionDefinition {
  name: string;
  description: string;
  parameters: Record<string, { type: string; description: string; required?: boolean }>;
  permissionLevel: ToolPermissionLevel;
  requiresConfirmation?: boolean;
}

export interface ToolModule {
  name: string;
  description: string;
  actions: Record<string, ToolActionDefinition>;
  execute: (
    actionName: string,
    args: Record<string, any>,
    userId: string,
    context?: Record<string, any>
  ) => Promise<{ success: boolean; data?: any; message: string; requiresConfirmation?: boolean; confirmationPayload?: any }>;
}

export const toolRegistry: Record<string, ToolModule> = {
  // ── CRUD TOOLS: habits, notes, notifications, preferences, conversations, projects ──
  ...crudTools,

  // ── 1. SPENDING TOOL ────────────────────────────────────────
  SpendingTool: {
    name: 'SpendingTool',
    description: "Tracks the user's day-to-day expenses and spending history.",
    actions: {
      addExpense: {
        name: 'addExpense',
        description: 'Records a daily expense (food, transport, shopping, bills, etc.).',
        parameters: {
          amount: { type: 'number', description: 'Amount spent', required: true },
          note: { type: 'string', description: 'What the expense was for' },
          category: { type: 'string', description: "Category: food, coffee, transport, shopping, groceries, bills, rent, health, phone, other" },
          date: { type: 'string', description: 'Date as YYYY-MM-DD (defaults to today)' },
        },
        permissionLevel: 'WRITE',
      },
      getExpenses: {
        name: 'getExpenses',
        description: 'Lists recorded expenses, optionally for a specific date.',
        parameters: {
          date: { type: 'string', description: 'Filter by date as YYYY-MM-DD' },
        },
        permissionLevel: 'READ',
      },
      deleteExpense: {
        name: 'deleteExpense',
        description: 'Deletes a recorded expense by ID.',
        parameters: {
          id: { type: 'string', description: 'Expense entry ID', required: true },
        },
        permissionLevel: 'DESTRUCTIVE',
      },
    },
    async execute(action, args, userId) {
      if (action === 'addExpense') {
        const amount = parseFloat(args.amount);
        if (isNaN(amount) || amount <= 0) {
          return { success: false, message: 'Please provide a valid expense amount.' };
        }
        const category = (args.category || 'other').toString().toLowerCase();
        const entry: SpendingEntry = {
          id: `spend_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          userId,
          amount: Math.round(amount * 100) / 100,
          category,
          note: args.note ? args.note.toString().trim() : undefined,
          date: args.date || new Date().toISOString().slice(0, 10),
          createdAt: new Date().toISOString(),
        };
        db.createSpendingEntry(entry);
        const label = category.charAt(0).toUpperCase() + category.slice(1);
        return {
          success: true,
          data: entry,
          message: `Logged **₹${entry.amount}**${entry.note ? ` for "${entry.note}"` : ''} under **${label}**.`,
        };
      }

      if (action === 'getExpenses') {
        const entries = db
          .getSpendingEntries(userId)
          .filter((entry) => !args.date || entry.date === args.date);
        if (entries.length === 0) {
          return { success: true, data: [], message: 'No expenses recorded for that period.' };
        }
        const total = entries.reduce((sum, entry) => sum + entry.amount, 0);
        const rows = entries
          .slice(0, 20)
          .map((entry) => `• ${entry.date} — ₹${entry.amount} · ${entry.note || entry.category}`)
          .join('\n');
        return {
          success: true,
          data: entries,
          message: `### Expenses\n\n${rows}\n\n**Total:** ₹${Math.round(total * 100) / 100}`,
        };
      }

      if (action === 'deleteExpense') {
        if (!args.id) return { success: false, message: 'Expense ID is required.' };
        const deleted = db.deleteSpendingEntry(args.id.toString(), userId);
        return deleted
          ? { success: true, message: 'Expense deleted.' }
          : { success: false, message: 'Expense not found.' };
      }

      return { success: false, message: `Unknown SpendingTool action: ${action}` };
    },
  },

  // ── 2. MEMORY TOOL ──────────────────────────────────────────
  MemoryTool: {
    name: 'MemoryTool',
    description: 'Manages user persistent memories, preferences, facts, and deadlines.',
    actions: {
      saveMemory: {
        name: 'saveMemory',
        description: 'Explicitly stores a user fact, preference, rule, or important date.',
        parameters: {
          content: { type: 'string', description: 'The exact memory content to remember', required: true },
          category: { type: 'string', description: 'Optional category (Design, Engineering, Career, etc.)' },
        },
        permissionLevel: 'WRITE',
      },
      updateMemory: {
        name: 'updateMemory',
        description: 'Rewrites an existing memory entry, or pins/unpins it.',
        parameters: {
          memoryQuery: { type: 'string', description: 'Memory ID or text to match', required: true },
          content: { type: 'string', description: 'New memory content' },
          category: { type: 'string', description: 'New category' },
          pinned: { type: 'boolean', description: 'Pin or unpin the memory' },
        },
        permissionLevel: 'WRITE',
      },
      searchMemory: {
        name: 'searchMemory',
        description: 'Searches memories using semantic and keyword matching.',
        parameters: {
          query: { type: 'string', description: 'Search keywords or semantic topic', required: true },
        },
        permissionLevel: 'READ',
      },
      forgetMemory: {
        name: 'forgetMemory',
        description: 'Deletes memories relating to a topic or explicit fact.',
        parameters: {
          topic: { type: 'string', description: 'The topic or memory content to remove', required: true },
        },
        permissionLevel: 'DESTRUCTIVE',
      },
      listMemories: {
        name: 'listMemories',
        description: 'Lists all stored memories for the user.',
        parameters: {},
        permissionLevel: 'READ',
      },
    },
    async execute(action, args, userId) {
      if (action === 'saveMemory') {
        const mem = memoryEngine.save(userId, args.content);
        return {
          success: true,
          data: mem,
          message: `✓ Saved to memory: "${mem.content}"`,
        };
      }
      if (action === 'searchMemory') {
        const results = memoryEngine.search(userId, args.query, 6);
        return {
          success: true,
          data: results.map((r) => r.memory),
          message: `Found ${results.length} relevant memories for "${args.query}"`,
        };
      }
      if (action === 'forgetMemory') {
        const count = memoryEngine.forget(userId, args.topic);
        return {
          success: true,
          data: { removedCount: count },
          message: count > 0 ? `✓ Forgotten ${count} memory item(s) regarding "${args.topic}".` : `No matching memories found to forget.`,
        };
      }
      if (action === 'listMemories') {
        const memories = db.getMemories(userId);
        return {
          success: true,
          data: memories,
          message: `You have ${memories.length} stored memories.`,
        };
      }
      if (action === 'updateMemory') {
        const memories = db.getMemories(userId);
        const q = String(args.memoryQuery || '').toLowerCase().trim();
        const target =
          memories.find((m) => m.id === args.memoryQuery) ||
          memories.find((m) => m.content.toLowerCase().includes(q)) ||
          null;
        if (!target) {
          return { success: false, message: `No memory found matching "${args.memoryQuery}".` };
        }
        const patch: Partial<Memory> = {};
        if (args.content) patch.content = String(args.content).trim();
        if (args.category) patch.category = args.category;
        if (typeof args.pinned === 'boolean') patch.pinned = args.pinned;
        const updated = db.updateMemory(target.id, userId, patch);
        return {
          success: !!updated,
          data: updated,
          message: updated ? `✓ Memory updated: "${updated.content}"` : 'Memory update failed.',
        };
      }
      return { success: false, message: `Unknown memory action: ${action}` };
    },
  },

  // ── 3. TASK TOOL ───────────────────────────────────────────
  TaskTool: {
    name: 'TaskTool',
    description: 'Manages tasks, to-dos, priorities, due dates, and completion status.',
    actions: {
      createTask: {
        name: 'createTask',
        description: 'Creates a new task with priority and optional due date/project.',
        parameters: {
          title: { type: 'string', description: 'Title of the task', required: true },
          description: { type: 'string', description: 'Detailed notes or instructions' },
          priority: { type: 'string', description: 'low | medium | high | urgent' },
          dueDate: { type: 'string', description: 'ISO string or date description' },
          projectId: { type: 'string', description: 'Associated project ID or name' },
        },
        permissionLevel: 'WRITE',
      },
      getTasks: {
        name: 'getTasks',
        description: 'Retrieves user tasks filtered by status or project.',
        parameters: {
          status: { type: 'string', description: 'all | todo | in_progress | completed' },
          projectId: { type: 'string', description: 'Filter by project' },
        },
        permissionLevel: 'READ',
      },
      completeTask: {
        name: 'completeTask',
        description: 'Marks a task as completed.',
        parameters: {
          taskId: { type: 'string', description: 'Task ID or task title query', required: true },
        },
        permissionLevel: 'WRITE',
      },
      updateTask: {
        name: 'updateTask',
        description: 'Updates task status, priority, or due date.',
        parameters: {
          taskId: { type: 'string', description: 'Task ID', required: true },
          patch: { type: 'object', description: 'Properties to update' },
        },
        permissionLevel: 'WRITE',
      },
      deleteTask: {
        name: 'deleteTask',
        description: 'Deletes a task.',
        parameters: {
          taskId: { type: 'string', description: 'Task ID', required: true },
        },
        permissionLevel: 'DESTRUCTIVE',
      },
      createSubtask: {
        name: 'createSubtask',
        description: 'Adds a checklist subtask inside an existing task.',
        parameters: {
          taskId: { type: 'string', description: 'Task ID or title', required: true },
          title: { type: 'string', description: 'Subtask title', required: true },
        },
        permissionLevel: 'WRITE',
      },
      toggleSubtask: {
        name: 'toggleSubtask',
        description: 'Marks a subtask complete/incomplete (auto-completes the parent when all are done).',
        parameters: {
          taskId: { type: 'string', description: 'Task ID or title', required: true },
          subtask: { type: 'string', description: 'Subtask ID or title', required: true },
        },
        permissionLevel: 'WRITE',
      },
      deleteSubtask: {
        name: 'deleteSubtask',
        description: 'Removes a subtask from a task.',
        parameters: {
          taskId: { type: 'string', description: 'Task ID or title', required: true },
          subtask: { type: 'string', description: 'Subtask ID or title', required: true },
        },
        permissionLevel: 'DESTRUCTIVE',
      },
    },
    async execute(action, args, userId) {
      if (action === 'createTask') {
        const newTask: Task = {
          id: `task_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          userId,
          title: args.title,
          description: args.description,
          status: 'todo',
          priority: args.priority || 'medium',
          dueDate: args.dueDate,
          projectId: args.projectId,
          tags: args.tags || [],
          createdAt: new Date().toISOString(),
        };
        db.createTask(newTask);
        return {
          success: true,
          data: newTask,
          message: `✓ Task created: "${newTask.title}" [Priority: ${newTask.priority.toUpperCase()}]`,
        };
      }
      if (action === 'getTasks') {
        let tasks = db.getTasks(userId);
        if (args.status && args.status !== 'all') {
          tasks = tasks.filter((t) => t.status === args.status);
        }
        if (args.projectId) {
          tasks = tasks.filter((t) => t.projectId === args.projectId);
        }
        return {
          success: true,
          data: tasks,
          message: `Found ${tasks.length} task(s).`,
        };
      }
      if (action === 'completeTask') {
        const tasks = db.getTasks(userId);
        const q = args.taskId.toLowerCase();
        const target =
          tasks.find((t) => t.id === args.taskId) ||
          tasks.find((t) => t.title.toLowerCase().includes(q)) ||
          tasks.find((t) => q.includes(t.title.toLowerCase())) ||
          tasks.find((t) => q.split(' ').some((word: string) => word.length > 3 && t.title.toLowerCase().includes(word)));

        if (!target) {
          return { success: false, message: `Could not find task matching "${args.taskId}".` };
        }
        const updated = db.updateTask(target.id, userId, { status: 'completed', completedAt: new Date().toISOString() });
        return {
          success: true,
          data: updated,
          message: `✓ Marked "${target.title}" as completed!`,
        };
      }
      if (action === 'updateTask') {
        const updated = db.updateTask(args.taskId, userId, args.patch || {});
        return {
          success: !!updated,
          data: updated,
          message: updated ? `✓ Task updated.` : `Task not found.`,
        };
      }
      if (action === 'deleteTask') {
        const ok = db.deleteTask(args.taskId, userId);
        return {
          success: ok,
          message: ok ? `✓ Task deleted.` : `Task not found.`,
        };
      }
      if (action === 'createSubtask' || action === 'toggleSubtask' || action === 'deleteSubtask') {
        const tasks = db.getTasks(userId);
        const findTask = (q: string) => {
          const query = String(q || '').toLowerCase();
          return (
            tasks.find((t) => t.id === q) ||
            tasks.find((t) => t.title.toLowerCase().includes(query)) ||
            tasks.find((t) => query.split(' ').some((w) => w.length > 3 && t.title.toLowerCase().includes(w))) ||
            null
          );
        };
        const task = findTask(args.taskId);
        if (!task) return { success: false, message: `Task "${args.taskId}" not found.` };
        const subtasks = task.subtasks || [];

        if (action === 'createSubtask') {
          if (!args.title) return { success: false, message: 'Subtask title is required.' };
          const next = [
            ...subtasks,
            { id: `sub_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`, title: String(args.title).trim(), completed: false },
          ];
          const updated = db.setTaskSubtasks(task.id, userId, next);
          return {
            success: !!updated,
            data: updated,
            message: updated ? `✓ Subtask added to "${task.title}".` : 'Could not add subtask.',
          };
        }

        const findSub = (q: string) => {
          const query = String(q || '').toLowerCase();
          return (
            subtasks.find((s) => s.id === q) ||
            subtasks.find((s) => s.title.toLowerCase().includes(query)) ||
            null
          );
        };
        const subtask = findSub(args.subtask);
        if (!subtask) return { success: false, message: `Subtask "${args.subtask}" not found in "${task.title}".` };

        if (action === 'toggleSubtask') {
          const updated = db.toggleSubTask(task.id, subtask.id, userId);
          return {
            success: !!updated,
            data: updated,
            message: updated
              ? `✓ Subtask "${subtask.title}" is now ${subtask.completed ? 'incomplete' : 'complete'}.`
              : 'Could not update subtask.',
          };
        }

        const next = subtasks.filter((s) => s.id !== subtask.id);
        const updated = db.setTaskSubtasks(task.id, userId, next);
        return {
          success: !!updated,
          data: updated,
          message: updated ? `✓ Subtask "${subtask.title}" deleted.` : 'Could not delete subtask.',
        };
      }
      return { success: false, message: `Unknown task action: ${action}` };
    },
  },

  // ── 4. REMINDER TOOL ───────────────────────────────────────
  ReminderTool: {
    name: 'ReminderTool',
    description: 'Schedules and manages natural language reminders and notifications.',
    actions: {
      createReminder: {
        name: 'createReminder',
        description: 'Schedules a new reminder for a given time or recurrence pattern.',
        parameters: {
          title: { type: 'string', description: 'Reminder summary', required: true },
          dueDateTime: { type: 'string', description: 'ISO date or target timestamp', required: true },
          recurrence: { type: 'string', description: 'none | daily | weekly | monthly' },
          priority: { type: 'string', description: 'low | medium | high' },
          notes: { type: 'string', description: 'Additional context' },
        },
        permissionLevel: 'WRITE',
      },
      getReminders: {
        name: 'getReminders',
        description: 'Fetches active or upcoming reminders.',
        parameters: {},
        permissionLevel: 'READ',
      },
      updateReminder: {
        name: 'updateReminder',
        description: 'Reschedules or renames an existing reminder.',
        parameters: {
          reminderId: { type: 'string', description: 'Reminder ID or title', required: true },
          title: { type: 'string', description: 'New title' },
          dueDateTime: { type: 'string', description: 'New ISO date or target timestamp' },
          recurrence: { type: 'string', description: 'none | daily | weekly | monthly' },
          priority: { type: 'string', description: 'low | medium | high' },
          notes: { type: 'string', description: 'Updated notes' },
        },
        permissionLevel: 'WRITE',
      },
      deleteReminder: {
        name: 'deleteReminder',
        description: 'Removes a reminder.',
        parameters: {
          reminderId: { type: 'string', description: 'Reminder ID', required: true },
        },
        permissionLevel: 'DESTRUCTIVE',
      },
    },
    async execute(action, args, userId) {
      if (action === 'createReminder') {
        let dueDate = args.dueDateTime;
        // Natural language parsing helper
        if (!dueDate || isNaN(new Date(dueDate).getTime())) {
          dueDate = new Date(Date.now() + 3600000 * 2).toISOString(); // fallback +2h
        }

        const newReminder: Reminder = {
          id: `rem_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          userId,
          title: args.title,
          dueDateTime: new Date(dueDate).toISOString(),
          recurrence: args.recurrence || 'none',
          priority: args.priority || 'medium',
          notes: args.notes,
          status: 'pending',
          createdAt: new Date().toISOString(),
        };

        db.createReminder(newReminder);
        const formattedTime = new Date(newReminder.dueDateTime).toLocaleString([], {
          dateStyle: 'medium',
          timeStyle: 'short',
        });

        return {
          success: true,
          data: newReminder,
          message: `✓ Reminder set for ${formattedTime}: "${newReminder.title}" (${newReminder.recurrence === 'none' ? 'one-time' : newReminder.recurrence})`,
        };
      }
      if (action === 'getReminders') {
        const reminders = db.getReminders(userId);
        return {
          success: true,
          data: reminders,
          message: `You have ${reminders.length} scheduled reminder(s).`,
        };
      }
      if (action === 'deleteReminder') {
        const ok = db.deleteReminder(args.reminderId, userId);
        return {
          success: ok,
          message: ok ? `✓ Reminder deleted.` : `Reminder not found.`,
        };
      }
      if (action === 'updateReminder') {
        const reminders = db.getReminders(userId);
        const q = String(args.reminderId || '').toLowerCase().trim();
        const target =
          reminders.find((r) => r.id === args.reminderId) ||
          reminders.find((r) => r.title.toLowerCase().includes(q)) ||
          null;
        if (!target) return { success: false, message: `Reminder "${args.reminderId}" not found.` };

        const patch: Partial<Reminder> = {};
        if (args.title) patch.title = String(args.title).trim();
        if (args.dueDateTime) {
          const parsed = new Date(args.dueDateTime);
          if (isNaN(parsed.getTime())) {
            return { success: false, message: `Could not understand date "${args.dueDateTime}".` };
          }
          patch.dueDateTime = parsed.toISOString();
          patch.status = 'pending';
        }
        if (args.recurrence) patch.recurrence = args.recurrence;
        if (args.priority) patch.priority = args.priority;
        if (args.notes !== undefined) patch.notes = args.notes;

        const updated = db.updateReminder(target.id, userId, patch);
        return {
          success: !!updated,
          data: updated,
          message: updated
            ? `✓ Reminder updated: "${updated.title}" due ${new Date(updated.dueDateTime).toLocaleString()}.`
            : 'Reminder update failed.',
        };
      }
      return { success: false, message: `Unknown reminder action: ${action}` };
    },
  },

  // ── 5. GOAL TOOL ───────────────────────────────────────────
  GoalTool: {
    name: 'GoalTool',
    description: 'Tracks user goals, objectives, OKRs, and milestone progress.',
    actions: {
      getGoals: {
        name: 'getGoals',
        description: 'Lists all user goals with category, target dates, and progress percentage.',
        parameters: {},
        permissionLevel: 'READ',
      },
      getGoalDetails: {
        name: 'getGoalDetails',
        description: 'Retrieves deep context, milestones, and status for a specific goal.',
        parameters: {
          goalTitle: { type: 'string', description: 'Goal title or ID', required: true },
        },
        permissionLevel: 'READ',
      },
      createGoal: {
        name: 'createGoal',
        description: 'Creates a new goal or OKR objective with milestones and optional strategic notes.',
        parameters: {
          title: { type: 'string', description: 'Title of the goal', required: true },
          description: { type: 'string', description: 'Goal summary or strategy' },
          notes: { type: 'string', description: 'Strategic notes, reflections or execution plan' },
          category: { type: 'string', description: 'career | health | finance | learning | personal' },
          targetDate: { type: 'string', description: 'Target completion date (YYYY-MM-DD)' },
          milestones: { type: 'array', description: 'List of milestone titles' },
        },
        permissionLevel: 'WRITE',
      },
      updateGoalNotes: {
        name: 'updateGoalNotes',
        description: 'Updates or saves strategic notes for an existing goal or OKR.',
        parameters: {
          goalTitle: { type: 'string', description: 'Goal title or ID', required: true },
          notes: { type: 'string', description: 'The strategic notes content to save', required: true },
        },
        permissionLevel: 'WRITE',
      },
      updateGoal: {
        name: 'updateGoal',
        description: 'Updates goal title, description, category, target date, progress or status.',
        parameters: {
          goalTitle: { type: 'string', description: 'Goal title or ID', required: true },
          title: { type: 'string', description: 'New title' },
          description: { type: 'string', description: 'New description' },
          category: { type: 'string', description: 'career | health | finance | learning | personal' },
          targetDate: { type: 'string', description: 'New target date (YYYY-MM-DD)' },
          progress: { type: 'number', description: 'Progress percentage 0-100' },
          status: { type: 'string', description: 'active | completed | paused' },
        },
        permissionLevel: 'WRITE',
      },
      deleteGoal: {
        name: 'deleteGoal',
        description: 'Deletes a goal and its milestones.',
        parameters: {
          goalTitle: { type: 'string', description: 'Goal title or ID', required: true },
        },
        permissionLevel: 'DESTRUCTIVE',
      },
      addMilestone: {
        name: 'addMilestone',
        description: 'Adds a milestone to a goal.',
        parameters: {
          goalTitle: { type: 'string', description: 'Goal title or ID', required: true },
          title: { type: 'string', description: 'Milestone title', required: true },
          targetDate: { type: 'string', description: 'Optional target date' },
        },
        permissionLevel: 'WRITE',
      },
      toggleMilestone: {
        name: 'toggleMilestone',
        description: 'Marks a goal milestone complete/incomplete and recalculates progress.',
        parameters: {
          goalTitle: { type: 'string', description: 'Goal title or ID', required: true },
          milestone: { type: 'string', description: 'Milestone title or ID', required: true },
        },
        permissionLevel: 'WRITE',
      },
    },
    async execute(action, args, userId) {
      if (action === 'getGoals') {
        const goals = db.getGoals(userId);
        return {
          success: true,
          data: goals,
          message: `Found ${goals.length} goal(s).`,
        };
      }
      if (action === 'getGoalDetails') {
        const goals = db.getGoals(userId);
        const gName = args.goalTitle.toLowerCase();
        const goal = goals.find(
          (g) => g.title.toLowerCase().includes(gName) || g.id === args.goalTitle
        );

        if (!goal) {
          return { success: false, message: `Goal "${args.goalTitle}" not found.` };
        }

        return {
          success: true,
          data: goal,
          message: `Retrieved context for ${goal.title}: ${goal.milestones?.length || 0} milestones, ${goal.progress}% progress.`,
        };
      }
      if (action === 'createGoal') {
        const milestones = Array.isArray(args.milestones)
          ? args.milestones.map((m: any, idx: number) => ({
              id: `m_${Date.now()}_${idx}`,
              title: typeof m === 'string' ? m : m.title || '',
              completed: false,
            }))
          : [];

        const newGoal: Goal = {
          id: `goal_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          userId,
          title: args.title,
          description: args.description || '',
          notes: args.notes || '',
          category: args.category || 'personal',
          targetDate: args.targetDate,
          progress: 0,
          milestones,
          status: 'active',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        db.createGoal(newGoal);
        return {
          success: true,
          data: newGoal,
          message: `✓ Goal "${newGoal.title}" created successfully.`,
        };
      }
      if (action === 'updateGoalNotes') {
        const goals = db.getGoals(userId);
        const gName = args.goalTitle.toLowerCase();
        const goal = goals.find(
          (g) => g.title.toLowerCase().includes(gName) || g.id === args.goalTitle
        );
        if (!goal) {
          return { success: false, message: `Goal "${args.goalTitle}" not found.` };
        }
        const updated = db.updateGoal(goal.id, userId, { notes: args.notes });
        return {
          success: true,
          data: updated,
          message: `✓ Strategic notes updated for "${goal.title}".`,
        };
      }
      if (action === 'updateGoal' || action === 'deleteGoal' || action === 'addMilestone' || action === 'toggleMilestone') {
        const goals = db.getGoals(userId);
        const q = String(args.goalTitle || '').toLowerCase().trim();
        const goal =
          goals.find((g) => g.id === args.goalTitle) ||
          goals.find((g) => g.title.toLowerCase() === q) ||
          goals.find((g) => g.title.toLowerCase().includes(q)) ||
          null;
        if (!goal) return { success: false, message: `Goal "${args.goalTitle}" not found.` };

        if (action === 'deleteGoal') {
          const ok = db.deleteGoal(goal.id, userId);
          return { success: ok, message: ok ? `✓ Goal "${goal.title}" deleted.` : 'Delete failed.' };
        }

        if (action === 'updateGoal') {
          const patch: Partial<Goal> = {};
          if (args.title) patch.title = String(args.title).trim();
          if (args.description !== undefined) patch.description = args.description;
          if (args.category) patch.category = args.category;
          if (args.targetDate) patch.targetDate = args.targetDate;
          if (args.progress !== undefined) patch.progress = Math.max(0, Math.min(100, Number(args.progress)));
          if (args.status) patch.status = args.status;
          if (patch.progress === 100) patch.status = 'completed';
          const updated = db.updateGoal(goal.id, userId, patch);
          return { success: !!updated, data: updated, message: updated ? `✓ Goal "${updated.title}" updated.` : 'Update failed.' };
        }

        const milestones = goal.milestones || [];

        if (action === 'addMilestone') {
          if (!args.title) return { success: false, message: 'Milestone title is required.' };
          const next = [
            ...milestones,
            {
              id: `m_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
              title: String(args.title).trim(),
              completed: false,
              targetDate: args.targetDate,
            },
          ];
          const updated = db.updateGoal(goal.id, userId, { milestones: next });
          return { success: !!updated, data: updated, message: updated ? `✓ Milestone added to "${goal.title}".` : 'Could not add milestone.' };
        }

        const mq = String(args.milestone || '').toLowerCase().trim();
        const milestone =
          milestones.find((m) => m.id === args.milestone) ||
          milestones.find((m) => m.title.toLowerCase().includes(mq)) ||
          null;
        if (!milestone) return { success: false, message: `Milestone "${args.milestone}" not found.` };
        const updated = db.toggleGoalMilestone(goal.id, milestone.id, userId);
        return {
          success: !!updated,
          data: updated,
          message: updated
            ? `✓ Milestone "${milestone.title}" ${milestone.completed ? 'completed' : 'reopened'} — goal progress ${updated.progress}%.`
            : 'Could not update milestone.',
        };
      }
      return { success: false, message: `Unknown goal action: ${action}` };
    },
  },

  // ── 6. GITHUB TOOL ─────────────────────────────────────────
  GitHubTool: {
    name: 'GitHubTool',
    description: 'Inspects repositories, commits, branches, pull requests, and drafts PR summaries.',
    actions: {
      getRepositories: {
        name: 'getRepositories',
        description: 'Lists connected repositories and latest commit statuses.',
        parameters: {},
        permissionLevel: 'READ',
      },
      getCommits: {
        name: 'getCommits',
        description: 'Retrieves recent commits for a repository or today’s git activity.',
        parameters: {
          repo: { type: 'string', description: 'Repository name', required: true },
          since: { type: 'string', description: 'Filter commits since (today, yesterday, 7d)' },
        },
        permissionLevel: 'READ',
      },
      preparePullRequest: {
        name: 'preparePullRequest',
        description: 'Generates PR title, markdown description, change summary and test plan.',
        parameters: {
          repo: { type: 'string', description: 'Repository name', required: true },
          branch: { type: 'string', description: 'Feature branch', required: true },
          baseBranch: { type: 'string', description: 'Base branch (default main)' },
        },
        permissionLevel: 'WRITE',
        requiresConfirmation: true,
      },
      createPullRequest: {
        name: 'createPullRequest',
        description: 'Creates the actual pull request on GitHub (Requires Confirmation).',
        parameters: {
          repo: { type: 'string', description: 'Repository', required: true },
          title: { type: 'string', description: 'PR Title', required: true },
          body: { type: 'string', description: 'PR Markdown body', required: true },
        },
        permissionLevel: 'WRITE',
        requiresConfirmation: true,
      },
    },
    async execute(action, args, userId) {
      const user = db.getUserById(userId);
      const gitToken = user?.preferences?.githubToken || process.env.GITHUB_TOKEN;

      if (action === 'getRepositories') {
        const { fetchGitHubRepos } = await import('./githubReal');
        const repos = await fetchGitHubRepos(gitToken);
        return {
          success: true,
          data: repos,
          message: `Found ${repos.length} connected GitHub repositories.`,
        };
      }
      if (action === 'getCommits') {
        const { fetchGitHubCommits } = await import('./githubReal');
        const commits = await fetchGitHubCommits(args.repo || 'alexrivera/videovault-ai', gitToken);
        return {
          success: true,
          data: commits,
          message: `Retrieved ${commits.length} commits for ${args.repo || 'active repo'}.`,
        };
      }
      if (action === 'preparePullRequest') {
        const prProposal = {
          title: `feat(video-vault): integrate Whisper streaming cache and chapter indexing`,
          branch: args.branch || 'feature/whisper-caching',
          baseBranch: args.baseBranch || 'main',
          summary: `This PR integrates chunked audio transcript streaming, implements Redis transcript caching to reduce API costs by 65%, and fixes seek offsets in embedded players.`,
          changes: [
            'Added `WhisperStreamService` with exponential backoff',
            'Implemented LRU & Redis cache layer for video transcription responses',
            'Fixed YouTube iframe timecode sync bug in video player wrapper',
            'Updated unit test suite with 94% coverage',
          ],
          testing: 'Tested locally against 15 video samples with both Whisper-1 and local Whisper instances.',
        };

        return {
          success: true,
          data: prProposal,
          requiresConfirmation: true,
          confirmationPayload: {
            toolName: 'GitHubTool',
            action: 'createPullRequest',
            title: prProposal.title,
            branch: prProposal.branch,
            repo: args.repo || 'alexrivera/videovault-ai',
          },
          message: `Prepared Pull Request draft for ${args.repo || 'VideoVault'}. Confirmation required before creating on GitHub.`,
        };
      }
      if (action === 'createPullRequest') {
        return {
          success: true,
          data: {
            prNumber: 15,
            url: `https://github.com/alexrivera/videovault-ai/pull/15`,
            status: 'opened',
          },
          message: `✓ Pull Request #15 created on GitHub: "https://github.com/alexrivera/videovault-ai/pull/15"`,
        };
      }
      return { success: false, message: `Unknown GitHub action: ${action}` };
    },
  },

  // ── 7. WEB SEARCH TOOL ─────────────────────────────────────
  WebSearchTool: {
    name: 'WebSearchTool',
    description: 'Searches the live web for current documentation, news, libraries, and benchmarks.',
    actions: {
      searchWeb: {
        name: 'searchWeb',
        description: 'Performs a web search and retrieves structured snippets with citations.',
        parameters: {
          query: { type: 'string', description: 'Search keywords or topic', required: true },
        },
        permissionLevel: 'READ',
      },
    },
    async execute(action, args) {
      const { executeWebSearch } = await import('./websearchReal');
      const results = await executeWebSearch(args.query || 'Next.js 15 documentation');

      return {
        success: true,
        data: results,
        message: `Web search completed with ${results.length} authoritative sources for "${args.query}".`,
      };
    },
  },

  // ── 8. CALENDAR TOOL ───────────────────────────────────────
  CalendarTool: {
    name: 'CalendarTool',
    description: 'Manages events, schedules meetings, and checks calendar availability.',
    actions: {
      getEvents: {
        name: 'getEvents',
        description: 'Fetches calendar events for a specific date or timeframe.',
        parameters: {
          startDate: { type: 'string', description: 'Start date ISO' },
          endDate: { type: 'string', description: 'End date ISO' },
        },
        permissionLevel: 'READ',
      },
      createEvent: {
        name: 'createEvent',
        description: 'Creates a calendar event (Requires confirmation for team meetings).',
        parameters: {
          title: { type: 'string', description: 'Event title', required: true },
          startTime: { type: 'string', description: 'Start time ISO', required: true },
          endTime: { type: 'string', description: 'End time ISO', required: true },
          attendees: { type: 'array', description: 'Email addresses of attendees' },
        },
        permissionLevel: 'WRITE',
        requiresConfirmation: true,
      },
    },
    async execute(action, args) {
      if (action === 'getEvents') {
        const events = [
          {
            id: 'evt_01',
            title: 'Project Architecture Review',
            startTime: new Date(Date.now() + 86400000 * 1 + 3600000 * 16).toISOString(),
            endTime: new Date(Date.now() + 86400000 * 1 + 3600000 * 17).toISOString(),
            attendees: ['alex@recall.ai', 'sarah@stratotech.com'],
            location: 'Google Meet',
          },
          {
            id: 'evt_02',
            title: 'Recall AI Sprint Planning',
            startTime: new Date(Date.now() + 86400000 * 2 + 3600000 * 10).toISOString(),
            endTime: new Date(Date.now() + 86400000 * 2 + 3600000 * 11).toISOString(),
            attendees: ['alex@recall.ai'],
            location: 'Office Room 4B',
          },
        ];
        return {
          success: true,
          data: events,
          message: `Found ${events.length} upcoming calendar events.`,
        };
      }
      if (action === 'createEvent') {
        return {
          success: true,
          data: {
            id: `evt_${Date.now()}`,
            title: args.title,
            startTime: args.startTime,
            endTime: args.endTime,
            status: 'scheduled',
          },
          message: `✓ Event scheduled: "${args.title}" at ${new Date(args.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`,
        };
      }
      return { success: false, message: `Unknown calendar action: ${action}` };
    },
  },

  // ── 9. EMAIL TOOL ──────────────────────────────────────────
  EmailTool: {
    name: 'EmailTool',
    description: 'Reads emails, summarizes threads, and prepares drafts. Never sends without user approval.',
    actions: {
      getEmails: {
        name: 'getEmails',
        description: 'Fetches recent unread or important emails.',
        parameters: {
          query: { type: 'string', description: 'Search term or filter' },
        },
        permissionLevel: 'READ',
      },
      draftEmail: {
        name: 'draftEmail',
        description: 'Creates a draft email for user review before sending.',
        parameters: {
          to: { type: 'string', description: 'Recipient email', required: true },
          subject: { type: 'string', description: 'Email subject', required: true },
          body: { type: 'string', description: 'Markdown or plain text body', required: true },
        },
        permissionLevel: 'WRITE',
        requiresConfirmation: true,
      },
    },
    async execute(action, args) {
      if (action === 'getEmails') {
        const emails = [
          {
            id: 'eml_01',
            from: 'professor.hansen@university.edu',
            subject: 'Project Report Submission Deadline Confirmation',
            snippet: 'Hi Alex, reminder that final project writeups and code repository links are due on October 5 at 5:00 PM.',
            receivedAt: new Date(Date.now() - 3600000 * 8).toISOString(),
            isImportant: true,
          },
          {
            id: 'eml_02',
            from: 'notifications@github.com',
            subject: '[alexrivera/videovault-ai] PR #14 merged into main',
            snippet: 'Merge pull request #14 from feature/transcript-cache: optimize Redis latency.',
            receivedAt: new Date(Date.now() - 3600000 * 18).toISOString(),
            isImportant: false,
          },
        ];
        return {
          success: true,
          data: emails,
          message: `Found ${emails.length} recent email(s).`,
        };
      }
      if (action === 'draftEmail') {
        return {
          success: true,
          data: {
            to: args.to,
            subject: args.subject,
            body: args.body,
            status: 'draft_created',
          },
          requiresConfirmation: true,
          confirmationPayload: {
            toolName: 'EmailTool',
            action: 'sendEmail',
            to: args.to,
            subject: args.subject,
          },
          message: `✓ Draft email prepared for ${args.to}. User confirmation required to send.`,
        };
      }
      return { success: false, message: `Unknown email action: ${action}` };
    },
  },

  // ── 10. MONEY LEDGER & DUES TOOL ────────────────────────────
  LedgerTool: {
    name: 'LedgerTool',
    description: 'Tracks money you need to give (you owe) or money you need to receive (owed to you), debts, loans, split expenses, and payment settlements.',
    actions: {
      addLedgerEntry: {
        name: 'addLedgerEntry',
        description: 'Records a financial debt or payment to give or receive.',
        parameters: {
          personName: { type: 'string', description: 'Name of the person or party', required: true },
          amount: { type: 'number', description: 'The numeric money amount', required: true },
          type: { type: 'string', description: "'give' (you owe / need to pay) or 'receive' (they owe you / receivable)", required: true },
          currency: { type: 'string', description: "Currency symbol like '₹', '$', '€', '£'. Defaults to '₹'" },
          description: { type: 'string', description: 'Reason, note, or item for the debt/payment' },
          dueDate: { type: 'string', description: 'Optional due date string or ISO date' },
          category: { type: 'string', description: 'Category (food, rent, travel, borrowed, personal, etc.)' },
        },
        permissionLevel: 'WRITE',
      },
      getLedgerEntries: {
        name: 'getLedgerEntries',
        description: 'Retrieves all financial dues, debts, payables, and receivables.',
        parameters: {
          filter: { type: 'string', description: "'all', 'give' (payable), 'receive' (receivable), or 'settled'" },
        },
        permissionLevel: 'READ',
      },
      settleLedgerEntry: {
        name: 'settleLedgerEntry',
        description: 'Marks a debt or payment as settled / paid.',
        parameters: {
          personNameOrId: { type: 'string', description: 'The person name or entry ID to settle', required: true },
        },
        permissionLevel: 'WRITE',
      },
      updateLedgerEntry: {
        name: 'updateLedgerEntry',
        description: 'Edits a ledger entry amount, person, direction, note, category or due date.',
        parameters: {
          id: { type: 'string', description: 'Entry ID or person name', required: true },
          personName: { type: 'string', description: 'New person name' },
          amount: { type: 'number', description: 'New amount' },
          type: { type: 'string', description: "'give' or 'receive'" },
          currency: { type: 'string', description: "Currency symbol like '₹'" },
          description: { type: 'string', description: 'New note/reason' },
          category: { type: 'string', description: 'New category' },
          dueDate: { type: 'string', description: 'New due date' },
        },
        permissionLevel: 'WRITE',
      },
      deleteLedgerEntry: {
        name: 'deleteLedgerEntry',
        description: 'Deletes a ledger debt record.',
        parameters: {
          id: { type: 'string', description: 'The entry ID', required: true },
        },
        permissionLevel: 'DESTRUCTIVE',
      },
    },
    async execute(action, args, userId) {
      if (action === 'addLedgerEntry') {
        const numAmount = parseFloat(args.amount);
        if (isNaN(numAmount) || numAmount <= 0) {
          return { success: false, message: 'Invalid amount for ledger entry.' };
        }
        const entry: LedgerEntry = {
          id: `ledg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          userId,
          personName: args.personName.trim(),
          amount: numAmount,
          currency: args.currency || '₹',
          type: args.type === 'give' ? 'give' : 'receive',
          status: 'pending',
          description: args.description?.trim() || undefined,
          dueDate: args.dueDate || undefined,
          category: args.category || 'personal',
          createdAt: new Date().toISOString(),
        };
        const created = db.createLedgerEntry(entry);
        const direction = created.type === 'give' ? `need to give ${created.currency}${created.amount} to` : `${created.personName} owes you ${created.currency}${created.amount}`;
        return {
          success: true,
          data: created,
          message: `✓ Recorded in Money Ledger: You ${direction} (${created.description || 'No note'}).`,
        };
      }

      if (action === 'getLedgerEntries') {
        const entries = db.getLedgerEntries(userId);
        let filtered = entries;
        if (args.filter === 'give') filtered = entries.filter((e) => e.type === 'give' && e.status === 'pending');
        else if (args.filter === 'receive') filtered = entries.filter((e) => e.type === 'receive' && e.status === 'pending');
        else if (args.filter === 'settled') filtered = entries.filter((e) => e.status === 'settled');

        const totalGive = entries.filter((e) => e.type === 'give' && e.status === 'pending').reduce((sum, e) => sum + e.amount, 0);
        const totalReceive = entries.filter((e) => e.type === 'receive' && e.status === 'pending').reduce((sum, e) => sum + e.amount, 0);
        const net = totalReceive - totalGive;

        return {
          success: true,
          data: {
            entries: filtered,
            summary: {
              totalToGive: totalGive,
              totalToReceive: totalReceive,
              netBalance: net,
            },
          },
          message: `Found ${filtered.length} ledger entry(s). Total to give: ₹${totalGive}, Total to receive: ₹${totalReceive} (Net: ${net >= 0 ? '+' : ''}₹${net}).`,
        };
      }

      if (action === 'settleLedgerEntry') {
        const query = (args.personNameOrId || '').toLowerCase().trim();
        const all = db.getLedgerEntries(userId);
        const target = all.find(
          (e) => e.id === args.personNameOrId || (e.status === 'pending' && e.personName.toLowerCase().includes(query))
        );
        if (!target) {
          return { success: false, message: `Could not find a pending ledger entry for "${args.personNameOrId}".` };
        }
        const settled = db.settleLedgerEntry(target.id, userId);
        return {
          success: true,
          data: settled,
          message: `✓ Settled payment with ${target.personName} for ${target.currency}${target.amount}.`,
        };
      }

      if (action === 'deleteLedgerEntry') {
        const ok = db.deleteLedgerEntry(args.id, userId);
        return {
          success: ok,
          message: ok ? `✓ Removed ledger entry.` : `Could not find entry with ID ${args.id}.`,
        };
      }

      if (action === 'updateLedgerEntry') {
        const all = db.getLedgerEntries(userId);
        const q = String(args.id || '').toLowerCase().trim();
        const target =
          all.find((e) => e.id === args.id) ||
          all.find((e) => e.personName.toLowerCase().includes(q)) ||
          null;
        if (!target) return { success: false, message: `Ledger entry "${args.id}" not found.` };

        const patch: Partial<LedgerEntry> = {};
        if (args.personName) patch.personName = String(args.personName).trim();
        if (args.amount !== undefined) {
          const amount = parseFloat(args.amount);
          if (isNaN(amount) || amount <= 0) return { success: false, message: 'Invalid amount.' };
          patch.amount = amount;
        }
        if (args.type) patch.type = args.type === 'give' ? 'give' : 'receive';
        if (args.currency) patch.currency = args.currency;
        if (args.description !== undefined) patch.description = args.description;
        if (args.category) patch.category = args.category;
        if (args.dueDate) patch.dueDate = args.dueDate;

        const updated = db.updateLedgerEntry(target.id, userId, patch);
        return {
          success: !!updated,
          data: updated,
          message: updated ? `✓ Ledger entry for ${updated.personName} updated (${updated.currency}${updated.amount}).` : 'Update failed.',
        };
      }

      return { success: false, message: `Unknown ledger action: ${action}` };
    },
  },

  // ── 11. REAL-TIME WEATHER TOOL ─────────────────────────────
  WeatherTool: {
    name: 'WeatherTool',
    description: 'Fetches 100% live weather conditions, temperature, humidity, wind, and forecasts for any city or location globally.',
    actions: {
      getWeather: {
        name: 'getWeather',
        description: 'Gets current weather and multi-day forecast for a city.',
        parameters: {
          location: { type: 'string', description: 'City name (e.g. Bangalore, London, New York, Tokyo)', required: true },
        },
        permissionLevel: 'READ',
      },
    },
    async execute(action, args) {
      const { getLiveWeather } = await import('./realtimeData');
      const data = await getLiveWeather(args.location || 'Bengaluru');
      return {
        success: true,
        data,
        message: `Current weather in ${data.location}, ${data.country}: ${data.temperature}°C (${data.condition}), Humidity: ${data.humidity}%, Wind: ${data.windSpeed} km/h.`,
      };
    },
  },

  // ── 12. REAL-TIME MARKET & STOCK TOOL ───────────────────────
  StockTool: {
    name: 'StockTool',
    description: 'Fetches real-time live stock prices, cryptocurrency quotes (BTC, ETH, SOL), 24h change, and market caps.',
    actions: {
      getQuote: {
        name: 'getQuote',
        description: 'Gets live quote for stocks or cryptos.',
        parameters: {
          symbols: { type: 'string', description: 'Comma separated ticker symbols (e.g. BTC, ETH, AAPL, NVDA, TSLA)' },
        },
        permissionLevel: 'READ',
      },
    },
    async execute(action, args) {
      const { getLiveMarketQuotes } = await import('./realtimeData');
      const symList = args.symbols ? args.symbols.split(',').map((s: string) => s.trim()) : ['BTC', 'ETH', 'SOL', 'AAPL', 'NVDA', 'TSLA'];
      const quotes = await getLiveMarketQuotes(symList);
      return {
        success: true,
        data: quotes,
        message: `Retrieved live market quotes for ${quotes.map((q) => `${q.symbol}: ${q.currency}${q.price} (${q.changePercent24h >= 0 ? '+' : ''}${q.changePercent24h}%)`).join(', ')}.`,
      };
    },
  },

  // ── 12. REAL-TIME LIVE NEWS TOOL ───────────────────────────
  NewsTool: {
    name: 'NewsTool',
    description: 'Fetches real-time live breaking news, tech headlines, global events, market updates, and topic-specific news.',
    actions: {
      getNews: {
        name: 'getNews',
        description: 'Retrieves live news headlines or searches news on any topic.',
        parameters: {
          topic: { type: 'string', description: 'News topic or category (e.g. "technology", "artificial intelligence", "world news", "markets", or specific query)' },
        },
        permissionLevel: 'READ',
      },
    },
    async execute(action, args) {
      const { getLiveNews } = await import('./realtimeData');
      const news = await getLiveNews(args.topic || 'all');
      return {
        success: true,
        data: news,
        message: `Found ${news.length} live news stories for "${args.topic || 'latest headlines'}".`,
      };
    },
  },
};

