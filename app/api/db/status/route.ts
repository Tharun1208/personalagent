import { NextResponse } from 'next/server';
import { connectToDatabase, isMongoConfigured } from '@/lib/db/mongodb';
import { UserModel, TaskModel, MemoryModel, ReminderModel, ConversationModel } from '@/lib/db/models';

export async function GET() {
  const configured = isMongoConfigured();

  if (!configured) {
    return NextResponse.json({
      connected: false,
      driver: 'Local JSON Database (data/recall.db.json)',
      message: 'MONGODB_URI is not set. Add your connection string in .env.local to activate MongoDB.',
    });
  }

  try {
    const conn = await connectToDatabase();
    if (!conn) {
      return NextResponse.json({
        connected: false,
        driver: 'MongoDB',
        error: 'Unable to establish connection with provided MONGODB_URI.',
      }, { status: 500 });
    }

    const [users, tasks, memories, reminders, conversations] = await Promise.all([
      UserModel.countDocuments().catch(() => 0),
      TaskModel.countDocuments().catch(() => 0),
      MemoryModel.countDocuments().catch(() => 0),
      ReminderModel.countDocuments().catch(() => 0),
      ConversationModel.countDocuments().catch(() => 0),
    ]);

    return NextResponse.json({
      connected: true,
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
      connected: false,
      driver: 'MongoDB',
      error: err?.message || 'Connection failed',
    }, { status: 500 });
  }
}
