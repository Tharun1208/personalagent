export type Role = 'user' | 'assistant' | 'system' | 'tool';

export type MemoryType =
  | 'personal'
  | 'preference'
  | 'project'
  | 'task'
  | 'important_date'
  | 'instruction'
  | 'work'
  | 'study'
  | 'goal'
  | 'context';

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  createdAt: string;
  preferences: UserPreferences;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  aiProvider: 'builtin' | 'openai' | 'gemini' | 'anthropic' | 'groq' | 'ollama';
  apiKey?: string;
  model: string;
  voiceEnabled: boolean;
  voiceAutoRead: boolean;
  proactiveReminders: boolean;
  soundEffects: boolean;
  confirmDestructiveActions: boolean;
  alarmTone?: 'digital' | 'chime' | 'zen' | 'radar' | 'gentle' | 'retro' | 'cyber' | 'custom';
  customAlarmUrl?: string;
  customAlarmName?: string;
  alarmVolume?: number;
  voiceAnnounceAlarm?: boolean;
  telegramBotToken?: string;
  telegramChatId?: string;
  enableTelegramAlerts?: boolean;
  emailDigestEnabled?: boolean;
  githubToken?: string;
  autoExtractMemories?: boolean;
}

export interface SubTask {
  id: string;
  title: string;
  completed: boolean;
}

export interface Habit {
  id: string;
  userId: string;
  title: string;
  frequency: 'daily' | 'weekly';
  streak: number;
  lastCompletedDate?: string;
  history: string[]; // ISO dates
  createdAt: string;
}

export type LedgerType = 'give' | 'receive'; // 'give' (You owe/payable) | 'receive' (They owe you/receivable)
export type LedgerStatus = 'pending' | 'settled';

export interface LedgerEntry {
  id: string;
  userId: string;
  personName: string;
  amount: number;
  currency: string;
  type: LedgerType;
  status: LedgerStatus;
  description?: string;
  dueDate?: string;
  settledAt?: string;
  category?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Memory {
  id: string;
  userId: string;
  content: string;
  type: MemoryType;
  category?: string;
  tags: string[];
  confidence: number;
  sourceMessageId?: string;
  projectId?: string;
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  userId: string;
  title: string;
  description?: string;
  status: 'todo' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  dueDate?: string;
  projectId?: string;
  reminderId?: string;
  tags: string[];
  subtasks?: SubTask[];
  createdAt: string;
  completedAt?: string;
}

export interface Reminder {
  id: string;
  userId: string;
  title: string;
  dueDateTime: string;
  recurrence: 'none' | 'daily' | 'weekly' | 'monthly' | 'custom';
  priority: 'low' | 'medium' | 'high';
  projectId?: string;
  notes?: string;
  status: 'pending' | 'triggered' | 'dismissed' | 'snoozed';
  createdAt: string;
  lastTriggeredAt?: string;
}

export interface Milestone {
  id: string;
  title: string;
  completed: boolean;
  targetDate?: string;
}

export interface Goal {
  id: string;
  userId: string;
  title: string;
  description?: string;
  notes?: string;
  category: 'career' | 'health' | 'finance' | 'learning' | 'personal';
  targetDate?: string;
  progress: number; // 0 to 100
  milestones: Milestone[];
  status: 'active' | 'completed' | 'paused';
  createdAt: string;
  updatedAt?: string;
}

export interface MessageAttachment {
  id: string;
  name: string;
  type: string;
  size: number;
  url?: string;
  content?: string;
}

export interface ToolExecutionStep {
  toolName: string;
  action: string;
  input: Record<string, any>;
  output?: Record<string, any>;
  status: 'pending' | 'executing' | 'success' | 'failed' | 'requires_confirmation';
  confirmationMessage?: string;
  executionTimeMs?: number;
}

export interface Message {
  id: string;
  conversationId: string;
  userId: string;
  role: Role;
  content: string;
  attachments?: MessageAttachment[];
  toolSteps?: ToolExecutionStep[];
  memorySaved?: {
    id: string;
    content: string;
    type: MemoryType;
  }[];
  createdAt: string;
}

export interface Conversation {
  id: string;
  userId: string;
  title: string;
  pinned: boolean;
  projectId?: string;
  model: string;
  createdAt: string;
  updatedAt: string;
  messageCount?: number;
  lastMessageSnippet?: string;
}

export interface AgentAction {
  id: string;
  userId: string;
  conversationId?: string;
  toolName: string;
  action: string;
  summary: string;
  status: 'success' | 'failed' | 'cancelled' | 'pending_confirmation';
  permissionLevel: 'READ' | 'WRITE' | 'DESTRUCTIVE';
  details?: Record<string, any>;
  createdAt: string;
}

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'reminder' | 'task_deadline' | 'agent' | 'github' | 'system';
  read: boolean;
  actionUrl?: string;
  createdAt: string;
}

export interface ConfirmationRequest {
  id: string;
  toolName: string;
  action: string;
  description: string;
  permissionLevel: 'WRITE' | 'DESTRUCTIVE';
  payload: Record<string, any>;
  conversationId: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}
