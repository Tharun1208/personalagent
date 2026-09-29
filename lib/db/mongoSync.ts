import { connectToDatabase, isMongoConfigured } from './mongodb';
import {
  UserModel,
  CredentialModel,
  ConversationModel,
  MessageModel,
  MemoryModel,
  TaskModel,
  ReminderModel,
  GoalModel,
  HabitModel,
  AgentActionModel,
  NotificationModel,
  ConfirmationModel,
  LedgerModel,
} from './models';

let isInitialMigrated = false;

export async function syncInitialDataToMongo(localData: any) {
  if (!isMongoConfigured() || isInitialMigrated) return;

  try {
    const conn = await connectToDatabase();
    if (!conn) return;

    // Check if Mongo is empty
    const userCount = await UserModel.countDocuments();
    if (userCount === 0 && localData?.users?.length > 0) {
      console.log('🔄 First-time MongoDB initialization: Migrating local JSON data to MongoDB Atlas/Cloud...');

      if (localData.users?.length) await UserModel.insertMany(localData.users, { ordered: false }).catch(() => {});
      if (localData.userCredentials?.length) await CredentialModel.insertMany(localData.userCredentials, { ordered: false }).catch(() => {});
      if (localData.conversations?.length) await ConversationModel.insertMany(localData.conversations, { ordered: false }).catch(() => {});
      if (localData.messages?.length) await MessageModel.insertMany(localData.messages, { ordered: false }).catch(() => {});
      if (localData.memories?.length) await MemoryModel.insertMany(localData.memories, { ordered: false }).catch(() => {});
      if (localData.tasks?.length) await TaskModel.insertMany(localData.tasks, { ordered: false }).catch(() => {});
      if (localData.reminders?.length) await ReminderModel.insertMany(localData.reminders, { ordered: false }).catch(() => {});
      if (localData.goals?.length) await GoalModel.insertMany(localData.goals, { ordered: false }).catch(() => {});
      if (localData.habits?.length) await HabitModel.insertMany(localData.habits, { ordered: false }).catch(() => {});
      if (localData.agentActions?.length) await AgentActionModel.insertMany(localData.agentActions, { ordered: false }).catch(() => {});
      if (localData.notifications?.length) await NotificationModel.insertMany(localData.notifications, { ordered: false }).catch(() => {});
      if (localData.ledger?.length) await LedgerModel.insertMany(localData.ledger, { ordered: false }).catch(() => {});

      console.log('✅ Local data migrated to MongoDB successfully');
    }

    isInitialMigrated = true;
  } catch (err) {
    console.error('⚠️ MongoDB sync initialization warning:', err);
  }
}

export async function syncEntityToMongo(
  collection: 'user' | 'credential' | 'conversation' | 'message' | 'memory' | 'task' | 'reminder' | 'goal' | 'habit' | 'action' | 'notification' | 'confirmation' | 'ledger',
  operation: 'upsert' | 'delete',
  data: any
) {
  if (!isMongoConfigured()) return;

  try {
    const conn = await connectToDatabase();
    if (!conn) return;

    if (collection === 'user') {
      if (operation === 'upsert') await UserModel.findOneAndUpdate({ id: data.id }, data, { upsert: true });
    } else if (collection === 'credential') {
      if (operation === 'upsert') await CredentialModel.findOneAndUpdate({ userId: data.userId }, data, { upsert: true });
    } else if (collection === 'conversation') {
      if (operation === 'upsert') await ConversationModel.findOneAndUpdate({ id: data.id }, data, { upsert: true });
      else if (operation === 'delete') await ConversationModel.deleteOne({ id: data.id });
    } else if (collection === 'message') {
      if (operation === 'upsert') await MessageModel.findOneAndUpdate({ id: data.id }, data, { upsert: true });
    } else if (collection === 'memory') {
      if (operation === 'upsert') await MemoryModel.findOneAndUpdate({ id: data.id }, data, { upsert: true });
      else if (operation === 'delete') await MemoryModel.deleteOne({ id: data.id });
    } else if (collection === 'task') {
      if (operation === 'upsert') await TaskModel.findOneAndUpdate({ id: data.id }, data, { upsert: true });
      else if (operation === 'delete') await TaskModel.deleteOne({ id: data.id });
    } else if (collection === 'reminder') {
      if (operation === 'upsert') await ReminderModel.findOneAndUpdate({ id: data.id }, data, { upsert: true });
      else if (operation === 'delete') await ReminderModel.deleteOne({ id: data.id });
    } else if (collection === 'goal') {
      if (operation === 'upsert') await GoalModel.findOneAndUpdate({ id: data.id }, data, { upsert: true });
      else if (operation === 'delete') await GoalModel.deleteOne({ id: data.id });
    } else if (collection === 'habit') {
      if (operation === 'upsert') await HabitModel.findOneAndUpdate({ id: data.id }, data, { upsert: true });
      else if (operation === 'delete') await HabitModel.deleteOne({ id: data.id });
    } else if (collection === 'action') {
      if (operation === 'upsert') await AgentActionModel.findOneAndUpdate({ id: data.id }, data, { upsert: true });
    } else if (collection === 'notification') {
      if (operation === 'upsert') await NotificationModel.findOneAndUpdate({ id: data.id }, data, { upsert: true });
      else if (operation === 'delete') await NotificationModel.deleteOne({ id: data.id });
    } else if (collection === 'ledger') {
      if (operation === 'upsert') await LedgerModel.findOneAndUpdate({ id: data.id }, data, { upsert: true });
      else if (operation === 'delete') await LedgerModel.deleteOne({ id: data.id });
    }
  } catch (err) {
    console.error(`MongoDB sync error for ${collection}:`, err);
  }
}
