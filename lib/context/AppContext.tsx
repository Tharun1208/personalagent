'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
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
  LedgerEntry,
} from '@/types';
import {
  isGuestEmail,
  GUEST_PROMPT_LIMIT,
  readGuestPromptCount,
  incrementGuestPromptCount,
  resetGuestPromptCount,
  markGuestSession,
  GUEST_PROMPT_COUNT_KEY,
} from '@/lib/guest';
import {
  scheduleNotifications,
  cancelNotification,
  notificationIdFromString,
  ScheduledItem,
} from '@/lib/notifications/scheduler';

export type AppTab =
  | 'chat'
  | 'calendar'
  | 'habits'
  | 'tasks'
  | 'reminders'
  | 'goals'
  | 'ledger'
  | 'actions'
  | 'dashboard'
  | 'apps'
  | 'settings';

export const VALID_TABS: AppTab[] = [
  'chat',
  'calendar',
  'habits',
  'tasks',
  'reminders',
  'goals',
  'ledger',
  'actions',
  'dashboard',
  'apps',
  'settings',
];

export function isValidTab(tab: any): tab is AppTab {
  return typeof tab === 'string' && VALID_TABS.includes(tab as AppTab);
}

interface AppContextType {
  user: User | null;
  isGuest: boolean;
  guestPromptsUsed: number;
  guestPromptLimit: number;
  continueAsGuest: () => Promise<void>;
  signOut: () => Promise<void>;
  theme: 'light' | 'dark';
  setTheme: (t: 'light' | 'dark') => void;
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
  conversations: Conversation[];
  activeConversationId: string | null;
  setActiveConversationId: (id: string | null) => void;
  currentConversation: Conversation | null;
  messages: Message[];
  isSending: boolean;
  memories: Memory[];
  tasks: Task[];
  reminders: Reminder[];
  goals: Goal[];
  ledgerEntries: LedgerEntry[];
  agentActions: AgentAction[];
  notifications: AppNotification[];
  unreadNotificationCount: number;
  commandPaletteOpen: boolean;
  setCommandPaletteOpen: (open: boolean) => void;
  notificationDrawerOpen: boolean;
  setNotificationDrawerOpen: (open: boolean) => void;
  liveVoiceOpen: boolean;
  setLiveVoiceOpen: (open: boolean) => void;
  focusTimerOpen: boolean;
  setFocusTimerOpen: (open: boolean) => void;
  authModalOpen: boolean;
  setAuthModalOpen: (open: boolean) => void;
  sendMessage: (content: string, attachments?: any[]) => Promise<void>;
  startNewChat: (initialMessage?: string) => void;
  deleteConversation: (id: string) => Promise<void>;
  renameConversation: (id: string, newTitle: string) => Promise<void>;
  createMemory: (content: string, category?: string, tags?: string[]) => Promise<void>;
  deleteMemory: (id: string) => Promise<void>;
  updateMemory: (id: string, patch: Partial<Memory>) => Promise<void>;
  createTask: (title: string, priority?: string, dueDate?: string, projectId?: string) => Promise<void>;
  toggleTask: (id: string, currentStatus: string) => Promise<void>;
  updateTaskStatus: (id: string, status: Task['status']) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  createReminder: (title: string, dueDateTime: string, recurrence?: string, notes?: string) => Promise<void>;
  updateReminder: (id: string, patch: Partial<Reminder>) => Promise<void>;
  deleteReminder: (id: string) => Promise<void>;
  createGoal: (title: string, description?: string, category?: Goal['category'], targetDate?: string, milestones?: string[], notes?: string) => Promise<void>;
  updateGoal: (id: string, patch: Partial<Goal>) => Promise<void>;
  toggleGoalMilestone: (goalId: string, milestoneId: string) => Promise<void>;
  deleteGoal: (id: string) => Promise<void>;
  createLedgerEntry: (personName: string, amount: number, type: 'give' | 'receive', options?: { description?: string; dueDate?: string; category?: string; currency?: string }) => Promise<void>;
  updateLedgerEntry: (id: string, patch: Partial<LedgerEntry>) => Promise<void>;
  settleLedgerEntry: (id: string) => Promise<void>;
  deleteLedgerEntry: (id: string) => Promise<void>;
  confirmAction: (toolName: string, action: string, payload: any, approved: boolean) => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  clearAllNotifications: () => Promise<void>;
  updateUser: (patch: Partial<User>) => Promise<void>;
  updateUserPreferences: (prefs: Partial<User['preferences']>) => Promise<void>;
  refreshAll: () => Promise<void>;
  showToast: (message: string, type?: 'success' | 'error' | 'info' | 'warning', duration?: number) => void;
  showConfirm: (opts: { title: string; message: string; confirmText?: string; cancelText?: string; type?: 'danger' | 'warning' | 'info'; onConfirm: () => void | Promise<void> }) => void;
  toasts: Array<{ id: string; message: string; type: 'success' | 'error' | 'info' | 'warning' }>;
  dismissToast: (id: string) => void;
  confirmDialog: { isOpen: boolean; title: string; message: string; confirmText: string; cancelText: string; type: 'danger' | 'warning' | 'info'; onConfirm: () => void | Promise<void> } | null;
  dismissConfirm: () => void;
}

async function safeJson<T = any>(res: Response): Promise<T | null> {
  if (!res.ok) return null;
  const contentType = res.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) return null;
  try {
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

// Keep API calls authenticated even when the HttpOnly cookie is unavailable
// (for example after a dev-server restart). The cookie remains the primary
// mechanism; the persisted token is only a fallback for this client session.
async function apiFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('recall_token');
    if (token && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  }
  return fetch(input, { ...init, headers, credentials: 'same-origin' });
}

function getInitialUser(): User | null {
  if (typeof window === 'undefined') return null;
  const customName = typeof window !== 'undefined' ? localStorage.getItem('recall_user_custom_name') : null;
  try {
    const cached = localStorage.getItem('recall_user');
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed) {
        if (customName) parsed.name = customName;
        return parsed;
      }
    }
  } catch {}
  return {
    id: 'guest_instant',
    name: customName || 'Personal User',
    email: 'user@assistance.ai',
    avatar: '',
    createdAt: new Date().toISOString(),
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
  };
}

function getInitialList<T>(key: string): T[] {
  if (typeof window === 'undefined') return [];
  try {
    const cached = localStorage.getItem(key);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(getInitialUser);
  const [theme, setThemeState] = useState<'light' | 'dark'>('light');
  const [activeTab, setActiveTabState] = useState<AppTab>('dashboard');

  const setActiveTab = useCallback((tab: AppTab) => {
    if (!isValidTab(tab)) return;

    setActiveTabState((prev) => {
      if (prev === tab) return prev;
      return tab;
    });

    if (typeof window !== 'undefined') {
      const currentHash = window.location.hash.replace('#', '');
      const targetHash = tab === 'dashboard' ? '' : tab;

      if (currentHash !== targetHash) {
        if (tab === 'dashboard') {
          window.history.pushState({ tab: 'dashboard' }, '', window.location.pathname);
        } else {
          window.history.pushState({ tab }, '', `#${tab}`);
        }
      }
    }
  }, []);

  // Synchronize Mobile Hardware/System Back Button & Browser History
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const syncFromLocation = () => {
      const hash = window.location.hash.replace('#', '') as AppTab;
      const targetTab: AppTab = isValidTab(hash) ? hash : 'dashboard';
      setActiveTabState(targetTab);
    };

    // Ensure root entry exists in history so back button always returns to Dashboard
    const initialHash = window.location.hash.replace('#', '') as AppTab;
    if (isValidTab(initialHash) && initialHash !== 'dashboard') {
      window.history.replaceState({ tab: 'dashboard' }, '', window.location.pathname);
      window.history.pushState({ tab: initialHash }, '', `#${initialHash}`);
      setActiveTabState(initialHash);
    } else {
      window.history.replaceState({ tab: 'dashboard' }, '', window.location.pathname);
      setActiveTabState('dashboard');
    }

    window.addEventListener('popstate', syncFromLocation);
    window.addEventListener('hashchange', syncFromLocation);

    return () => {
      window.removeEventListener('popstate', syncFromLocation);
      window.removeEventListener('hashchange', syncFromLocation);
    };
  }, []);
  const [conversations, setConversations] = useState<Conversation[]>(() => getInitialList<Conversation>('recall_conversations'));
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [memories, setMemories] = useState<Memory[]>(() => getInitialList<Memory>('recall_memories'));
  const [tasks, setTasks] = useState<Task[]>(() => getInitialList<Task>('recall_tasks'));
  const [reminders, setReminders] = useState<Reminder[]>(() => getInitialList<Reminder>('recall_reminders'));
  const [goals, setGoals] = useState<Goal[]>(() => getInitialList<Goal>('recall_goals'));
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>(() => getInitialList<LedgerEntry>('recall_ledger'));
  const [agentActions, setAgentActions] = useState<AgentAction[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>(() => getInitialList<AppNotification>('recall_notifications'));
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [notificationDrawerOpen, setNotificationDrawerOpen] = useState(false);
  const [liveVoiceOpen, setLiveVoiceOpen] = useState(false);
  const [focusTimerOpen, setFocusTimerOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [guestPromptsUsed, setGuestPromptsUsed] = useState(0);
  const [isHydrated, setIsHydrated] = useState(false);
  const initialLoadedRef = React.useRef(false);

  const isGuest = !user || isGuestEmail(user?.email);

  // ── In-App Toast & Confirm Dialog System ──────────────────────────────────
  const [toasts, setToasts] = useState<Array<{ id: string; message: string; type: 'success' | 'error' | 'info' | 'warning' }>>([]);
  const [confirmDialog, setConfirmDialog] = useState<{ isOpen: boolean; title: string; message: string; confirmText: string; cancelText: string; type: 'danger' | 'warning' | 'info'; onConfirm: () => void | Promise<void> } | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info', duration = 3500) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showConfirm = useCallback((opts: { title: string; message: string; confirmText?: string; cancelText?: string; type?: 'danger' | 'warning' | 'info'; onConfirm: () => void | Promise<void> }) => {
    setConfirmDialog({
      isOpen: true,
      title: opts.title,
      message: opts.message,
      confirmText: opts.confirmText || 'Confirm',
      cancelText: opts.cancelText || 'Cancel',
      type: opts.type || 'danger',
      onConfirm: opts.onConfirm,
    });
  }, []);

  const dismissConfirm = useCallback(() => {
    setConfirmDialog(null);
  }, []);
  // ─────────────────────────────────────────────────────────────────────────

  // Instant Client Hydration from localStorage on mount (prevents SSR blank wipes)
  useEffect(() => {
    try {
      const storedTasks = localStorage.getItem('recall_tasks');
      if (storedTasks) {
        const parsed = JSON.parse(storedTasks);
        if (Array.isArray(parsed) && parsed.length > 0) setTasks(parsed);
      }
    } catch {}

    try {
      const storedRem = localStorage.getItem('recall_reminders');
      if (storedRem) {
        const parsed = JSON.parse(storedRem);
        if (Array.isArray(parsed) && parsed.length > 0) setReminders(parsed);
      }
    } catch {}

    try {
      const storedLedger = localStorage.getItem('recall_ledger');
      if (storedLedger) {
        const parsed = JSON.parse(storedLedger);
        if (Array.isArray(parsed) && parsed.length > 0) setLedgerEntries(parsed);
      }
    } catch {}

    try {
      const storedMem = localStorage.getItem('recall_memories');
      if (storedMem) {
        const parsed = JSON.parse(storedMem);
        if (Array.isArray(parsed) && parsed.length > 0) setMemories(parsed);
      }
    } catch {}

    try {
      const storedGoals = localStorage.getItem('recall_goals');
      if (storedGoals) {
        const parsed = JSON.parse(storedGoals);
        if (Array.isArray(parsed) && parsed.length > 0) setGoals(parsed);
      }
    } catch {}

    try {
      const storedConvs = localStorage.getItem('recall_conversations');
      if (storedConvs) {
        const parsed = JSON.parse(storedConvs);
        if (Array.isArray(parsed) && parsed.length > 0) setConversations(parsed);
      }
    } catch {}

    try {
      const storedNotifs = localStorage.getItem('recall_notifications');
      if (storedNotifs) {
        const parsed = JSON.parse(storedNotifs);
        if (Array.isArray(parsed) && parsed.length > 0) setNotifications(parsed);
      }
    } catch {}

    try {
      const cachedUser = localStorage.getItem('recall_user');
      if (cachedUser) {
        const parsed = JSON.parse(cachedUser);
        if (parsed?.name) setUser(parsed);
      }
    } catch {}

    setGuestPromptsUsed(readGuestPromptCount());
    setIsHydrated(true);

    // Register Service Worker for Background Push Notifications & Alarms
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').then((reg) => {
        console.log('Recall AI Service Worker registered:', reg.scope);
      }).catch((err) => {
        console.warn('Service Worker registration skipped:', err);
      });

      // Listen for Background Alarm actions from Service Worker
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data?.type === 'ALARM_ACTION') {
          const { action, id } = event.data;
          if (action === 'snooze' && id) {
            setReminders((prev) =>
              prev.map((r) =>
                r.id === id
                  ? {
                      ...r,
                      status: 'pending',
                      dueDateTime: new Date(Date.now() + 5 * 60000).toISOString(),
                    }
                  : r
              )
            );
          } else if (action === 'complete' && id) {
            setReminders((prev) =>
              prev.map((r) =>
                r.id === id ? { ...r, status: 'dismissed' } : r
              )
            );
          }
        }
      });
    }
  }, []);

  // ── Auto-persist all collections to localStorage ONLY when hydrated ─────
  useEffect(() => {
    if (!isHydrated) return;
    try { localStorage.setItem('recall_tasks', JSON.stringify(tasks)); } catch {}
  }, [tasks, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    try { localStorage.setItem('recall_reminders', JSON.stringify(reminders)); } catch {}
  }, [reminders, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    try { localStorage.setItem('recall_memories', JSON.stringify(memories)); } catch {}
  }, [memories, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    try { localStorage.setItem('recall_goals', JSON.stringify(goals)); } catch {}
  }, [goals, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    try { localStorage.setItem('recall_ledger', JSON.stringify(ledgerEntries)); } catch {}
  }, [ledgerEntries, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    try { localStorage.setItem('recall_conversations', JSON.stringify(conversations)); } catch {}
  }, [conversations, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    try { localStorage.setItem('recall_notifications', JSON.stringify(notifications)); } catch {}
  }, [notifications, isHydrated]);

  // Theme switch helper
  const setTheme = useCallback((t: 'light' | 'dark') => {
    setThemeState(t);
    if (typeof window !== 'undefined') {
      if (t === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      localStorage.setItem('recall_theme', t);
    }
  }, []);

  // Initial Theme load
  useEffect(() => {
    const savedTheme = localStorage.getItem('recall_theme') as 'light' | 'dark';
    if (savedTheme) {
      setTheme(savedTheme);
    }
  }, [setTheme]);

  const startNewChat = useCallback((initialMessage?: string) => {
    setActiveConversationId(null);
    setMessages([]);
    setActiveTab('chat');
  }, [setActiveTab]);

  // Global Keyboard shortcuts: Ctrl+K (Search) & Alt+N / Cmd+N (New Chat)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
      }
      if (((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'o') || (e.altKey && e.key.toLowerCase() === 'n')) {
        e.preventDefault();
        startNewChat();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [startNewChat]);

  const updateUser = useCallback(async (patch: Partial<User>) => {
    setUser((prev) => {
      const updated = prev ? { ...prev, ...patch } : (patch as User);
      try {
        localStorage.setItem('recall_user', JSON.stringify(updated));
        if (patch.name) {
          localStorage.setItem('recall_user_custom_name', patch.name);
        }
      } catch {}
      return updated;
    });

    try {
      const res = await apiFetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      const data = await safeJson(res);
      if (data?.user) {
        setUser(data.user);
        try {
          localStorage.setItem('recall_user', JSON.stringify(data.user));
          if (patch.name) {
            localStorage.setItem('recall_user_custom_name', patch.name);
          }
          if (data.token) {
            localStorage.setItem('recall_token', data.token);
          }
        } catch {}
      }
    } catch (err) {
      console.error('Failed to update user', err);
    }
  }, []);

  const updateUserPreferences = useCallback(async (prefs: Partial<User['preferences']>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, preferences: { ...prev.preferences, ...prefs } };
      try {
        localStorage.setItem('recall_user', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    try {
      const res = await apiFetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferences: prefs }),
      });
      const data = await safeJson(res);
      if (data?.user) {
        setUser(data.user);
        try {
          localStorage.setItem('recall_user', JSON.stringify(data.user));
        } catch {}
      }
    } catch (err) {
      console.error('Failed to update preferences', err);
    }
  }, []);

  // Fetch initial data concurrently
  const refreshAll = useCallback(async () => {
    try {
      let token = typeof window !== 'undefined' ? localStorage.getItem('recall_token') : null;
      const customName = typeof window !== 'undefined' ? localStorage.getItem('recall_user_custom_name') : null;

      // 1. Check current authenticated user session
      let userRes = await apiFetch('/api/auth/me');
      let userData = await safeJson(userRes);

      // If signed out or no valid user returned, auto-initialize guest session to prevent 401s
      if (!userData?.user) {
        try {
          const guestRes = await apiFetch('/api/auth/guest', { method: 'POST' });
          const guestData = await safeJson(guestRes);
          if (guestData?.user) {
            userData = { user: guestData.user };
            token = guestData.token || null;
            if (token && typeof window !== 'undefined') localStorage.setItem('recall_token', token);
            if (typeof window !== 'undefined') localStorage.setItem('recall_user', JSON.stringify(guestData.user));
          }
        } catch {}
      }

      if (userData?.user) {
        const finalUser = {
          ...userData.user,
          name: customName || userData.user.name,
        };
        setUser(finalUser);
        try {
          localStorage.setItem('recall_user', JSON.stringify(finalUser));
        } catch {}
      }

      // If still not authenticated, avoid firing protected collection requests to prevent 401s
      if (!userData?.user) {
        return;
      }

      // Parallelized concurrent data fetch across all collections with authenticated session
      const [
        convResult,
        memResult,
        taskResult,
        remResult,
        goalResult,
        actResult,
        notifResult,
        ledgerResult,
      ] = await Promise.allSettled([
        apiFetch('/api/conversations').then(safeJson),
        apiFetch('/api/memories').then(safeJson),
        apiFetch('/api/tasks').then(safeJson),
        apiFetch('/api/reminders').then(safeJson),
        apiFetch('/api/goals').then(safeJson),
        apiFetch('/api/actions').then(safeJson),
        apiFetch('/api/notifications').then(safeJson),
        apiFetch('/api/ledger').then(safeJson),
      ]);

      // Smart non-destructive merge: preserve local data if server returns empty list (e.g. cold start)
      if (convResult.status === 'fulfilled' && Array.isArray(convResult.value?.conversations)) {
        const serverConvs: Conversation[] = convResult.value.conversations;
        setConversations((prev) => {
          if (serverConvs.length === 0 && prev.length > 0) return prev;
          const map = new Map<string, Conversation>();
          serverConvs.forEach((c) => map.set(c.id, c));
          prev.forEach((c) => { if (!map.has(c.id)) map.set(c.id, c); });
          return Array.from(map.values());
        });
        if (!initialLoadedRef.current) {
          initialLoadedRef.current = true;
          setActiveConversationId(null);
          setMessages([]);
        }
      }

      if (memResult.status === 'fulfilled' && Array.isArray(memResult.value?.memories)) {
        const serverMems: Memory[] = memResult.value.memories;
        setMemories((prev) => {
          if (serverMems.length === 0 && prev.length > 0) {
            prev.forEach((m) => {
              apiFetch('/api/memories', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(m),
              }).catch(() => {});
            });
            return prev;
          }
          const map = new Map<string, Memory>();
          serverMems.forEach((m) => map.set(m.id, m));
          prev.forEach((m) => {
            if (!map.has(m.id)) {
              map.set(m.id, m);
              apiFetch('/api/memories', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(m),
              }).catch(() => {});
            }
          });
          return Array.from(map.values());
        });
      }

      if (taskResult.status === 'fulfilled' && Array.isArray(taskResult.value?.tasks)) {
        const serverTasks: Task[] = taskResult.value.tasks;
        setTasks((prev) => {
          if (serverTasks.length === 0 && prev.length > 0) {
            prev.forEach((t) => {
              apiFetch('/api/tasks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(t),
              }).catch(() => {});
            });
            return prev;
          }
          const map = new Map<string, Task>();
          serverTasks.forEach((t) => map.set(t.id, t));
          prev.forEach((t) => {
            if (!map.has(t.id)) {
              map.set(t.id, t);
              apiFetch('/api/tasks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(t),
              }).catch(() => {});
            }
          });
          return Array.from(map.values());
        });
      }

      if (remResult.status === 'fulfilled' && Array.isArray(remResult.value?.reminders)) {
        const serverRems: Reminder[] = remResult.value.reminders;
        setReminders((prev) => {
          if (serverRems.length === 0 && prev.length > 0) {
            prev.forEach((r) => {
              apiFetch('/api/reminders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(r),
              }).catch(() => {});
            });
            return prev;
          }
          const map = new Map<string, Reminder>();
          serverRems.forEach((r) => map.set(r.id, r));
          prev.forEach((r) => {
            if (!map.has(r.id)) {
              map.set(r.id, r);
              apiFetch('/api/reminders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(r),
              }).catch(() => {});
            }
          });
          return Array.from(map.values());
        });
      }

      if (goalResult.status === 'fulfilled' && Array.isArray(goalResult.value?.goals)) {
        const serverGoals: Goal[] = goalResult.value.goals;
        setGoals((prev) => {
          if (serverGoals.length === 0 && prev.length > 0) {
            prev.forEach((g) => {
              apiFetch('/api/goals', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(g),
              }).catch(() => {});
            });
            return prev;
          }
          const map = new Map<string, Goal>();
          serverGoals.forEach((g) => map.set(g.id, g));
          prev.forEach((g) => {
            if (!map.has(g.id)) {
              map.set(g.id, g);
              apiFetch('/api/goals', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(g),
              }).catch(() => {});
            }
          });
          return Array.from(map.values());
        });
      }

      if (actResult.status === 'fulfilled' && actResult.value?.actions) {
        setAgentActions(actResult.value.actions);
      }

      if (notifResult.status === 'fulfilled' && notifResult.value?.notifications) {
        setNotifications((prev) => {
          const serverN = notifResult.value.notifications;
          if (serverN.length === 0 && prev.length > 0) return prev;
          const map = new Map<string, AppNotification>();
          serverN.forEach((n: AppNotification) => map.set(n.id, n));
          prev.forEach((n) => { if (!map.has(n.id)) map.set(n.id, n); });
          return Array.from(map.values());
        });
      }

      if (ledgerResult.status === 'fulfilled' && Array.isArray(ledgerResult.value?.ledger)) {
        const serverLedger: LedgerEntry[] = ledgerResult.value.ledger;
        setLedgerEntries((prev) => {
          if (serverLedger.length === 0 && prev.length > 0) {
            prev.forEach((l) => {
              apiFetch('/api/ledger', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(l),
              }).catch(() => {});
            });
            return prev;
          }
          const map = new Map<string, LedgerEntry>();
          serverLedger.forEach((l) => map.set(l.id, l));
          prev.forEach((l) => {
            if (!map.has(l.id)) {
              map.set(l.id, l);
              apiFetch('/api/ledger', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(l),
              }).catch(() => {});
            }
          });
          return Array.from(map.values());
        });
      }
    } catch (err) {
      console.error('Failed to load initial application state', err);
    }
  }, []);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  // ── OS push notifications ────────────────────────────────────────────────
  // Keeps the OS-level alarm schedule in sync with the user's reminders and
  // task due dates. Fires like native apps even when the app is closed.
  const notifSyncRef = React.useRef('');
  useEffect(() => {
    if (!user) return;

    const items: ScheduledItem[] = [
      ...reminders
        .filter((r) => r.status === 'pending' && r.dueDateTime)
        .map((r) => ({
          id: notificationIdFromString(r.id),
          title: `⏰ ${r.title}`,
          body: r.notes || 'Scheduled reminder',
          fireAt: r.dueDateTime,
        })),
      ...tasks
        .filter((t) => t.status !== 'completed' && t.status !== 'cancelled' && t.dueDate)
        .map((t) => ({
          id: notificationIdFromString(t.id),
          title: `📋 Task due: ${t.title}`,
          body: t.priority && t.priority !== 'medium' ? `${t.priority} priority` : 'Due now',
          fireAt: t.dueDate as string,
        })),
    ];

    // Only re-sync when the schedule fingerprint changes (avoids OS churn)
    const fingerprint = items.map((i) => `${i.id}:${i.fireAt}`).sort().join('|');
    if (fingerprint === notifSyncRef.current) return;
    notifSyncRef.current = fingerprint;

    scheduleNotifications(items);
  }, [reminders, tasks, user]);

  // ── Guest session ─────────────────────────────────────────────────────────
  // Creates a dedicated guest user server-side so guest data never mixes with
  // real accounts. The 5-prompt limit is tracked client-side AND server-side.
  const continueAsGuest = useCallback(async () => {
    try {
      const res = await apiFetch('/api/auth/guest', { method: 'POST' });
      const data = await safeJson(res);
      if (!res.ok || !data?.user) {
        showToast('Could not start a guest session. Please try again.', 'error');
        return;
      }
      localStorage.setItem('recall_user', JSON.stringify(data.user));
      localStorage.setItem('recall_onboarded', '1');
      if (data.token) localStorage.setItem('recall_token', data.token);
      markGuestSession();
      resetGuestPromptCount();
      setGuestPromptsUsed(0);
      await updateUser(data.user);
      await refreshAll();
    } catch {
      showToast('Could not start a guest session. Please try again.', 'error');
    }
  }, [updateUser, refreshAll, showToast]);

  // ── Sign out: clear session AND wipe locally cached data so the next
  //    viewer (guest or another account) starts from a clean slate.
  const signOut = useCallback(async () => {
    try {
      await apiFetch('/api/auth/me', { method: 'POST' });
    } catch {}
    try {
      localStorage.removeItem('recall_token');
      localStorage.removeItem('recall_user');
      localStorage.removeItem('recall_conversations');
      localStorage.removeItem('recall_memories');
      localStorage.removeItem('recall_tasks');
      localStorage.removeItem('recall_reminders');
      localStorage.removeItem('recall_goals');
      localStorage.removeItem('recall_notifications');
      localStorage.removeItem('recall_ledger');
      localStorage.removeItem('recall_onboarded');
      localStorage.removeItem(GUEST_PROMPT_COUNT_KEY);
    } catch {}
    setUser(null);
    setConversations([]);
    setMessages([]);
    setActiveConversationId(null);
    setMemories([]);
    setTasks([]);
    setReminders([]);
    setGoals([]);
    setLedgerEntries([]);
    setAgentActions([]);
    setNotifications([]);
    setGuestPromptsUsed(0);
    initialLoadedRef.current = false;
  }, []);

  // Load messages whenever active conversation changes
  useEffect(() => {
    if (!activeConversationId) {
      setMessages([]);
      return;
    }

    const loadMessages = async () => {
      try {
        const res = await apiFetch(`/api/conversations/${activeConversationId}`);
        if (!res.ok) {
          console.warn(`Conversation fetch returned status ${res.status}`);
          return;
        }
        const data = await safeJson(res);
        if (data?.messages) {
          setMessages(data.messages);
        }
      } catch (err) {
        console.warn('Notice loading conversation messages:', err);
      }
    };

    loadMessages();
  }, [activeConversationId]);

  // Real-time Reminder & Notification Checker (1s high-precision local check + 10s API sync)
  useEffect(() => {
    if (!user) return;

    const checkNotifications = async () => {
      try {
        const res = await apiFetch('/api/notifications');
        const data = await safeJson(res);
        if (data?.notifications) {
          setNotifications(data.notifications);
        }
      } catch {
        // silent fail
      }
    };

    // Instant 1-second local check so alarms trigger to the exact second (mobile app behavior)
    const checkLocalAlarms = () => {
      const now = Date.now();
      const pending = reminders.filter((r) => r.status === 'pending' && r.dueDateTime);
      let triggeredAny = false;

      for (const r of pending) {
        const due = new Date(r.dueDateTime).getTime();
        if (!isNaN(due) && due <= now) {
          triggeredAny = true;

          // Request screen wake lock so phone/desktop display doesn't dim or turn off while ringing
          if (typeof navigator !== 'undefined' && 'wakeLock' in navigator) {
            try { (navigator as any).wakeLock.request('screen').catch(() => {}); } catch {}
          }

          let nextDueDateTime = r.dueDateTime;
          let nextStatus: Reminder['status'] = 'triggered';

          // Mobile Alarm auto-repeat logic (iOS/Android clock behavior)
          if (r.recurrence === 'daily') {
            nextDueDateTime = new Date(due + 24 * 60 * 60 * 1000).toISOString();
            nextStatus = 'pending'; // Stays active for the next day
          } else if (r.recurrence === 'weekly') {
            nextDueDateTime = new Date(due + 7 * 24 * 60 * 60 * 1000).toISOString();
            nextStatus = 'pending';
          }

          // Optimistically update reminder status locally
          setReminders((prev) =>
            prev.map((item) =>
              item.id === r.id
                ? {
                    ...item,
                    status: nextStatus,
                    dueDateTime: nextDueDateTime,
                    lastTriggeredAt: new Date().toISOString(),
                  }
                : item
            )
          );

          // Create instant alarm notification
          const newNotif: AppNotification = {
            id: `notif_alarm_${r.id}_${Date.now()}`,
            userId: user.id,
            title: r.title || 'Alarm',
            message: r.notes || `Your alarm "${r.title || 'Alarm'}" is ringing now!`,
            type: 'reminder',
            read: false,
            actionUrl: '/reminders',
            createdAt: new Date().toISOString(),
          };
          setNotifications((prev) => [newNotif, ...prev.filter((n) => n.id !== newNotif.id)]);

          apiFetch(`/api/reminders/${r.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              status: nextStatus,
              dueDateTime: nextDueDateTime,
              lastTriggeredAt: new Date().toISOString(),
            }),
          }).catch(() => {});
        }
      }

      if (triggeredAny) {
        checkNotifications();
      }
    };

    checkNotifications();
    const localInterval = setInterval(checkLocalAlarms, 1000);
    const syncInterval = setInterval(checkNotifications, 10000);
    window.addEventListener('focus', checkNotifications);

    return () => {
      clearInterval(localInterval);
      clearInterval(syncInterval);
      window.removeEventListener('focus', checkNotifications);
    };
  }, [user, reminders]);

  const currentConversation = conversations.find((c) => c.id === activeConversationId) || null;
  const unreadNotificationCount = notifications.filter((n) => !n.read).length;

  // Send Message & trigger AI Agent
  const sendMessage = async (content: string, attachments?: any[]) => {
    const hasAttachments = attachments && attachments.length > 0;
    if ((!content.trim() && !hasAttachments) || isSending) return;

    const effectiveContent = content.trim() || (hasAttachments ? (attachments.length === 1 ? `Analyze this file: ${attachments[0].name}` : 'Analyze these attached files.') : '');

    // Optimistic user message
    const tempUserMsg: Message = {
      id: `temp_${Date.now()}`,
      conversationId: activeConversationId || 'pending',
      userId: user?.id || 'usr_temp',
      role: 'user',
      content: effectiveContent,
      attachments,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, tempUserMsg]);
    setIsSending(true);

    try {
      const clientTimezone = typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'Asia/Kolkata';
      const res = await apiFetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: activeConversationId,
          message: effectiveContent,
          attachments,
          timezone: clientTimezone,
        }),
      });

      const data = await safeJson(res);
      if (data?.success) {
        if (!activeConversationId || activeConversationId !== data.conversationId) {
          setActiveConversationId(data.conversationId);
          const newConv: Conversation = {
            id: data.conversationId,
            userId: user?.id || 'usr_default_main',
            title: effectiveContent.slice(0, 36) + (effectiveContent.length > 36 ? '...' : ''),
            pinned: false,
            model: user?.preferences?.model || 'Recall Core Ultra',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          setConversations((prev) => [newConv, ...prev.filter((c) => c.id !== data.conversationId)]);
        }

        // Replace temp message with server message and append assistant reply
        setMessages((prev) => [
          ...prev.filter((m) => m.id !== tempUserMsg.id),
          data.userMessage,
          data.assistantMessage,
        ]);

        // Refresh auxiliary data if memory, task, or reminder was updated
        refreshAll();
      } else {
        const errorContent = data?.error || 'Unable to process your request. Please try again.';
        const errorMsg: Message = {
          id: `err_${Date.now()}`,
          conversationId: activeConversationId || 'error',
          userId: 'system',
          role: 'assistant',
          content: `⚠️ *Notice:* ${errorContent}`,
          createdAt: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, errorMsg]);
      }
    } catch (err: any) {
      console.warn('Send message notice:', err);
      const errorMsg: Message = {
        id: `err_${Date.now()}`,
        conversationId: activeConversationId || 'error',
        userId: 'system',
        role: 'assistant',
        content: `⚠️ *An issue occurred while processing:* ${err.message || 'Please retry.'}`,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsSending(false);
    }
  };



  const deleteConversation = async (id: string) => {
    try {
      await apiFetch(`/api/conversations/${id}`, { method: 'DELETE' });
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (activeConversationId === id) {
        const remaining = conversations.filter((c) => c.id !== id);
        setActiveConversationId(remaining.length > 0 ? remaining[0].id : null);
      }
    } catch (err) {
      console.error('Failed to delete conversation', err);
    }
  };

  const renameConversation = async (id: string, newTitle: string) => {
    try {
      const res = await apiFetch(`/api/conversations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle }),
      });
      const data = await res.json();
      if (data.conversation) {
        setConversations((prev) => prev.map((c) => (c.id === id ? data.conversation : c)));
      }
    } catch (err) {
      console.error('Failed to rename conversation', err);
    }
  };

  // Memory Actions (Local-first & instant)
  const createMemory = async (content: string, category = 'general', tags: string[] = []) => {
    const tempId = `mem_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newMemory: Memory = {
      id: tempId,
      userId: user?.id || 'usr_primary_default',
      content: content.trim(),
      type: 'personal',
      category: (category as any) || 'general',
      tags: tags || [],
      confidence: 1.0,
      pinned: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setMemories((prev) => {
      const updated = [newMemory, ...prev];
      try { localStorage.setItem('recall_memories', JSON.stringify(updated)); } catch {}
      return updated;
    });

    try {
      const res = await apiFetch('/api/memories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: tempId, content, category, tags }),
      });
      const data = await safeJson(res);
      if (data?.memory) {
        setMemories((prev) => prev.map((m) => (m.id === tempId ? data.memory : m)));
      }
    } catch (err) {
      console.warn('Memory background sync notice:', err);
    }
  };

  const deleteMemory = async (id: string) => {
    setMemories((prev) => {
      const updated = prev.filter((m) => m.id !== id);
      try { localStorage.setItem('recall_memories', JSON.stringify(updated)); } catch {}
      return updated;
    });
    try {
      await apiFetch(`/api/memories/${id}`, { method: 'DELETE' });
    } catch {}
  };

  const updateMemory = async (id: string, patch: Partial<Memory>) => {
    setMemories((prev) => {
      const updated = prev.map((m) => (m.id === id ? { ...m, ...patch, updatedAt: new Date().toISOString() } : m));
      try { localStorage.setItem('recall_memories', JSON.stringify(updated)); } catch {}
      return updated;
    });
    try {
      const res = await apiFetch(`/api/memories/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      const data = await safeJson(res);
      if (data?.memory) {
        setMemories((prev) => prev.map((m) => (m.id === id ? data.memory : m)));
      }
    } catch {}
  };

  // Task Actions
  const createTask = async (title: string, priority = 'medium', dueDate?: string, projectId?: string) => {
    const tempId = `task_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const tempTask: Task = {
      id: tempId,
      userId: user?.id || 'u_default_owner',
      title: title.trim(),
      status: 'todo',
      priority: (priority as any) || 'medium',
      dueDate,
      projectId,
      tags: [],
      createdAt: new Date().toISOString(),
    };

    // Instant optimistic update (0ms latency in UI)
    setTasks((prev) => [tempTask, ...prev]);

    try {
      const res = await apiFetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, priority, dueDate, projectId }),
      });
      const data = await res.json();
      if (data?.task) {
        // Swap temp task with persisted server task
        setTasks((prev) => prev.map((t) => (t.id === tempId ? data.task : t)));
      }
    } catch (err) {
      console.error('Task background sync failed', err);
    }
  };

  const toggleTask = async (id: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'completed' ? 'todo' : 'completed';
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status: nextStatus } : t)));
    const res = await apiFetch(`/api/tasks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: nextStatus }),
    });
    const data = await res.json();
    if (data?.task) {
      setTasks((prev) => prev.map((t) => (t.id === id ? data.task : t)));
    }
  };

  const updateTaskStatus = async (id: string, status: Task['status']) => {
    // Instant optimistic update in UI state
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status } : t)));
    try {
    const res = await apiFetch(`/api/tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (data?.task) {
        setTasks((prev) => prev.map((t) => (t.id === id ? data.task : t)));
      }
    } catch (err) {
      console.error('Failed to update task status', err);
    }
  };

  const deleteTask = async (id: string) => {
    await apiFetch(`/api/tasks/${id}`, { method: 'DELETE' });
    setTasks((prev) => prev.filter((t) => t.id !== id));
    cancelNotification(notificationIdFromString(id));
  };

  // Reminder Actions
  const createReminder = async (title: string, dueDateTime: string, recurrence = 'none', notes?: string) => {
    const tempId = `rem_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const tempReminder: Reminder = {
      id: tempId,
      userId: user?.id || 'usr_default',
      title: title.trim(),
      dueDateTime: dueDateTime || new Date(Date.now() + 3600000).toISOString(),
      recurrence: (recurrence as any) || 'none',
      priority: 'medium',
      status: 'pending',
      notes,
      createdAt: new Date().toISOString(),
    };

    // Instant optimistic update
    setReminders((prev) => [tempReminder, ...prev]);

    try {
      const res = await apiFetch('/api/reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, dueDateTime, recurrence, notes }),
      });
      const data = await safeJson(res);
      if (data?.reminder) {
        setReminders((prev) => prev.map((r) => (r.id === tempId ? data.reminder : r)));
      }
    } catch (err) {
      console.warn('Reminder sync notice:', err);
    }
  };

  const updateReminder = async (id: string, patch: Partial<Reminder>) => {
    setReminders((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    try {
      const res = await apiFetch(`/api/reminders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      const data = await res.json();
      if (data?.reminder) {
        setReminders((prev) => prev.map((r) => (r.id === id ? data.reminder : r)));
      }
    } catch (err) {
      console.error('Failed to update reminder', err);
    }
  };

  const deleteReminder = async (id: string) => {
    await apiFetch(`/api/reminders/${id}`, { method: 'DELETE' });
    setReminders((prev) => prev.filter((r) => r.id !== id));
    cancelNotification(notificationIdFromString(id));
  };

  // Goal Actions (Local-first & instant)
  const createGoal = async (
    title: string,
    description?: string,
    category: Goal['category'] = 'personal',
    targetDate?: string,
    milestones: string[] = [],
    notes?: string
  ) => {
    const formattedMilestones = milestones.map((m, idx) => ({
      id: `m_${Date.now()}_${idx}`,
      title: m,
      completed: false,
    }));

    const newGoalId = `goal_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newGoal: Goal = {
      id: newGoalId,
      userId: user?.id || 'usr_primary_default',
      title: title.trim(),
      description: description?.trim() || undefined,
      notes: notes?.trim() || undefined,
      category,
      targetDate: targetDate || undefined,
      milestones: formattedMilestones,
      progress: 0,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setGoals((prev) => {
      const updated = [newGoal, ...prev];
      try { localStorage.setItem('recall_goals', JSON.stringify(updated)); } catch {}
      return updated;
    });

    try {
      const res = await apiFetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: newGoalId,
          title,
          description,
          notes,
          category,
          targetDate,
          milestones: formattedMilestones,
        }),
      });
      const data = await safeJson(res);
      if (data?.goal) {
        setGoals((prev) => prev.map((g) => (g.id === newGoalId ? data.goal : g)));
      }
    } catch (err) {
      console.warn('Goal background sync notice:', err);
    }
  };

  const updateGoal = async (id: string, patch: Partial<Goal>) => {
    setGoals((prev) => {
      const updated = prev.map((g) => (g.id === id ? { ...g, ...patch, updatedAt: new Date().toISOString() } : g));
      try { localStorage.setItem('recall_goals', JSON.stringify(updated)); } catch {}
      return updated;
    });

    try {
      const res = await apiFetch('/api/goals', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...patch }),
      });
      const data = await safeJson(res);
      if (data?.goal) {
        setGoals((prev) => prev.map((g) => (g.id === id ? data.goal : g)));
      }
    } catch (err) {
      console.warn('Goal update background sync notice:', err);
    }
  };

  const toggleGoalMilestone = async (goalId: string, milestoneId: string) => {
    setGoals((prev) => {
      const updated = prev.map((g) => {
        if (g.id !== goalId) return g;
        const updatedMilestones = (g.milestones || []).map((m) =>
          m.id === milestoneId ? { ...m, completed: !m.completed } : m
        );
        const completedCount = updatedMilestones.filter((m) => m.completed).length;
        const progress = updatedMilestones.length > 0
          ? Math.round((completedCount / updatedMilestones.length) * 100)
          : g.progress;
        return { ...g, milestones: updatedMilestones, progress, updatedAt: new Date().toISOString() };
      });
      try { localStorage.setItem('recall_goals', JSON.stringify(updated)); } catch {}
      return updated;
    });

    try {
      const res = await apiFetch('/api/goals', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: goalId, milestoneId, toggleMilestone: true }),
      });
      const data = await safeJson(res);
      if (data?.goal) {
        setGoals((prev) => prev.map((g) => (g.id === goalId ? data.goal : g)));
      }
    } catch (err) {
      console.warn('Goal milestone background sync notice:', err);
    }
  };

  const deleteGoal = async (id: string) => {
    setGoals((prev) => {
      const updated = prev.filter((g) => g.id !== id);
      try { localStorage.setItem('recall_goals', JSON.stringify(updated)); } catch {}
      return updated;
    });
    try {
      await apiFetch(`/api/goals?id=${id}`, { method: 'DELETE' });
    } catch {}
  };

  // Confirmation Tool Action
  const confirmAction = async (toolName: string, action: string, payload: any, approved: boolean) => {
    const res = await apiFetch('/api/tools/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ toolName, action, payload, approved }),
    });
    const data = await res.json();
    if (data.message) {
      const confirmNotice: Message = {
        id: `conf_notice_${Date.now()}`,
        conversationId: activeConversationId || 'conf',
        userId: 'system',
        role: 'assistant',
        content: approved ? `✅ **Action Confirmed & Executed:**\n\n${data.message}` : `🚫 **Action Cancelled.**`,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, confirmNotice]);
      refreshAll();
    }
  };

  // Ledger Actions (Local-first & instant)
  const createLedgerEntry = async (
    personName: string,
    amount: number,
    type: 'give' | 'receive',
    options?: { description?: string; dueDate?: string; category?: string; currency?: string }
  ) => {
    const tempId = `ledg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newEntry: LedgerEntry = {
      id: tempId,
      userId: user?.id || 'usr_primary_default',
      personName: personName.trim(),
      amount,
      currency: options?.currency || '₹',
      type: type === 'give' ? 'give' : 'receive',
      status: 'pending',
      description: options?.description?.trim() || undefined,
      dueDate: options?.dueDate || undefined,
      category: options?.category || 'personal',
      createdAt: new Date().toISOString(),
    };

    setLedgerEntries((prev) => {
      const updated = [newEntry, ...prev];
      try { localStorage.setItem('recall_ledger', JSON.stringify(updated)); } catch {}
      return updated;
    });

    try {
      const res = await apiFetch('/api/ledger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: tempId,
          personName,
          amount,
          type,
          currency: options?.currency || '₹',
          description: options?.description,
          dueDate: options?.dueDate,
          category: options?.category,
        }),
      });
      const data = await safeJson(res);
      if (data?.entry) {
        setLedgerEntries((prev) => prev.map((l) => (l.id === tempId ? data.entry : l)));
      }
    } catch (err) {
      console.warn('Ledger background sync notice:', err);
    }
  };

  const updateLedgerEntry = async (id: string, patch: Partial<LedgerEntry>) => {
    setLedgerEntries((prev) => {
      const updated = prev.map((l) => (l.id === id ? { ...l, ...patch } : l));
      try { localStorage.setItem('recall_ledger', JSON.stringify(updated)); } catch {}
      return updated;
    });

    try {
      const res = await apiFetch('/api/ledger', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...patch }),
      });
      const data = await safeJson(res);
      if (data?.entry) {
        setLedgerEntries((prev) => prev.map((l) => (l.id === id ? data.entry : l)));
      }
    } catch (err) {
      console.warn('Ledger update background sync notice:', err);
    }
  };

  const settleLedgerEntry = async (id: string) => {
    setLedgerEntries((prev) => {
      const updated = prev.map((l) => (l.id === id ? { ...l, status: 'settled' as const } : l));
      try { localStorage.setItem('recall_ledger', JSON.stringify(updated)); } catch {}
      return updated;
    });

    try {
      const res = await apiFetch('/api/ledger', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action: 'settle' }),
      });
      const data = await safeJson(res);
      if (data?.entry) {
        setLedgerEntries((prev) => prev.map((l) => (l.id === id ? data.entry : l)));
      }
    } catch (err) {
      console.warn('Ledger settle background sync notice:', err);
    }
  };

  const deleteLedgerEntry = async (id: string) => {
    setLedgerEntries((prev) => {
      const updated = prev.filter((l) => l.id !== id);
      try { localStorage.setItem('recall_ledger', JSON.stringify(updated)); } catch {}
      return updated;
    });

    try {
      await apiFetch(`/api/ledger?id=${id}`, { method: 'DELETE' });
    } catch (err) {
      console.warn('Ledger delete background sync notice:', err);
    }
  };

  // Notifications
  const markNotificationRead = async (id: string) => {
    setNotifications((prev) => {
      const updated = prev.map((n) => (n.id === id ? { ...n, read: true } : n));
      try { localStorage.setItem('recall_notifications', JSON.stringify(updated)); } catch {}
      return updated;
    });

    try {
      await apiFetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
    } catch (err) {
      console.warn('markNotificationRead background sync notice:', err);
    }
  };

  const markAllNotificationsRead = async () => {
    setNotifications((prev) => {
      const updated = prev.map((n) => ({ ...n, read: true }));
      try { localStorage.setItem('recall_notifications', JSON.stringify(updated)); } catch {}
      return updated;
    });

    try {
      await apiFetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAll: true }),
      });
    } catch (err) {
      console.warn('markAllNotificationsRead background sync notice:', err);
    }
  };

  const deleteNotification = async (id: string) => {
    setNotifications((prev) => {
      const updated = prev.filter((n) => n.id !== id);
      try { localStorage.setItem('recall_notifications', JSON.stringify(updated)); } catch {}
      return updated;
    });

    try {
      await apiFetch(`/api/notifications?id=${id}`, { method: 'DELETE' });
    } catch (err) {
      console.warn('deleteNotification background sync notice:', err);
    }
  };

  const clearAllNotifications = async () => {
    setNotifications([]);
    try { localStorage.setItem('recall_notifications', JSON.stringify([])); } catch {}

    try {
      await apiFetch('/api/notifications', { method: 'DELETE' });
    } catch (err) {
      console.warn('clearAllNotifications background sync notice:', err);
    }
  };

  return (
    <AppContext.Provider
      value={{
        user,
        isGuest,
        guestPromptsUsed,
        guestPromptLimit: GUEST_PROMPT_LIMIT,
        continueAsGuest,
        signOut,
        theme,
        setTheme,
        activeTab,
        setActiveTab,
        conversations,
        activeConversationId,
        setActiveConversationId,
        currentConversation,
        messages,
        isSending,
        memories,
        tasks,
        reminders,
        goals,
        ledgerEntries,
        agentActions,
        notifications,
        unreadNotificationCount,
        commandPaletteOpen,
        setCommandPaletteOpen,
        notificationDrawerOpen,
        setNotificationDrawerOpen,
        liveVoiceOpen,
        setLiveVoiceOpen,
        focusTimerOpen,
        setFocusTimerOpen,
        authModalOpen,
        setAuthModalOpen,
        sendMessage,
        startNewChat,
        deleteConversation,
        renameConversation,
        createMemory,
        deleteMemory,
        updateMemory,
        createTask,
        toggleTask,
        updateTaskStatus,
        deleteTask,
        createReminder,
        updateReminder,
        deleteReminder,
        createGoal,
        updateGoal,
        toggleGoalMilestone,
        deleteGoal,
        createLedgerEntry,
        updateLedgerEntry,
        settleLedgerEntry,
        deleteLedgerEntry,
        confirmAction,
        markNotificationRead,
        markAllNotificationsRead,
        deleteNotification,
        clearAllNotifications,
        updateUser,
        updateUserPreferences,
        refreshAll,
        showToast,
        showConfirm,
        toasts,
        dismissToast,
        confirmDialog,
        dismissConfirm,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
