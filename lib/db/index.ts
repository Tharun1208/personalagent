import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import {
  User,
  Conversation,
  Message,
  Memory,
  Task,
  Reminder,
  Goal,
  AgentAction,
  AppNotification,
  ConfirmationRequest,
  Habit,
  SubTask,
  LedgerEntry,
} from '@/types';
import { syncInitialDataToMongo, syncEntityToMongo } from './mongoSync';
import { isMongoConfigured } from './mongodb';
import {
  hydrateStore,
  getMirror,
  persistDoc,
  deleteDoc,
  flushDb,
  CollectionName,
} from './mongoStore';

export { flushDb };

interface Schema {
  users: User[];
  userCredentials: { userId: string; passwordHash: string }[];
  conversations: Conversation[];
  messages: Message[];
  memories: Memory[];
  tasks: Task[];
  reminders: Reminder[];
  goals: Goal[];
  habits: Habit[];
  agentActions: AgentAction[];
  notifications: AppNotification[];
  confirmations: ConfirmationRequest[];
  ledger: LedgerEntry[];
}

const DB_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DB_DIR, 'recall.db.json');
let memoryDb: Schema | null = null;
let hasSyncedToMongo = false;

/** Ensure Mongo-backed reads do not race the asynchronous startup hydration. */
export async function ensureDbReady(): Promise<void> {
  if (!isMongoConfigured()) return;
  const store = await hydrateStore();
  if (!memoryDb) memoryDb = store as unknown as Schema;
}

/**
 * Prime the store. On Vercel (MONGODB_URI set) the dataset is hydrated from
 * Atlas via mongoStore; locally the JSON file remains the seed source.
 * Hydration is async, so we kick it off eagerly and the mirror fills in —
 * requests that arrive before hydration see an empty store and the client
 * retries / re-fetches (app already handles empty state gracefully).
 */
if (isMongoConfigured()) {
  hydrateStore()
    .then((store) => {
      memoryDb = store as unknown as Schema;
    })
    .catch(() => {});
}

function ensureDbFile(): Schema {
  if (memoryDb) return memoryDb;

  // Mongo mirror is the primary store when configured
  if (isMongoConfigured()) {
    memoryDb = getMirror() as unknown as Schema;
    return memoryDb;
  }

  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }

  if (fs.existsSync(DB_FILE)) {
    try {
      const content = fs.readFileSync(DB_FILE, 'utf-8');
      if (content && content.trim().length > 0) {
        const parsed = JSON.parse(content);
        parsed.users = parsed.users || [];
        parsed.userCredentials = parsed.userCredentials || [];
        parsed.conversations = parsed.conversations || [];
        parsed.messages = parsed.messages || [];
        parsed.memories = parsed.memories || [];
        parsed.tasks = parsed.tasks || [];
        parsed.reminders = parsed.reminders || [];
        parsed.goals = parsed.goals || [];
        parsed.habits = parsed.habits || [];
        parsed.agentActions = parsed.agentActions || [];
        parsed.notifications = parsed.notifications || [];
        parsed.confirmations = parsed.confirmations || [];
        parsed.ledger = parsed.ledger || [];
        memoryDb = parsed as Schema;
        
        // Sync to MongoDB in background once on startup if connection URI is provided
        if (!hasSyncedToMongo) {
          hasSyncedToMongo = true;
          syncInitialDataToMongo(memoryDb).catch(() => {});
        }
        return memoryDb;
      }
    } catch (err) {
      if (memoryDb) return memoryDb as Schema;
      console.error('Error reading DB file, reinitializing', err);
    }
  }

  if (memoryDb) return memoryDb as Schema;

  // Initial seed data
  const defaultUserId = 'usr_alex_01';
  const salt = bcrypt.genSaltSync(10);
  const passwordHash = bcrypt.hashSync('password123', salt);

  const initialData: Schema = {
    users: [
      {
        id: defaultUserId,
        email: 'alex@recall.ai',
        name: 'Alex Rivera',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
        preferences: {
          theme: 'light',
          aiProvider: 'builtin',
          model: 'Recall Core Ultra',
          voiceEnabled: true,
          voiceAutoRead: false,
          proactiveReminders: true,
          soundEffects: true,
          confirmDestructiveActions: true,
        },
      },
    ],
    userCredentials: [
      {
        userId: defaultUserId,
        passwordHash,
      },
    ],
    goals: [
      {
        id: 'goal_01',
        userId: defaultUserId,
        title: 'Launch SaaS Platform',
        description: 'Design, build, and deploy the next generation AI assistant SaaS product.',
        category: 'career',
        targetDate: new Date(Date.now() + 30 * 86400000).toISOString(),
        progress: 65,
        status: 'active',
        milestones: [
          { id: 'm_1', title: 'Complete MVP system architecture', completed: true },
          { id: 'm_2', title: 'Implement Money Ledger & Memory Vault', completed: true },
          { id: 'm_3', title: 'Launch beta user test group', completed: false, targetDate: new Date(Date.now() + 10 * 86400000).toISOString() },
        ],
        createdAt: new Date(Date.now() - 14 * 86400000).toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'goal_02',
        userId: defaultUserId,
        title: 'Run 10km Marathon',
        description: 'Train weekly endurance running and complete the city marathon.',
        category: 'health',
        targetDate: new Date(Date.now() + 60 * 86400000).toISOString(),
        progress: 40,
        status: 'active',
        milestones: [
          { id: 'm_4', title: '5km non-stop run milestone', completed: true },
          { id: 'm_5', title: '8km pacing test', completed: false },
          { id: 'm_6', title: 'Official 10k registration & race', completed: false },
        ],
        createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
        updatedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
      },
    ],
    memories: [
      {
        id: 'mem_01',
        userId: defaultUserId,
        content: 'I prefer simple, clean UI designs with minimal clutter and strong typography.',
        type: 'preference',
        category: 'Design',
        tags: ['ui', 'design', 'preferences'],
        confidence: 0.98,
        pinned: true,
        createdAt: new Date(Date.now() - 10 * 86400000).toISOString(),
        updatedAt: new Date(Date.now() - 10 * 86400000).toISOString(),
      },
      {
        id: 'mem_02',
        userId: defaultUserId,
        content: 'I use TypeScript and Next.js 15 for most of my modern web applications.',
        type: 'preference',
        category: 'Engineering',
        tags: ['typescript', 'nextjs', 'tech-stack'],
        confidence: 0.99,
        pinned: true,
        createdAt: new Date(Date.now() - 8 * 86400000).toISOString(),
        updatedAt: new Date(Date.now() - 8 * 86400000).toISOString(),
      },
      {
        id: 'mem_03',
        userId: defaultUserId,
        content: 'I need to submit my final project report on October 5.',
        type: 'important_date',
        category: 'Deadlines',
        tags: ['report', 'deadline', 'october-5'],
        confidence: 0.95,
        pinned: false,
        createdAt: new Date(Date.now() - 4 * 86400000).toISOString(),
        updatedAt: new Date(Date.now() - 4 * 86400000).toISOString(),
      },
      {
        id: 'mem_04',
        userId: defaultUserId,
        content: 'Whenever I finish a project, I need to update my resume with the tech stack and metrics.',
        type: 'instruction',
        category: 'Career',
        tags: ['resume', 'career', 'workflow'],
        confidence: 0.92,
        pinned: false,
        createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
        updatedAt: new Date(Date.now() - 3 * 86400000).toISOString(),
      },
    ],
    tasks: [
      {
        id: 'task_01',
        userId: defaultUserId,
        title: 'Deploy VideoVault v1 to Vercel production',
        description: 'Verify environment variables and connect custom domain.',
        status: 'in_progress',
        priority: 'high',
        dueDate: new Date(Date.now() + 2 * 86400000).toISOString(),
        projectId: 'proj_videovault_01',
        tags: ['deployment', 'videovault'],
        createdAt: new Date(Date.now() - 1 * 86400000).toISOString(),
      },
      {
        id: 'task_02',
        userId: defaultUserId,
        title: 'Prepare final project report for submission',
        description: 'Compile benchmark tests, architectural overview, and user feedback.',
        status: 'todo',
        priority: 'urgent',
        dueDate: new Date(new Date().getFullYear(), 9, 5, 17, 0, 0).toISOString(),
        tags: ['academic', 'report'],
        createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
      },
      {
        id: 'task_03',
        userId: defaultUserId,
        title: 'Review and merge GitHub pull requests in VideoVault',
        description: 'Check PR #14 on transcript caching.',
        status: 'todo',
        priority: 'medium',
        dueDate: new Date(Date.now() + 1 * 86400000).toISOString(),
        projectId: 'proj_videovault_01',
        tags: ['github', 'code-review'],
        createdAt: new Date().toISOString(),
      },
      {
        id: 'task_04',
        userId: defaultUserId,
        title: 'Set up automated test suite for Recall AI agent',
        description: 'Ensure memory retrieval and tool orchestrator tests pass.',
        status: 'completed',
        priority: 'high',
        completedAt: new Date(Date.now() - 12 * 3600000).toISOString(),
        tags: ['testing', 'agent'],
        createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
      },
    ],
    reminders: [
      {
        id: 'rem_01',
        userId: defaultUserId,
        title: 'Submit project report',
        dueDateTime: new Date(new Date().getFullYear(), 9, 5, 9, 0, 0).toISOString(),
        recurrence: 'none',
        priority: 'high',
        notes: 'Double check bibliography and PDF formatting.',
        status: 'pending',
        createdAt: new Date(Date.now() - 4 * 86400000).toISOString(),
      },
      {
        id: 'rem_02',
        userId: defaultUserId,
        title: 'Review GitHub repositories & pending commits',
        dueDateTime: new Date(Date.now() + 86400000).toISOString(),
        recurrence: 'weekly',
        priority: 'medium',
        notes: 'Weekly Sunday review of all active repositories.',
        status: 'pending',
        createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
      },
      {
        id: 'rem_03',
        userId: defaultUserId,
        title: 'Push code and update changelog',
        dueDateTime: new Date(Date.now() + 2 * 3600000).toISOString(),
        recurrence: 'none',
        priority: 'high',
        notes: 'Push latest agent tool updates to main branch.',
        status: 'pending',
        createdAt: new Date().toISOString(),
      },
    ],
    conversations: [
      {
        id: 'conv_welcome_01',
        userId: defaultUserId,
        title: 'Getting started with Recall AI',
        pinned: true,
        model: 'Recall Core Ultra',
        createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
        updatedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
      },
    ],
    messages: [
      {
        id: 'msg_01',
        conversationId: 'conv_welcome_01',
        userId: defaultUserId,
        role: 'assistant',
        content: ` **Welcome to Recall AI**, your personal AI assistant with persistent memory and intelligent tool execution.

I can help you manage your daily workflow naturally. Here are a few things you can try:

* **Memory**: *"Remember that I prefer TypeScript and simple UI designs."*
* **Reminders**: *"Remind me tomorrow at 9 AM to submit the report."*
* **Tasks**: *"Add a task to deploy VideoVault."* or *"Show my unfinished tasks."*
* **GitHub**: *"Check my GitHub commits and prepare a PR summary."*
* **Search & Context**: *"What is pending in my VideoVault project?"*

How can I assist you today?`,
        createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
      },
    ],
    agentActions: [
      {
        id: 'act_01',
        userId: defaultUserId,
        conversationId: 'conv_welcome_01',
        toolName: 'MemoryTool',
        action: 'saveMemory',
        summary: 'Stored user preference for simple UI designs and Next.js tech stack.',
        status: 'success',
        permissionLevel: 'WRITE',
        createdAt: new Date(Date.now() - 8 * 86400000).toISOString(),
      },
      {
        id: 'act_02',
        userId: defaultUserId,
        conversationId: 'conv_welcome_01',
        toolName: 'TaskTool',
        action: 'createTask',
        summary: 'Created high-priority task for VideoVault Vercel deployment.',
        status: 'success',
        permissionLevel: 'WRITE',
        createdAt: new Date(Date.now() - 1 * 86400000).toISOString(),
      },
    ],
    notifications: [
      {
        id: 'notif_01',
        userId: defaultUserId,
        title: 'Upcoming Reminder',
        message: 'Push code and update changelog in 2 hours.',
        type: 'reminder',
        read: false,
        actionUrl: '/reminders',
        createdAt: new Date().toISOString(),
      },
    ],
    confirmations: [],
    habits: [],
    ledger: [],
  };

  fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2), 'utf-8');
  memoryDb = initialData;
  return memoryDb;
}

let persistTimer: NodeJS.Timeout | null = null;
let isWriting = false;

/**
 * Persist the last-mutated documents.
 *  - Mongo mode: individual docs are persisted via persistDoc() at each call
 *    site (see persistDocs below); persistDb only flushes the local JSON as a
 *    best-effort debug artifact.
 *  - Local mode: debounced full-file write (original behavior).
 */
function persistDb(): void {
  if (!memoryDb) return;
  if (isMongoConfigured()) return; // write-through handled per-document
  if (persistTimer) clearTimeout(persistTimer);

  persistTimer = setTimeout(async () => {
    if (isWriting || !memoryDb) return;
    isWriting = true;
    try {
      const dataStr = JSON.stringify(memoryDb);
      await fs.promises.writeFile(DB_FILE, dataStr, 'utf-8');
    } catch (err) {
      console.error('Failed to persist database:', err);
    } finally {
      isWriting = false;
    }
  }, 100);
}

/**
 * Fire-and-forget write-through of mutated docs to Atlas.
 * Called from mutating db methods with the affected collection(s).
 */
function persistDocs(collection: CollectionName, docs: any | any[]): void {
  if (!isMongoConfigured()) return;
  const arr = Array.isArray(docs) ? docs : [docs];
  arr.forEach((d) => persistDoc(collection, d));
}

function deleteFromStore(collection: CollectionName, key: string | number): void {
  if (!isMongoConfigured()) return;
  deleteDoc(collection, key);
}

export const db = {
  // --- USERS ---
  getAllUsers(): User[] {
    const data = ensureDbFile();
    return data.users;
  },

  getUserById(id: string): User | null {
    const data = ensureDbFile();
    return data.users.find((u) => u.id === id) || null;
  },

  getUserByEmail(email: string): User | null {
    const data = ensureDbFile();
    return data.users.find((u) => u.email.toLowerCase() === email.toLowerCase()) || null;
  },

  getUserCredentials(userId: string): { passwordHash: string } | null {
    const data = ensureDbFile();
    return data.userCredentials.find((c) => c.userId === userId) || null;
  },

  createUser(user: User, passwordHash: string): User {
    const data = ensureDbFile();
    data.users.push(user);
    data.userCredentials.push({ userId: user.id, passwordHash });
    persistDb();
    persistDocs('users', user);
    persistDocs('userCredentials', { userId: user.id, passwordHash });
    return user;
  },

  updateUser(userId: string, patch: Partial<User>): User | null {
    const data = ensureDbFile();
    let user = data.users.find((u) => u.id === userId);
    if (!user && data.users.length > 0) {
      user = data.users[0];
    }
    if (!user) return null;
    if (patch.name !== undefined) user.name = patch.name;
    if (patch.email !== undefined) user.email = patch.email;
    if (patch.avatar !== undefined) user.avatar = patch.avatar;
    if (patch.preferences) {
      user.preferences = { ...user.preferences, ...patch.preferences };
    }
    data.users.forEach((u) => {
      if (patch.name !== undefined) u.name = patch.name;
      if (patch.email !== undefined) u.email = patch.email;
      if (patch.avatar !== undefined) u.avatar = patch.avatar;
      if (patch.preferences) u.preferences = { ...u.preferences, ...patch.preferences };
    });
    persistDb();
    persistDocs('users', data.users);
    return user;
  },

  updateUserPreferences(userId: string, prefs: Partial<User['preferences']>): User | null {
    const data = ensureDbFile();
    let user = data.users.find((u) => u.id === userId);
    if (!user && data.users.length > 0) {
      user = data.users[0];
    }
    if (!user) return null;
    user.preferences = { ...user.preferences, ...prefs };
    data.users.forEach((u) => {
      u.preferences = { ...u.preferences, ...prefs };
    });
    persistDb();
    persistDocs('users', data.users);
    return user;
  },

  deleteUser(userId: string): boolean {
    const data = ensureDbFile();
    const initialLen = data.users.length;
    data.users = data.users.filter((u) => u.id !== userId);
    data.userCredentials = data.userCredentials.filter((c) => c.userId !== userId);
    persistDb();
    deleteFromStore('users', userId);
    return data.users.length < initialLen;
  },

  // --- CONVERSATIONS ---
  getConversations(userId: string): Conversation[] {
    const data = ensureDbFile();
    const isGuest = !userId || userId === 'usr_default_main' || userId.includes('guest');
    return data.conversations
      .filter((c) => c.userId === userId || (isGuest && (!c.userId || c.userId === 'usr_default_main' || c.userId.includes('guest'))))
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .map((c) => {
        const msgs = data.messages.filter((m) => m.conversationId === c.id);
        const lastMsg = msgs[msgs.length - 1];
        return {
          ...c,
          messageCount: msgs.length,
          lastMessageSnippet: lastMsg ? lastMsg.content.slice(0, 75) : undefined,
        };
      });
  },

  getConversationById(id: string, userId: string): Conversation | null {
    const data = ensureDbFile();
    let conv = data.conversations.find((c) => c.id === id && c.userId === userId);
    if (!conv) {
      conv = data.conversations.find((c) => c.id === id);
      if (conv) {
        conv.userId = userId;
        persistDb();
        persistDocs('conversations', conv);
      }
    }
    return conv || null;
  },

  createConversation(conv: Conversation): Conversation {
    const data = ensureDbFile();
    data.conversations.unshift(conv);
    persistDb();
    persistDocs('conversations', conv);
    return conv;
  },

  updateConversation(id: string, userId: string, patch: Partial<Conversation>): Conversation | null {
    const data = ensureDbFile();
    let idx = data.conversations.findIndex((c) => c.id === id && c.userId === userId);
    if (idx === -1) {
      idx = data.conversations.findIndex((c) => c.id === id);
    }
    if (idx === -1) return null;
    data.conversations[idx] = { ...data.conversations[idx], ...patch, userId, updatedAt: new Date().toISOString() };
    persistDb();
    persistDocs('conversations', data.conversations[idx]);
    return data.conversations[idx];
  },

  deleteConversation(id: string, userId: string): boolean {
    const data = ensureDbFile();
    const initialLen = data.conversations.length;
    const removed = data.conversations.find((c) => c.id === id && (c.userId === userId || !c.userId));
    data.conversations = data.conversations.filter((c) => c.id !== id);
    data.messages = data.messages.filter((m) => m.conversationId !== id);
    persistDb();
    if (removed) deleteFromStore('conversations', id);
    return data.conversations.length < initialLen;
  },

  // --- MESSAGES ---
  getMessages(conversationId: string): Message[] {
    const data = ensureDbFile();
    return data.messages
      .filter((m) => m.conversationId === conversationId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  },

  createMessage(msg: Message): Message {
    const data = ensureDbFile();
    data.messages.push(msg);

    // update conversation updatedAt
    const conv = data.conversations.find((c) => c.id === msg.conversationId);
    if (conv) {
      conv.updatedAt = new Date().toISOString();
      persistDocs('conversations', conv);
    }

    persistDb();
    persistDocs('messages', msg);
    return msg;
  },

  deleteMessage(messageId: string): boolean {
    const data = ensureDbFile();
    data.messages = data.messages.filter((m) => m.id !== messageId);
    persistDb();
    deleteFromStore('messages', messageId);
    return true;
  },

  // --- MEMORIES ---
  getMemories(userId: string): Memory[] {
    const data = ensureDbFile();
    data.memories = data.memories || [];
    const list = data.memories.filter((m) => m && (m.userId === userId || !m.userId || userId === 'usr_primary_default' || userId === 'guest_instant'));
    return list
      .sort((a, b) => {
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      });
  },

  getMemoryById(id: string, userId: string): Memory | null {
    const data = ensureDbFile();
    data.memories = data.memories || [];
    return data.memories.find((m) => m.id === id && (m.userId === userId || !m.userId || userId === 'usr_primary_default' || userId === 'guest_instant')) || data.memories.find((m) => m.id === id) || null;
  },

  saveMemory(memory: Memory): Memory {
    const data = ensureDbFile();
    const existingIndex = data.memories.findIndex(
      (m) => (m.userId === memory.userId || !m.userId) && m.content.toLowerCase() === memory.content.toLowerCase()
    );
    if (existingIndex >= 0) {
      data.memories[existingIndex] = { ...data.memories[existingIndex], ...memory, updatedAt: new Date().toISOString() };
      persistDb();
      persistDocs('memories', data.memories[existingIndex]);
      return data.memories[existingIndex];
    }
    data.memories.unshift(memory);
    persistDb();
    persistDocs('memories', memory);
    return memory;
  },

  updateMemory(id: string, userId: string, patch: Partial<Memory>): Memory | null {
    const data = ensureDbFile();
    const idx = data.memories.findIndex((m) => m.id === id);
    if (idx === -1) return null;
    data.memories[idx] = { ...data.memories[idx], ...patch, updatedAt: new Date().toISOString() };
    persistDb();
    persistDocs('memories', data.memories[idx]);
    return data.memories[idx];
  },

  deleteMemory(id: string, userId: string): boolean {
    const data = ensureDbFile();
    const initialLen = data.memories.length;
    data.memories = data.memories.filter((m) => m.id !== id);
    persistDb();
    deleteFromStore('memories', id);
    return data.memories.length < initialLen;
  },

  forgetMemoriesByTopic(topic: string, userId: string): number {
    const data = ensureDbFile();
    const q = topic.toLowerCase();
    const initialLen = data.memories.length;
    data.memories = data.memories.filter(
      (m) =>
        !m.content.toLowerCase().includes(q) &&
        !m.tags.some((t) => t.toLowerCase().includes(q)) &&
        m.category?.toLowerCase() !== q
    );
    const removedCount = initialLen - data.memories.length;
    persistDb();
    return removedCount;
  },

  // --- TASKS ---
  getTasks(userId: string): Task[] {
    const data = ensureDbFile();
    data.tasks = data.tasks || [];
    const list = data.tasks.filter((t) => t && (t.userId === userId || !t.userId || userId === 'usr_primary_default' || userId === 'guest_instant'));
    return list
      .sort((a, b) => {
        // incomplete first, then priority, then createdAt
        const statusWeight = { in_progress: 0, todo: 1, completed: 2, cancelled: 3 };
        if (statusWeight[a.status] !== statusWeight[b.status]) {
          return statusWeight[a.status] - statusWeight[b.status];
        }
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  },

  getTaskById(id: string, userId: string): Task | null {
    const data = ensureDbFile();
    data.tasks = data.tasks || [];
    return data.tasks.find((t) => t.id === id && (t.userId === userId || !t.userId || userId === 'usr_primary_default' || userId === 'guest_instant')) || data.tasks.find((t) => t.id === id) || null;
  },

  createTask(task: Task): Task {
    const data = ensureDbFile();
    data.tasks = data.tasks || [];
    data.tasks.unshift(task);
    persistDb();
    persistDocs('tasks', task);
    return task;
  },

  updateTask(id: string, userId: string, patch: Partial<Task>): Task | null {
    const data = ensureDbFile();
    data.tasks = data.tasks || [];
    let idx = data.tasks.findIndex((t) => t.id === id && (t.userId === userId || !t.userId || userId === 'usr_primary_default' || userId === 'guest_instant'));
    if (idx === -1) {
      idx = data.tasks.findIndex((t) => t.id === id);
    }
    if (idx === -1) return null;
    if (patch.status === 'completed' && !patch.completedAt) {
      patch.completedAt = new Date().toISOString();
    }
    data.tasks[idx] = { ...data.tasks[idx], ...patch };
    persistDb();
    persistDocs('tasks', data.tasks[idx]);
    return data.tasks[idx];
  },

  deleteTask(id: string, userId: string): boolean {
    const data = ensureDbFile();
    data.tasks = data.tasks || [];
    const initialLen = data.tasks.length;
    data.tasks = data.tasks.filter((t) => t.id !== id);
    persistDb();
    deleteFromStore('tasks', id);
    return data.tasks.length < initialLen;
  },

  // --- REMINDERS ---
  getReminders(userId: string): Reminder[] {
    const data = ensureDbFile();
    data.reminders = data.reminders || [];
    const list = data.reminders.filter((r) => r && (r.userId === userId || !r.userId || userId === 'usr_primary_default' || userId === 'guest_instant'));
    return list
      .sort((a, b) => {
        const timeA = a.dueDateTime ? new Date(a.dueDateTime).getTime() : 0;
        const timeB = b.dueDateTime ? new Date(b.dueDateTime).getTime() : 0;
        return timeA - timeB;
      });
  },

  createReminder(reminder: Reminder): Reminder {
    const data = ensureDbFile();
    data.reminders = data.reminders || [];
    data.reminders.unshift(reminder);
    persistDb();
    persistDocs('reminders', reminder);
    return reminder;
  },

  updateReminder(id: string, userId: string, patch: Partial<Reminder>): Reminder | null {
    const data = ensureDbFile();
    data.reminders = data.reminders || [];
    let idx = data.reminders.findIndex((r) => r.id === id);
    if (idx === -1) {
      const newReminder: Reminder = {
        id,
        userId: userId || 'default_user',
        title: patch.title || 'Reminder',
        dueDateTime: patch.dueDateTime || new Date().toISOString(),
        recurrence: (patch.recurrence as any) || 'none',
        status: (patch.status as any) || 'pending',
        notes: patch.notes,
        priority: patch.priority || 'medium',
        createdAt: patch.createdAt || new Date().toISOString(),
      };
      data.reminders.unshift(newReminder);
      persistDb();
      return newReminder;
    }
    data.reminders[idx] = { ...data.reminders[idx], ...patch };
    persistDb();
    persistDocs('reminders', data.reminders[idx]);
    return data.reminders[idx];
  },

  deleteReminder(id: string, userId: string): boolean {
    const data = ensureDbFile();
    data.reminders = data.reminders || [];
    const initialLen = data.reminders.length;
    data.reminders = data.reminders.filter((r) => r.id !== id);
    persistDb();
    deleteFromStore('reminders', id);
    return data.reminders.length < initialLen;
  },

  // --- GOALS & MILESTONES ---
  getGoals(userId: string): Goal[] {
    const data = ensureDbFile();
    data.goals = data.goals || [];
    const list = data.goals.filter((g) => g && (g.userId === userId || !g.userId || userId === 'usr_primary_default' || userId === 'guest_instant'));
    return list
      .sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime());
  },

  getGoalById(id: string, userId: string): Goal | null {
    const data = ensureDbFile();
    data.goals = data.goals || [];
    return data.goals.find((g) => g.id === id && (g.userId === userId || !g.userId || userId === 'usr_primary_default' || userId === 'guest_instant')) || data.goals.find((g) => g.id === id) || null;
  },

  createGoal(goal: Goal): Goal {
    const data = ensureDbFile();
    data.goals = data.goals || [];
    data.goals.unshift(goal);
    persistDb();
    syncEntityToMongo('goal', 'upsert', goal).catch(() => {});
    persistDocs('goals', goal);
    return goal;
  },

  updateGoal(id: string, userId: string, patch: Partial<Goal>): Goal | null {
    const data = ensureDbFile();
    data.goals = data.goals || [];
    let idx = data.goals.findIndex((g) => g.id === id && (g.userId === userId || !g.userId || userId === 'usr_primary_default' || userId === 'guest_instant'));
    if (idx === -1) {
      idx = data.goals.findIndex((g) => g.id === id);
    }
    if (idx === -1) return null;
    data.goals[idx] = { ...data.goals[idx], ...patch, updatedAt: new Date().toISOString() };
    persistDb();
    syncEntityToMongo('goal', 'upsert', data.goals[idx]).catch(() => {});
    persistDocs('goals', data.goals[idx]);
    return data.goals[idx];
  },

  toggleGoalMilestone(goalId: string, milestoneId: string, userId: string): Goal | null {
    const data = ensureDbFile();
    data.goals = data.goals || [];
    const goal = data.goals.find((g) => g.id === goalId && (g.userId === userId || !g.userId || userId === 'usr_primary_default' || userId === 'guest_instant')) || data.goals.find((g) => g.id === goalId);
    if (!goal || !goal.milestones) return null;
    const m = goal.milestones.find((ms) => ms.id === milestoneId);
    if (m) {
      m.completed = !m.completed;
      const total = goal.milestones.length;
      const completedCount = goal.milestones.filter((ms) => ms.completed).length;
      goal.progress = total > 0 ? Math.round((completedCount / total) * 100) : 0;
      if (goal.progress === 100) {
        goal.status = 'completed';
      } else if (goal.status === 'completed' && goal.progress < 100) {
        goal.status = 'active';
      }
      goal.updatedAt = new Date().toISOString();
      persistDb();
      syncEntityToMongo('goal', 'upsert', goal).catch(() => {});
      persistDocs('goals', goal);
    }
    return goal;
  },

  deleteGoal(id: string, userId: string): boolean {
    const data = ensureDbFile();
    data.goals = data.goals || [];
    const initialLen = data.goals.length;
    data.goals = data.goals.filter((g) => g.id !== id);
    persistDb();
    syncEntityToMongo('goal', 'delete', { id }).catch(() => {});
    deleteFromStore('goals', id);
    return data.goals.length < initialLen;
  },

  // --- AGENT ACTIONS / AUDIT LOG ---
  getAgentActions(userId: string, limit = 50): AgentAction[] {
    const data = ensureDbFile();
    return data.agentActions
      .filter((a) => a.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
  },

  logAgentAction(action: AgentAction): AgentAction {
    const data = ensureDbFile();
    data.agentActions.unshift(action);
    persistDb();
    persistDocs('agentActions', action);
    return action;
  },

  // --- NOTIFICATIONS ---
  getNotifications(userId: string): AppNotification[] {
    const data = ensureDbFile();
    data.notifications = data.notifications || [];
    return data.notifications
      .filter((n) => n && (n.userId === userId || !n.userId || userId === 'usr_primary_default' || userId === 'guest_instant'))
      .sort((a, b) => {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeB - timeA;
      });
  },

  createNotification(notif: AppNotification): AppNotification {
    const data = ensureDbFile();
    data.notifications.unshift(notif);
    persistDb();
    persistDocs('notifications', notif);
    return notif;
  },

  markNotificationRead(id: string, userId: string): boolean {
    const data = ensureDbFile();
    let notif = data.notifications.find((n) => n.id === id && (n.userId === userId || !n.userId || userId === 'usr_primary_default' || userId === 'guest_instant'));
    if (!notif) {
      notif = data.notifications.find((n) => n.id === id);
    }
    if (notif) {
      notif.read = true;
      persistDb();
      persistDocs('notifications', notif);
      return true;
    }
    return false;
  },

  markAllNotificationsRead(userId: string): boolean {
    const data = ensureDbFile();
    const affected = data.notifications.filter((n) => n.userId === userId || !n.userId || userId === 'usr_primary_default' || userId === 'guest_instant');
    affected.forEach((n) => {
      n.read = true;
    });
    persistDb();
    persistDocs('notifications', affected);
    return true;
  },

  deleteNotification(id: string, userId: string): boolean {
    const data = ensureDbFile();
    const prevLen = data.notifications.length;
    data.notifications = data.notifications.filter((n) => n.id !== id);
    persistDb();
    deleteFromStore('notifications', id);
    return data.notifications.length < prevLen;
  },

  clearAllNotifications(userId: string): boolean {
    const data = ensureDbFile();
    const removed = data.notifications.filter((n) => n.userId === userId || !n.userId || userId === 'usr_primary_default' || userId === 'guest_instant');
    data.notifications = data.notifications.filter((n) => !(n.userId === userId || !n.userId || userId === 'usr_primary_default' || userId === 'guest_instant'));
    persistDb();
    removed.forEach((n) => deleteFromStore('notifications', n.id));
    return true;
  },

  // --- CONFIRMATIONS ---
  createConfirmation(conf: ConfirmationRequest): ConfirmationRequest {
    const data = ensureDbFile();
    data.confirmations.push(conf);
    persistDb();
    persistDocs('confirmations', conf);
    return conf;
  },

  getConfirmation(id: string): ConfirmationRequest | null {
    const data = ensureDbFile();
    return data.confirmations.find((c) => c.id === id) || null;
  },

  resolveConfirmation(id: string, status: 'approved' | 'rejected'): ConfirmationRequest | null {
    const data = ensureDbFile();
    const conf = data.confirmations.find((c) => c.id === id);
    if (!conf) return null;
    conf.status = status;
    persistDb();
    persistDocs('confirmations', conf);
    return conf;
  },

  // --- HABITS ---
  getHabits(userId: string): Habit[] {
    const data = ensureDbFile();
    data.habits = data.habits || [];
    return data.habits.filter((h) => h && (h.userId === userId || !h.userId || userId === 'usr_primary_default' || userId === 'guest_instant'));
  },

  createHabit(habit: Habit): Habit {
    const data = ensureDbFile();
    data.habits = data.habits || [];
    data.habits.push(habit);
    persistDb();
    persistDocs('habits', habit);
    return habit;
  },

  toggleHabit(id: string, userId: string): Habit | null {
    const data = ensureDbFile();
    data.habits = data.habits || [];
    const habit = data.habits.find((h) => h.id === id && (h.userId === userId || !h.userId || userId === 'usr_primary_default' || userId === 'guest_instant')) || data.habits.find((h) => h.id === id);
    if (!habit) return null;

    const todayStr = new Date().toISOString().split('T')[0];
    const isCompletedToday = habit.lastCompletedDate === todayStr;

    if (isCompletedToday) {
      habit.streak = Math.max(0, habit.streak - 1);
      habit.lastCompletedDate = undefined;
      habit.history = habit.history.filter((d) => d !== todayStr);
    } else {
      habit.streak += 1;
      habit.lastCompletedDate = todayStr;
      if (!habit.history.includes(todayStr)) {
        habit.history.push(todayStr);
      }
    }

    persistDb();
    persistDocs('habits', habit);
    return habit;
  },

  updateHabit(id: string, userId: string, patch: Partial<Habit>): Habit | null {
    const data = ensureDbFile();
    data.habits = data.habits || [];
    let idx = data.habits.findIndex((h) => h.id === id && (h.userId === userId || !h.userId || userId === 'usr_primary_default' || userId === 'guest_instant'));
    if (idx === -1) {
      idx = data.habits.findIndex((h) => h.id === id);
    }
    if (idx === -1) return null;
    data.habits[idx] = { ...data.habits[idx], ...patch };
    persistDb();
    persistDocs('habits', data.habits[idx]);
    return data.habits[idx];
  },

  deleteHabit(id: string, userId: string): boolean {
    const data = ensureDbFile();
    data.habits = data.habits || [];
    const initialLen = data.habits.length;
    data.habits = data.habits.filter((h) => h.id !== id);
    persistDb();
    deleteFromStore('habits', id);
    return data.habits.length < initialLen;
  },

  // --- SUBTASKS ---
  setTaskSubtasks(taskId: string, userId: string, subtasks: SubTask[]): Task | null {
    const data = ensureDbFile();
    const task = data.tasks.find((t) => t.id === taskId && (t.userId === userId || !t.userId || userId === 'usr_primary_default' || userId === 'guest_instant')) || data.tasks.find((t) => t.id === taskId);
    if (!task) return null;
    task.subtasks = subtasks;
    persistDb();
    persistDocs('tasks', task);
    return task;
  },

  toggleSubTask(taskId: string, subtaskId: string, userId: string): Task | null {
    const data = ensureDbFile();
    const task = data.tasks.find((t) => t.id === taskId && (t.userId === userId || !t.userId || userId === 'usr_primary_default' || userId === 'guest_instant')) || data.tasks.find((t) => t.id === taskId);
    if (!task || !task.subtasks) return null;
    const sub = task.subtasks.find((s) => s.id === subtaskId);
    if (sub) {
      sub.completed = !sub.completed;
      // Auto complete parent if all subtasks complete
      const allDone = task.subtasks.length > 0 && task.subtasks.every((s) => s.completed);
      if (allDone) {
        task.status = 'completed';
        task.completedAt = new Date().toISOString();
      }
    }
    persistDb();
    persistDocs('tasks', task);
    return task;
  },

  // --- MONEY LEDGER / DUES (WHO TO GIVE / WHO OWES ME) ---
  getLedgerEntries(userId: string): LedgerEntry[] {
    const data = ensureDbFile();
    data.ledger = data.ledger || [];
    const list = data.ledger.filter((l) => l && (l.userId === userId || !l.userId || userId === 'usr_primary_default' || userId === 'guest_instant'));
    return list
      .sort((a, b) => {
        // Pending first, then by date
        if (a.status !== b.status) {
          return a.status === 'pending' ? -1 : 1;
        }
        const timeA = a.dueDate ? new Date(a.dueDate).getTime() : new Date(a.createdAt).getTime();
        const timeB = b.dueDate ? new Date(b.dueDate).getTime() : new Date(b.createdAt).getTime();
        return timeA - timeB;
      });
  },

  createLedgerEntry(entry: LedgerEntry): LedgerEntry {
    const data = ensureDbFile();
    data.ledger = data.ledger || [];
    data.ledger.unshift(entry);
    persistDb();
    syncEntityToMongo('ledger', 'upsert', entry).catch(() => {});
    persistDocs('ledger', entry);
    return entry;
  },

  updateLedgerEntry(id: string, userId: string, patch: Partial<LedgerEntry>): LedgerEntry | null {
    const data = ensureDbFile();
    data.ledger = data.ledger || [];
    let idx = data.ledger.findIndex((l) => l.id === id && (l.userId === userId || !l.userId || userId === 'usr_primary_default' || userId === 'guest_instant'));
    if (idx === -1) {
      idx = data.ledger.findIndex((l) => l.id === id);
    }
    if (idx === -1) return null;
    data.ledger[idx] = { ...data.ledger[idx], ...patch, updatedAt: new Date().toISOString() };
    persistDb();
    syncEntityToMongo('ledger', 'upsert', data.ledger[idx]).catch(() => {});
    persistDocs('ledger', data.ledger[idx]);
    return data.ledger[idx];
  },

  settleLedgerEntry(id: string, userId: string): LedgerEntry | null {
    const data = ensureDbFile();
    data.ledger = data.ledger || [];
    let idx = data.ledger.findIndex((l) => l.id === id && (l.userId === userId || !l.userId || userId === 'usr_primary_default' || userId === 'guest_instant'));
    if (idx === -1) {
      idx = data.ledger.findIndex((l) => l.id === id);
    }
    if (idx === -1) return null;
    const now = new Date().toISOString();
    data.ledger[idx].status = 'settled';
    data.ledger[idx].paidAmount = data.ledger[idx].amount;
    data.ledger[idx].settledAt = now;
    data.ledger[idx].updatedAt = now;
    persistDb();
    syncEntityToMongo('ledger', 'upsert', data.ledger[idx]).catch(() => {});
    persistDocs('ledger', data.ledger[idx]);
    return data.ledger[idx];
  },

  recordPartialPayment(id: string, userId: string, paymentAmount: number, note?: string): LedgerEntry | null {
    const data = ensureDbFile();
    data.ledger = data.ledger || [];
    let idx = data.ledger.findIndex((l) => l.id === id && (l.userId === userId || !l.userId || userId === 'usr_primary_default' || userId === 'guest_instant'));
    if (idx === -1) {
      idx = data.ledger.findIndex((l) => l.id === id);
    }
    if (idx === -1) return null;

    const entry = data.ledger[idx];
    const currentPaid = entry.paidAmount || 0;
    const newPaid = Math.min(entry.amount, currentPaid + Math.max(0, paymentAmount));
    const now = new Date().toISOString();

    const paymentRecord = {
      id: `pay_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      amount: paymentAmount,
      date: now,
      note: note?.trim() || undefined,
    };

    const isFullyPaid = newPaid >= entry.amount;

    data.ledger[idx] = {
      ...entry,
      paidAmount: newPaid,
      payments: [...(entry.payments || []), paymentRecord],
      status: isFullyPaid ? 'settled' : 'pending',
      settledAt: isFullyPaid ? now : entry.settledAt,
      updatedAt: now,
    };

    persistDb();
    syncEntityToMongo('ledger', 'upsert', data.ledger[idx]).catch(() => {});
    persistDocs('ledger', data.ledger[idx]);
    return data.ledger[idx];
  },

  deleteLedgerEntry(id: string, userId: string): boolean {
    const data = ensureDbFile();
    data.ledger = data.ledger || [];
    const initialLen = data.ledger.length;
    data.ledger = data.ledger.filter((l) => l.id !== id);
    persistDb();
    syncEntityToMongo('ledger', 'delete', { id }).catch(() => {});
    deleteFromStore('ledger', id);
    return data.ledger.length < initialLen;
  },

  // --- DATA OWNERSHIP / EXPORT / IMPORT / WIPE ---
  exportUserData(userId: string): Record<string, any> {
    const data = ensureDbFile();
    return {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      user: data.users.find((u) => u.id === userId),
      conversations: data.conversations.filter((c) => c.userId === userId),
      messages: data.messages.filter((m) => m.userId === userId),
      memories: data.memories.filter((m) => m.userId === userId),
      tasks: data.tasks.filter((t) => t.userId === userId),
      reminders: data.reminders.filter((r) => r.userId === userId),
      goals: (data.goals || []).filter((g) => g.userId === userId),
      habits: (data.habits || []).filter((h) => h.userId === userId),
      ledger: (data.ledger || []).filter((l) => l.userId === userId),
      agentActions: data.agentActions.filter((a) => a.userId === userId),
    };
  },

  importUserData(userId: string, backupData: any): { imported: Record<string, number> } {
    const data = ensureDbFile();
    const imported: Record<string, number> = {
      conversations: 0,
      messages: 0,
      memories: 0,
      tasks: 0,
      reminders: 0,
      goals: 0,
      habits: 0,
      ledger: 0,
    };

    if (!backupData || typeof backupData !== 'object') {
      return { imported };
    }

    const mergeCollection = (collectionKey: keyof Schema, storeName: CollectionName) => {
      const items = Array.isArray(backupData[collectionKey]) ? backupData[collectionKey] : [];
      const currentList = (data[collectionKey] as any[]) || [];
      const addedOrUpdated: any[] = [];

      items.forEach((item: any) => {
        if (!item || !item.id) return;
        const normalized = { ...item, userId };
        const idx = currentList.findIndex((existing: any) => existing.id === normalized.id);
        if (idx >= 0) {
          currentList[idx] = normalized;
        } else {
          currentList.push(normalized);
        }
        addedOrUpdated.push(normalized);
      });

      (data as any)[collectionKey] = currentList;
      imported[collectionKey as string] = addedOrUpdated.length;
      if (addedOrUpdated.length > 0) {
        persistDocs(storeName, addedOrUpdated);
      }
    };

    mergeCollection('conversations', 'conversations');
    mergeCollection('messages', 'messages');
    mergeCollection('memories', 'memories');
    mergeCollection('tasks', 'tasks');
    mergeCollection('reminders', 'reminders');
    mergeCollection('goals', 'goals');
    mergeCollection('habits', 'habits');
    mergeCollection('ledger', 'ledger');

    persistDb();
    return { imported };
  },

  wipeUserData(userId: string): boolean {
    const data = ensureDbFile();
    const convs = data.conversations.filter((c) => c.userId === userId);
    const msgs = data.messages.filter((m) => m.userId === userId);
    const mems = data.memories.filter((m) => m.userId === userId);
    const tsks = data.tasks.filter((t) => t.userId === userId);
    const rems = data.reminders.filter((r) => r.userId === userId);
    const gls = (data.goals || []).filter((g) => g.userId === userId);
    const hbts = (data.habits || []).filter((h) => h.userId === userId);
    const ldg = (data.ledger || []).filter((l) => l.userId === userId);
    const acts = data.agentActions.filter((a) => a.userId === userId);
    const nots = data.notifications.filter((n) => n.userId === userId);
    data.conversations = data.conversations.filter((c) => c.userId !== userId);
    data.messages = data.messages.filter((m) => m.userId !== userId);
    data.memories = data.memories.filter((m) => m.userId !== userId);
    data.tasks = data.tasks.filter((t) => t.userId !== userId);
    data.reminders = data.reminders.filter((r) => r.userId !== userId);
    data.goals = (data.goals || []).filter((g) => g.userId !== userId);
    data.habits = (data.habits || []).filter((h) => h.userId !== userId);
    data.ledger = (data.ledger || []).filter((l) => l.userId !== userId);
    data.agentActions = data.agentActions.filter((a) => a.userId !== userId);
    data.notifications = data.notifications.filter((n) => n.userId !== userId);
    persistDb();
    convs.forEach((d) => deleteFromStore('conversations', d.id));
    msgs.forEach((d) => deleteFromStore('messages', d.id));
    mems.forEach((d) => deleteFromStore('memories', d.id));
    tsks.forEach((d) => deleteFromStore('tasks', d.id));
    rems.forEach((d) => deleteFromStore('reminders', d.id));
    gls.forEach((d) => deleteFromStore('goals', d.id));
    hbts.forEach((d) => deleteFromStore('habits', d.id));
    ldg.forEach((d) => deleteFromStore('ledger', d.id));
    acts.forEach((d) => deleteFromStore('agentActions', d.id));
    nots.forEach((d) => deleteFromStore('notifications', d.id));
    return true;
  },
};
