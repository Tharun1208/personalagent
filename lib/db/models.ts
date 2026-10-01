import mongoose, { Schema, Model } from 'mongoose';
import {
  User,
  Conversation,
  Message,
  Memory,
  Task,
  Reminder,
  Goal,
  Habit,
  AgentAction,
  AppNotification,
  ConfirmationRequest,
  LedgerEntry,
} from '@/types';

// 1. User Schema
const UserSchema = new Schema<User>(
  {
    id: { type: String, required: true, unique: true, index: true },
    email: { type: String, required: true },
    name: { type: String, required: true },
    avatar: { type: String },
    createdAt: { type: String, required: true },
    preferences: {
      theme: { type: String, default: 'dark' },
      aiProvider: { type: String, default: 'groq' },
      apiKey: { type: String },
      model: { type: String, default: 'llama-3.3-70b-versatile' },
      voiceEnabled: { type: Boolean, default: true },
      voiceAutoRead: { type: Boolean, default: false },
      proactiveReminders: { type: Boolean, default: true },
      soundEffects: { type: Boolean, default: true },
      confirmDestructiveActions: { type: Boolean, default: true },
      alarmTone: { type: String, default: 'chime' },
      voiceAnnounceAlarm: { type: Boolean, default: false },
      telegramBotToken: { type: String },
      telegramChatId: { type: String },
      enableTelegramAlerts: { type: Boolean, default: false },
      emailDigestEnabled: { type: Boolean, default: false },
      githubToken: { type: String },
      autoExtractMemories: { type: Boolean, default: true },
    },
  },
  { timestamps: true }
);

// 2. User Credentials Schema
const CredentialSchema = new Schema(
  {
    userId: { type: String, required: true, unique: true, index: true },
    passwordHash: { type: String, required: true },
  },
  { timestamps: true }
);

// 3. Conversation Schema
const ConversationSchema = new Schema<Conversation>(
  {
    id: { type: String, required: true, unique: true, index: true },
    userId: { type: String, required: true, index: true },
    title: { type: String, required: true },
    model: { type: String, default: 'Recall Core Ultra' },
    createdAt: { type: String, required: true },
    updatedAt: { type: String, required: true },
    pinned: { type: Boolean, default: false },
    projectId: { type: String },
    messageCount: { type: Number, default: 0 },
    lastMessageSnippet: { type: String },
  },
  { timestamps: true }
);

// 4. Message Schema
const MessageSchema = new Schema<Message>(
  {
    id: { type: String, required: true, unique: true, index: true },
    conversationId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    role: { type: String, enum: ['user', 'assistant', 'system', 'tool'], required: true },
    content: { type: String, required: true },
    attachments: { type: [Schema.Types.Mixed], default: [] },
    toolSteps: { type: [Schema.Types.Mixed], default: [] },
    createdAt: { type: String, required: true },
  },
  { timestamps: true }
);

// 5. Memory Schema
const MemorySchema = new Schema<Memory>(
  {
    id: { type: String, required: true, unique: true, index: true },
    userId: { type: String, required: true, index: true },
    content: { type: String, required: true },
    type: { type: String, required: true },
    category: { type: String },
    tags: { type: [String], default: [] },
    confidence: { type: Number, default: 1 },
    sourceMessageId: { type: String },
    projectId: { type: String },
    pinned: { type: Boolean, default: false },
    createdAt: { type: String, required: true },
    updatedAt: { type: String, required: true },
  },
  { timestamps: true }
);

// 6. Task Schema
const TaskSchema = new Schema<Task>(
  {
    id: { type: String, required: true, unique: true, index: true },
    userId: { type: String, required: true, index: true },
    title: { type: String, required: true },
    description: { type: String },
    status: { type: String, enum: ['todo', 'in_progress', 'completed', 'cancelled'], default: 'todo' },
    priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
    dueDate: { type: String },
    projectId: { type: String },
    reminderId: { type: String },
    tags: { type: [String], default: [] },
    subtasks: { type: [Schema.Types.Mixed], default: [] },
    createdAt: { type: String, required: true },
    completedAt: { type: String },
  },
  { timestamps: true }
);

// 7. Reminder Schema
const ReminderSchema = new Schema<Reminder>(
  {
    id: { type: String, required: true, unique: true, index: true },
    userId: { type: String, required: true, index: true },
    title: { type: String, required: true },
    dueDateTime: { type: String, required: true },
    recurrence: { type: String, enum: ['none', 'daily', 'weekly', 'monthly', 'custom'], default: 'none' },
    priority: { type: String, enum: ['low', 'medium', 'high'], default: 'high' },
    projectId: { type: String },
    notes: { type: String },
    status: { type: String, enum: ['pending', 'triggered', 'dismissed', 'snoozed'], default: 'pending' },
    createdAt: { type: String, required: true },
    lastTriggeredAt: { type: String },
  },
  { timestamps: true }
);

// 8. Goal Schema
const GoalSchema = new Schema<Goal>(
  {
    id: { type: String, required: true, unique: true, index: true },
    userId: { type: String, required: true, index: true },
    title: { type: String, required: true },
    description: { type: String },
    notes: { type: String },
    category: { type: String, enum: ['career', 'health', 'finance', 'learning', 'personal'], default: 'personal' },
    targetDate: { type: String },
    progress: { type: Number, default: 0 },
    milestones: [
      {
        id: { type: String, required: true },
        title: { type: String, required: true },
        completed: { type: Boolean, default: false },
        targetDate: { type: String },
      },
    ],
    status: { type: String, enum: ['active', 'completed', 'paused'], default: 'active' },
    createdAt: { type: String, required: true },
    updatedAt: { type: String },
  },
  { timestamps: true }
);

// 9. Habit Schema
const HabitSchema = new Schema<Habit>(
  {
    id: { type: String, required: true, unique: true, index: true },
    userId: { type: String, required: true, index: true },
    title: { type: String, required: true },
    frequency: { type: String, enum: ['daily', 'weekly'], default: 'daily' },
    streak: { type: Number, default: 0 },
    lastCompletedDate: { type: String },
    history: { type: [String], default: [] },
    createdAt: { type: String, required: true },
  },
  { timestamps: true }
);

// 10. AgentAction Schema
const AgentActionSchema = new Schema<AgentAction>(
  {
    id: { type: String, required: true, unique: true, index: true },
    userId: { type: String, required: true, index: true },
    conversationId: { type: String, required: true },
    toolName: { type: String, required: true },
    action: { type: String, required: true },
    summary: { type: String, required: true },
    status: { type: String, enum: ['pending', 'success', 'failed', 'cancelled'], required: true },
    permissionLevel: { type: String, enum: ['READ', 'WRITE', 'DESTRUCTIVE'], required: true },
    details: { type: Schema.Types.Mixed },
    createdAt: { type: String, required: true },
  },
  { timestamps: true }
);

// 11. AppNotification Schema
const AppNotificationSchema = new Schema<AppNotification>(
  {
    id: { type: String, required: true, unique: true, index: true },
    userId: { type: String, required: true, index: true },
    type: { type: String, enum: ['reminder', 'task_deadline', 'agent', 'github', 'system'], required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    read: { type: Boolean, default: false },
    actionUrl: { type: String },
    createdAt: { type: String, required: true },
  },
  { timestamps: true }
);

// 12. ConfirmationRequest Schema
const ConfirmationRequestSchema = new Schema<ConfirmationRequest>(
  {
    id: { type: String, required: true, unique: true, index: true },
    toolName: { type: String, required: true },
    action: { type: String, required: true },
    description: { type: String, required: true },
    permissionLevel: { type: String, enum: ['WRITE', 'DESTRUCTIVE'], required: true },
    payload: { type: Schema.Types.Mixed, required: true },
    conversationId: { type: String, required: true },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    createdAt: { type: String, required: true },
  },
  { timestamps: true }
);

// 13. LedgerEntry Schema
const LedgerEntrySchema = new Schema<LedgerEntry>(
  {
    id: { type: String, required: true, unique: true, index: true },
    userId: { type: String, required: true, index: true },
    personName: { type: String, required: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: '₹' },
    type: { type: String, enum: ['give', 'receive'], required: true },
    status: { type: String, enum: ['pending', 'settled'], default: 'pending' },
    description: { type: String },
    dueDate: { type: String },
    settledAt: { type: String },
    category: { type: String },
    createdAt: { type: String, required: true },
    updatedAt: { type: String },
  },
  { timestamps: true }
);

// Export Mongoose Models (preventing OverwriteModelError in Next.js hot reload)
export const UserModel: Model<User> = mongoose.models.User || mongoose.model<User>('User', UserSchema);
export const CredentialModel: Model<any> = mongoose.models.Credential || mongoose.model('Credential', CredentialSchema);
export const ConversationModel: Model<Conversation> = mongoose.models.Conversation || mongoose.model<Conversation>('Conversation', ConversationSchema);
export const MessageModel: Model<Message> = mongoose.models.Message || mongoose.model<Message>('Message', MessageSchema);
export const MemoryModel: Model<Memory> = mongoose.models.Memory || mongoose.model<Memory>('Memory', MemorySchema);
export const TaskModel: Model<Task> = mongoose.models.Task || mongoose.model<Task>('Task', TaskSchema);
export const ReminderModel: Model<Reminder> = mongoose.models.Reminder || mongoose.model<Reminder>('Reminder', ReminderSchema);
export const GoalModel: Model<Goal> = mongoose.models.Goal || mongoose.model<Goal>('Goal', GoalSchema);
export const HabitModel: Model<Habit> = mongoose.models.Habit || mongoose.model<Habit>('Habit', HabitSchema);
export const AgentActionModel: Model<AgentAction> = mongoose.models.AgentAction || mongoose.model<AgentAction>('AgentAction', AgentActionSchema);
export const NotificationModel: Model<AppNotification> = mongoose.models.Notification || mongoose.model<AppNotification>('Notification', AppNotificationSchema);
export const ConfirmationModel: Model<ConfirmationRequest> = mongoose.models.Confirmation || mongoose.model<ConfirmationRequest>('Confirmation', ConfirmationRequestSchema);
export const LedgerModel: Model<LedgerEntry> = mongoose.models.LedgerEntry || mongoose.model<LedgerEntry>('LedgerEntry', LedgerEntrySchema);
