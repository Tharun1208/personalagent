/**
 * scripts/backup-data.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Exports all data from MongoDB Atlas into a timestamped local JSON file.
 *
 * Usage:
 *   npm run db:backup
 *   or: node scripts/backup-data.js
 */

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

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

async function backup() {
  console.log('🔄 Connecting to MongoDB Atlas...');
  await mongoose.connect(uri);
  const db = mongoose.connection.db;

  const collections = [
    'users',
    'userCredentials',
    'conversations',
    'messages',
    'memories',
    'tasks',
    'reminders',
    'projects',
    'habits',
    'agentactions',
    'notifications',
    'confirmations',
    'ledger'
  ];

  const backupData = {};
  const backupDir = path.join(process.cwd(), 'backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  console.log('📦 Exporting collections:');
  for (const name of collections) {
    try {
      const items = await db.collection(name).find({}).toArray();
      backupData[name] = items;
      console.log(`  ✓ ${name.padEnd(16)} : ${items.length} items`);
    } catch (err) {
      backupData[name] = [];
    }
  }

  // Generate timestamped backup filename
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFilePath = path.join(backupDir, `backup_${timestamp}.json`);
  const latestFilePath = path.join(process.cwd(), 'data', 'recall.db.json');

  fs.writeFileSync(backupFilePath, JSON.stringify(backupData, null, 2), 'utf-8');
  fs.writeFileSync(latestFilePath, JSON.stringify(backupData, null, 2), 'utf-8');

  console.log(`\n✅ Backup successfully saved to:`);
  console.log(`   📁 ${backupFilePath}`);
  console.log(`   📁 ${latestFilePath} (synced locally)`);

  process.exit(0);
}

backup().catch((err) => {
  console.error('❌ Backup failed:', err);
  process.exit(1);
});
