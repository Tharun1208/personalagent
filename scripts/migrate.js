const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

async function migrate() {
  const uri = 'mongodb+srv://tharunhs1208_db_user:cCheWdn4UAE7qNhS@cluster0.mcelyjx.mongodb.net/assistance_ai?retryWrites=true&w=majority';
  await mongoose.connect(uri);
  console.log('Connected to MongoDB Atlas');

  const jsonPath = path.join(process.cwd(), 'data', 'recall.db.json');
  if (!fs.existsSync(jsonPath)) {
    console.log('No local JSON found');
    process.exit(0);
  }

  const raw = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
  const db = mongoose.connection.db;

  const collections = [
    { name: 'users', data: raw.users },
    { name: 'conversations', data: raw.conversations },
    { name: 'messages', data: raw.messages },
    { name: 'memories', data: raw.memories },
    { name: 'tasks', data: raw.tasks },
    { name: 'reminders', data: raw.reminders },
    { name: 'projects', data: raw.projects },
    { name: 'habits', data: raw.habits },
    { name: 'knowledgedocs', data: raw.knowledgeDocs },
    { name: 'agentactions', data: raw.agentActions },
    { name: 'notifications', data: raw.notifications },
    { name: 'userCredentials', data: raw.userCredentials },
  ];

  for (const c of collections) {
    if (c.data && c.data.length > 0) {
      const col = db.collection(c.name);
      for (const doc of c.data) {
        await col.updateOne({ id: doc.id }, { $set: doc }, { upsert: true });
      }
      const count = await col.countDocuments();
      console.log(`Collection '${c.name}' synced: ${count} documents`);
    }
  }

  console.log('✅ ALL DATA SUCCESSFULLY MIGRATED TO MONGODB ATLAS!');
  process.exit(0);
}

migrate().catch(e => {
  console.error('Migration error:', e);
  process.exit(1);
});
