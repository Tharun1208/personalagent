import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const androidDir = path.join(rootDir, 'android');

const mode = process.argv.includes('--debug') ? 'debug' : 'release';
const taskName = mode === 'debug' ? 'assembleDebug' : 'assembleRelease';
const outputName = mode === 'debug' ? 'PersonalAgent-debug.apk' : 'PersonalAgent.apk';
const sourceApk = path.join(
  androidDir,
  'app',
  'build',
  'outputs',
  'apk',
  mode,
  `app-${mode}.apk`
);
const destApk = path.join(rootDir, outputName);

console.log(`\n========================================`);
console.log(`📱 Building Personal Agent APK (${mode.toUpperCase()})`);
console.log(`========================================\n`);

// 1. Prepare offline web assets
console.log('1️⃣ Preparing offline web assets...');
execSync(`node "${path.join(__dirname, 'build-mobile-bundle.mjs')}"`, {
  cwd: rootDir,
  stdio: 'inherit',
});

// 2. Sync with Capacitor
console.log('\n2️⃣ Syncing assets to Capacitor Android...');
execSync('npx cap sync android', { cwd: rootDir, stdio: 'inherit' });

// 3. Setup environment variables for Gradle
const env = { ...process.env };
if (!env.JAVA_HOME || !fs.existsSync(env.JAVA_HOME)) {
  const defaultJdk = 'C:\\Program Files\\Java\\jdk-24';
  if (fs.existsSync(defaultJdk)) {
    env.JAVA_HOME = defaultJdk;
  }
}
if (!env.ANDROID_HOME || !fs.existsSync(env.ANDROID_HOME)) {
  const localAppData = process.env.LOCALAPPDATA || 'C:\\Users\\Hp\\AppData\\Local';
  const defaultSdk = path.join(localAppData, 'Android', 'Sdk');
  if (fs.existsSync(defaultSdk)) {
    env.ANDROID_HOME = defaultSdk;
  }
}

// 4. Run Gradle
console.log(`\n3️⃣ Compiling Android APK with Gradle (${taskName})...`);
const gradlewCmd = process.platform === 'win32' ? '.\\gradlew.bat' : './gradlew';
execSync(`${gradlewCmd} ${taskName}`, {
  cwd: androidDir,
  stdio: 'inherit',
  env,
});

// 5. Copy output
if (fs.existsSync(sourceApk)) {
  fs.copyFileSync(sourceApk, destApk);
  const stats = fs.statSync(destApk);
  const sizeMb = (stats.size / (1024 * 1024)).toFixed(2);
  console.log(`\n========================================`);
  console.log(`🎉 SUCCESS! APK Built Successfully!`);
  console.log(`📂 Location: ${destApk}`);
  console.log(`📦 File Size: ${sizeMb} MB (${stats.size} bytes)`);
  console.log(`📶 Mode: Fully Offline & Online Capable`);
  console.log(`========================================\n`);
} else {
  console.error(`❌ Error: Expected APK at ${sourceApk} was not found.`);
  process.exit(1);
}
