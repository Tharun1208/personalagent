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
  createReminder: (title: string, dueDateTime: string, recurrence?: string) => Promise<void>;
  updateReminder: (id: string, patch: Partial<Reminder>) => Promise<void>;
  deleteReminder: (id: string) => Promise<void>;
  createGoal: (title: string, description?: string, category?: Goal['category'], targetDate?: string, milestones?: string[]) => Promise<void>;
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
  try {
    const cached = localStorage.getItem('recall_user');
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed?.name) return parsed;
    }
  } catch {}
  return {
    id: 'guest_instant',
    name: 'Guest User',
    email: 'guest@agent.local',
    avatar: '',
    createdAt: new Date().toISOString(),
    preferences: {
      theme: 'light',
      aiProvider: 'builtin',
      model: 'gemini-1.5-flash',
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
  const [activeTab, setActiveTab] = useState<AppTab>('dashboard');
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

  // Instant User load from localStorage cache on hard refresh
  useEffect(() => {
    try {
      const cachedUser = localStorage.getItem('recall_user');
      if (cachedUser) {
        const parsed = JSON.parse(cachedUser);
        if (parsed?.name) {
          setUser(parsed);
        }
      }
    } catch {}
    // Restore guest prompt counter
    setGuestPromptsUsed(readGuestPromptCount());
  }, []);

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
  }, []);

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
        setUser(userData.user);
        try {
          localStorage.setItem('recall_user', JSON.stringify(userData.user));
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

      if (convResult.status === 'fulfilled' && convResult.value?.conversations) {
        setConversations(convResult.value.conversations);
        try { localStorage.setItem('recall_conversations', JSON.stringify(convResult.value.conversations)); } catch {}
        if (!initialLoadedRef.current) {
          initialLoadedRef.current = true;
          // Start with a fresh new chat session on launch / reload as requested
          setActiveConversationId(null);
          setMessages([]);
        }
      }

      if (memResult.status === 'fulfilled' && memResult.value?.memories) {
        setMemories(memResult.value.memories);
        try { localStorage.setItem('recall_memories', JSON.stringify(memResult.value.memories)); } catch {}
      }

      if (taskResult.status === 'fulfilled' && taskResult.value?.tasks) {
        setTasks(taskResult.value.tasks);
        try { localStorage.setItem('recall_tasks', JSON.stringify(taskResult.value.tasks)); } catch {}
      }

      if (remResult.status === 'fulfilled' && remResult.value?.reminders) {
        setReminders(remResult.value.reminders);
        try { localStorage.setItem('recall_reminders', JSON.stringify(remResult.value.reminders)); } catch {}
      }

      if (goalResult.status === 'fulfilled' && goalResult.value?.goals) {
        setGoals(goalResult.value.goals);
        try { localStorage.setItem('recall_goals', JSON.stringify(goalResult.value.goals)); } catch {}
      }

      if (actResult.status === 'fulfilled' && actResult.value?.actions) {
        setAgentActions(actResult.value.actions);
      }

      if (notifResult.status === 'fulfilled' && notifResult.value?.notifications) {
        setNotifications(notifResult.value.notifications);
        try { localStorage.setItem('recall_notifications', JSON.stringify(notifResult.value.notifications)); } catch {}
      }

      if (ledgerResult.status === 'fulfilled' && ledgerResult.value?.ledger) {
        setLedgerEntries(ledgerResult.value.ledger);
        try { localStorage.setItem('recall_ledger', JSON.stringify(ledgerResult.value.ledger)); } catch {}
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
          // Optimistically update reminder status locally
          setReminders((prev) =>
            prev.map((item) => (item.id === r.id ? { ...item, status: 'triggered' } : item))
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
            body: JSON.stringify({ status: 'triggered' }),
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

  // Memory Actions
  const createMemory = async (content: string, category?: string, tags?: string[]) => {
    const res = await apiFetch('/api/memories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, category, tags }),
    });
    const data = await res.json();
    if (data.memory) {
      setMemories((prev) => [data.memory, ...prev]);
    }
  };

  const deleteMemory = async (id: string) => {
    await apiFetch(`/api/memories/${id}`, { method: 'DELETE' });
    setMemories((prev) => prev.filter((m) => m.id !== id));
  };

  const updateMemory = async (id: string, patch: Partial<Memory>) => {
      const res = await apiFetch(`/api/memories/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    const data = await res.json();
    if (data.memory) {
      setMemories((prev) => prev.map((m) => (m.id === id ? data.memory : m)));
    }
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
  const createReminder = async (title: string, dueDateTime: string, recurrence = 'none') => {
    const res = await apiFetch('/api/reminders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, dueDateTime, recurrence }),
    });
    const data = await res.json();
    if (data.reminder) {
      setReminders((prev) => [...prev, data.reminder]);
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

  // Goal Actions
  const createGoal = async (
    title: string,
    description?: string,
    category: Goal['category'] = 'personal',
    targetDate?: string,
    milestones: string[] = []
  ) => {
    const formattedMilestones = milestones.map((m, idx) => ({
      id: `m_${Date.now()}_${idx}`,
      title: m,
      completed: false,
    }));

    const res = await apiFetch('/api/goals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        description,
        category,
        targetDate,
        milestones: formattedMilestones,
      }),
    });
    const data = await res.json();
    if (data.goal) {
      setGoals((prev) => [data.goal, ...prev]);
    }
  };

  const updateGoal = async (id: string, patch: Partial<Goal>) => {
    const res = await apiFetch('/api/goals', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...patch }),
    });
    const data = await res.json();
    if (data.goal) {
      setGoals((prev) => prev.map((g) => (g.id === id ? data.goal : g)));
    }
  };

  const toggleGoalMilestone = async (goalId: string, milestoneId: string) => {
    const res = await apiFetch('/api/goals', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: goalId, milestoneId, toggleMilestone: true }),
    });
    const data = await res.json();
    if (data.goal) {
      setGoals((prev) => prev.map((g) => (g.id === goalId ? data.goal : g)));
    }
  };

  const deleteGoal = async (id: string) => {
    await apiFetch(`/api/goals?id=${id}`, { method: 'DELETE' });
    setGoals((prev) => prev.filter((g) => g.id !== id));
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

  // Ledger Actions (Who I Owe / Who Owes Me)
  const createLedgerEntry = async (
    personName: string,
    amount: number,
    type: 'give' | 'receive',
    options?: { description?: string; dueDate?: string; category?: string; currency?: string }
  ) => {
    const res = await apiFetch('/api/ledger', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        personName,
        amount,
        type,
        currency: options?.currency || '₹',
        description: options?.description,
        dueDate: options?.dueDate,
        category: options?.category,
      }),
    });
    const data = await res.json();
    if (data.entry) {
      setLedgerEntries((prev) => [data.entry, ...prev]);
    }
  };

  const updateLedgerEntry = async (id: string, patch: Partial<LedgerEntry>) => {
    const res = await apiFetch('/api/ledger', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...patch }),
    });
    const data = await res.json();
    if (data.entry) {
      setLedgerEntries((prev) => prev.map((l) => (l.id === id ? data.entry : l)));
    }
  };

  const settleLedgerEntry = async (id: string) => {
    const res = await apiFetch('/api/ledger', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action: 'settle' }),
    });
    const data = await res.json();
    if (data.entry) {
      setLedgerEntries((prev) => prev.map((l) => (l.id === id ? data.entry : l)));
    }
  };

  const deleteLedgerEntry = async (id: string) => {
    await apiFetch(`/api/ledger?id=${id}`, { method: 'DELETE' });
    setLedgerEntries((prev) => prev.filter((l) => l.id !== id));
  };

  // Notifications
  const markNotificationRead = async (id: string) => {
    await apiFetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const markAllNotificationsRead = async () => {
    await apiFetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ markAll: true }),
    });
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const deleteNotification = async (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    await apiFetch(`/api/notifications?id=${id}`, { method: 'DELETE' });
  };

  const clearAllNotifications = async () => {
    setNotifications([]);
    await apiFetch('/api/notifications', { method: 'DELETE' });
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
