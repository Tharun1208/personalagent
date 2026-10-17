import fs from 'node:fs/promises';
import path from 'node:path';

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const families = [
  { name: 'IBM Plex Sans', slug: 'ibm-plex-sans', query: 'IBM+Plex+Sans:wght@100..700' },
  { name: 'Inter', slug: 'inter', query: 'Inter:wght@100..900' },
  { name: 'JetBrains Mono', slug: 'jetbrains-mono', query: 'JetBrains+Mono:wght@100..800' },
  { name: 'Cormorant Garamond', slug: 'cormorant-garamond', query: 'Cormorant+Garamond:wght@300;400;500;600;700' },
  { name: 'Cutive Mono', slug: 'cutive-mono', query: 'Cutive+Mono' },
];

const outDir = path.resolve('public', 'fonts');
await fs.mkdir(outDir, { recursive: true });

const manifest = [];

for (const fam of families) {
  const url = `https://fonts.googleapis.com/css2?family=${fam.query}&display=swap`;
  let css = '';
  for (let attempt = 0; attempt < 15; attempt++) {
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    css = await res.text();
    if (css && !css.includes('/l/font')) break;
    console.log(`  retry ${attempt + 1} for ${fam.name} (extensionless URL)`);
  }

  const blocks = css.split('@font-face').slice(1);
  const latinBlocks = blocks.filter((b) => /U\+0000-00FF/.test(b));
  const chosen = latinBlocks.length ? latinBlocks : blocks;

  for (const b of chosen) {
    const weight = (/font-weight:\s*([^;]+);/.exec(b) || [])[1]?.trim() || '400';
    const style = (/font-style:\s*([^;]+);/.exec(b) || [])[1]?.trim() || 'normal';
    const srcUrl = (/src:\s*url\((https:[^)]+)\)/.exec(b) || [])[1];
    if (!srcUrl) continue;
    const extMatch = /\.(woff2|woff|ttf|otf)(?:\?|$)/.exec(srcUrl);
    const ext = extMatch ? extMatch[1] : 'woff2';
    const safeWeight = weight.replace(/\s+/g, '-');
    const fileName = `${fam.slug}-${safeWeight}-${style}.${ext}`;
    const res = await fetch(srcUrl, { headers: { 'User-Agent': UA } });
    const buf = Buffer.from(await res.arrayBuffer());
    await fs.writeFile(path.join(outDir, fileName), buf);
    manifest.push({ family: fam.name, file: fileName, weight, style });
    console.log(`  saved ${fileName} (${buf.length} bytes)`);
  }
  console.log(`done: ${fam.name}`);
}

await fs.writeFile(
  path.resolve('scripts', 'fonts-manifest.json'),
  JSON.stringify(manifest, null, 2)
);
console.log('\nmanifest written to scripts/fonts-manifest.json');
