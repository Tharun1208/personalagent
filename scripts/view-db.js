const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

// Read connection string from .env.local
let uri = process.env.MONGODB_URI;
if (!uri) {
  try {
    const envPath = path.join(process.cwd(), '.env.local');
    const envContent = fs.readFileSync(envPath, 'utf-8');
    const match = envContent.match(/MONGODB_URI=["']?([^"'\r\n]+)["']?/);
    if (match) uri = match[1];
  } catch {}
}

if (!uri) {
  uri = 'mongodb+srv://tharunhs1208_db_user:cCheWdn4UAE7qNhS@cluster0.mcelyjx.mongodb.net/assistance_ai?retryWrites=true&w=majority';
}

async function viewDb() {
  console.log('🔄 Connecting to MongoDB Atlas...');
  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  console.log(`✅ Connected to Database: "${db.databaseName}" on Cluster0\n`);

  // 1. Users
  console.log('========================================================================');
  console.log('👤 COLLECTION: users');
  console.log('========================================================================');
  const users = await db.collection('users').find({}).toArray();
  console.log(JSON.stringify(users.map(u => ({ id: u.id, name: u.name, email: u.email, theme: u.preferences?.theme })), null, 2));

  // 2. Tasks
  console.log('\n========================================================================');
  console.log('✅ COLLECTION: tasks');
  console.log('========================================================================');
  const tasks = await db.collection('tasks').find({}).toArray();
  console.log(JSON.stringify(tasks.map(t => ({ id: t.id, title: t.title, status: t.status, priority: t.priority, dueDate: t.dueDate })), null, 2));

  // 3. Reminders & Calendar Events
  console.log('\n========================================================================');
  console.log('⏰ COLLECTION: reminders');
  console.log('========================================================================');
  const reminders = await db.collection('reminders').find({}).toArray();
  console.log(JSON.stringify(reminders.map(r => ({ id: r.id, title: r.title, dueDateTime: r.dueDateTime, recurrence: r.recurrence, status: r.status })), null, 2));

  // 4. Conversations
  console.log('\n========================================================================');
  console.log('💬 COLLECTION: conversations');
  console.log('========================================================================');
  const convs = await db.collection('conversations').find({}).toArray();
  console.log(JSON.stringify(convs.map(c => ({ id: c.id, title: c.title, updatedAt: c.updatedAt })), null, 2));

  // 5. Recent Messages (latest 5)
  console.log('\n========================================================================');
  console.log('📨 COLLECTION: messages (Latest 5)');
  console.log('========================================================================');
  const messages = await db.collection('messages').find({}).sort({ _id: -1 }).limit(5).toArray();
  console.log(JSON.stringify(messages.reverse().map(m => ({ role: m.role, content: m.content.slice(0, 80) + '...', createdAt: m.createdAt })), null, 2));

  console.log('\n========================================================================');
  console.log('✨ Total Collections Overview:');
  console.log(`- Users: ${users.length}`);
  console.log(`- Tasks: ${tasks.length}`);
  console.log(`- Reminders: ${reminders.length}`);
  console.log(`- Conversations: ${convs.length}`);
  const totalMsgs = await db.collection('messages').countDocuments();
  console.log(`- Total Messages: ${totalMsgs}`);
  console.log('========================================================================\n');

  process.exit(0);
}

viewDb().catch(err => {
  console.error('Error querying MongoDB:', err);
  process.exit(1);
});
