import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const outDir = path.join(rootDir, 'out');
const nextDir = path.join(rootDir, '.next');
const publicDir = path.join(rootDir, 'public');

console.log('🚀 Starting mobile asset preparation...');

// 1. Build Next.js
console.log('📦 Running Next.js production build...');
execSync('npx next build', { cwd: rootDir, stdio: 'inherit' });

// 2. Validate Next.js output
const htmlSource = path.join(nextDir, 'server', 'app', 'index.html');
const staticSource = path.join(nextDir, 'static');

if (!fs.existsSync(htmlSource)) {
  console.error(`❌ Error: ${htmlSource} does not exist!`);
  process.exit(1);
}
if (!fs.existsSync(staticSource)) {
  console.error(`❌ Error: ${staticSource} does not exist!`);
  process.exit(1);
}

// 3. Clean & recreate out directory
if (fs.existsSync(outDir)) {
  fs.rmSync(outDir, { recursive: true, force: true });
}
fs.mkdirSync(outDir, { recursive: true });

// 4. Copy public assets (skip old redirect index.html)
console.log('📋 Copying public assets...');
if (fs.existsSync(publicDir)) {
  const publicFiles = fs.readdirSync(publicDir);
  for (const file of publicFiles) {
    if (file === 'index.html') continue; // Don't copy old redirect HTML
    const srcPath = path.join(publicDir, file);
    const destPath = path.join(outDir, file);
    fs.cpSync(srcPath, destPath, { recursive: true });
  }
}

// 5. Copy Next.js index.html
console.log('📄 Copying prerendered index.html...');
fs.copyFileSync(htmlSource, path.join(outDir, 'index.html'));

// 6. Copy .next/static to out/_next/static
console.log('⚡ Copying Next.js static assets to out/_next/static...');
const destNextStatic = path.join(outDir, '_next', 'static');
fs.mkdirSync(destNextStatic, { recursive: true });
fs.cpSync(staticSource, destNextStatic, { recursive: true });

// Also mirror to out/next/static for WebView fallback compatibility
const destNextStaticAlt = path.join(outDir, 'next', 'static');
fs.mkdirSync(destNextStaticAlt, { recursive: true });
fs.cpSync(staticSource, destNextStaticAlt, { recursive: true });

console.log('✅ Mobile bundle successfully prepared in out/');
console.log(`- HTML: ${path.join(outDir, 'index.html')}`);
console.log(`- Assets: ${destNextStatic}`);
