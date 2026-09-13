import { readFile, stat } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import assert from 'node:assert/strict';

for (const file of ['dist/app.js', 'dist/engine.js', 'scripts/serve.mjs']) {
  const r = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(r.stderr);
}
const html = await readFile('dist/index.html', 'utf8');
const css = await readFile('dist/style.css', 'utf8');
const app = await readFile('dist/app.js', 'utf8');
const files = new Set(['index.html', 'app.js', 'engine.js', 'style.css']);
for (const match of html.matchAll(/(?:src|href)="([^"]+)"/g)) if (!/^(data:|https?:|#)/.test(match[1])) files.add(match[1]);
for (const match of css.matchAll(/url\(['"]?([^)'"\s]+)['"]?\)/g)) files.add(match[1]);
for (const match of app.matchAll(/['"](assets\/[^'"]+)['"]/g)) files.add(match[1]);
let bytes = 0;
for (const file of files) {
  const resolved = path.resolve('dist', file); assert.ok(resolved.startsWith(path.resolve('dist') + path.sep));
  const meta = await stat(resolved); assert.ok(meta.isFile() && meta.size > 0, `${file} is missing or empty`); bytes += meta.size;
  if (file.endsWith('.webp')) { const image = await readFile(resolved); assert.equal(image.toString('ascii', 0, 4), 'RIFF'); assert.equal(image.toString('ascii', 8, 12), 'WEBP'); }
}
const manifest = JSON.parse((await readFile('.openai/hosting.json', 'utf8')).replace(/^\uFEFF/, ''));
assert.equal(manifest.static.directory, 'dist');
assert.match(html, /<html lang="zh-CN">/); assert.match(html, /type="module" src="app.js"/);
assert.equal((html.match(/id="[^"]+"/g) || []).length, new Set(html.match(/id="[^"]+"/g)).size, 'Duplicate HTML ids');
console.log(`JavaScript syntax and ${files.size} static files passed. Initial payload: ${(bytes / 1024 / 1024).toFixed(2)} MB.`);
