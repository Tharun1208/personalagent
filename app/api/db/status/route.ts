import { NextResponse } from 'next/server';
import { connectToDatabase, isMongoConfigured, getMongoStatus } from '@/lib/db/mongodb';
import { getStorageStatus } from '@/lib/db';
import { UserModel, TaskModel, MemoryModel, ReminderModel, ConversationModel } from '@/lib/db/models';

export const dynamic = 'force-dynamic';

export async function GET() {
  const configured = isMongoConfigured();
  const storage = getStorageStatus();

  if (!configured) {
    return NextResponse.json({
      ...storage,
      connected: true,
      driver: 'Local JSON Database (data/recall.db.json)',
      message: 'Local JSON storage is active. This only persists on a machine with a writable disk.',
    });
  }

  try {
    const conn = await connectToDatabase();
    if (!conn) {
      return NextResponse.json({
        ...storage,
        connected: false,
        degraded: true,
        driver: 'MongoDB (unreachable) → temporary in-memory fallback',
        coolingDown: getMongoStatus().coolingDown,
        lastError: getMongoStatus().lastError,
        error: 'Unable to establish connection with provided MONGODB_URI.',
        message:
          'The database is unreachable, so tasks, reminders, ledger entries and expenses may appear empty or disappear. ' +
          'Fix MONGODB_URI in the deployment environment (Atlas Database Access + Network Access) and redeploy.',
      });
    }

    const [users, tasks, memories, reminders, conversations] = await Promise.all([
      UserModel.countDocuments().catch(() => 0),
      TaskModel.countDocuments().catch(() => 0),
      MemoryModel.countDocuments().catch(() => 0),
      ReminderModel.countDocuments().catch(() => 0),
      ConversationModel.countDocuments().catch(() => 0),
    ]);

    return NextResponse.json({
      ...storage,
      connected: true,
      degraded: false,
      driver: 'MongoDB Atlas / Server',
      database: conn.connection.db?.databaseName || 'connected',
      collections: {
        users,
        tasks,
        memories,
        reminders,
        conversations,
      },
    });
  } catch (err: any) {
    return NextResponse.json({
      ...storage,
      connected: false,
      degraded: true,
      driver: 'MongoDB (unreachable) → temporary in-memory fallback',
      error: err?.message || 'Connection failed',
      message:
        'The database is unreachable, so tasks, reminders, ledger entries and expenses may appear empty or disappear. ' +
        'Fix MONGODB_URI in the deployment environment and redeploy.',
    });
  }
}
