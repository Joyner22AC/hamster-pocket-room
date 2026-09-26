import { readFile, stat } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import assert from 'node:assert/strict';

for (const file of ['dist/app.js', 'dist/engine.js', 'dist/v2-prototype.js', 'dist/v2-real-preview.js', 'dist/v2-animation-lab.js', 'dist/v2-game.bundle.js', 'dist/v4-warm-cozy-preview.js', 'dist/v4-finished.js', 'dist/v5-living-hamster.js', 'dist/v6-hamster-reborn.js', 'dist/v7-hamster-alive.js', 'dist/vendor/three/GLTFLoader.js', 'dist/vendor/utils/BufferGeometryUtils.js', 'dist/vendor/utils/SkeletonUtils.js', 'scripts/serve.mjs']) {
  const r = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(r.stderr);
}
const html = await readFile('dist/index.html', 'utf8');
const css = await readFile('dist/style.css', 'utf8');
const app = await readFile('dist/app.js', 'utf8');
const prototypeHtml = await readFile('dist/v2-prototype.html', 'utf8');
const prototypeCss = await readFile('dist/v2-prototype.css', 'utf8');
const realHtml = await readFile('dist/v2-real-preview.html', 'utf8');
const realCss = await readFile('dist/v2-real-preview.css', 'utf8');
const animationHtml = await readFile('dist/v2-animation-lab.html', 'utf8');
const animationCss = await readFile('dist/v2-animation-lab.css', 'utf8');
const v4Html = await readFile('dist/v4-warm-cozy-preview.html', 'utf8');
const v4Css = await readFile('dist/v4-warm-cozy-preview.css', 'utf8');
const v4FinishedHtml = await readFile('dist/v4-finished.html', 'utf8');
const v4FinishedCss = await readFile('dist/v4-finished.css', 'utf8');
const v5Html = await readFile('dist/v5-living-hamster.html', 'utf8');
const v5Css = await readFile('dist/v5-living-hamster.css', 'utf8');
const v6Html = await readFile('dist/v6-hamster-reborn.html', 'utf8');
const v6Css = await readFile('dist/v6-hamster-reborn.css', 'utf8');
const v7Html = await readFile('dist/v7-hamster-alive.html', 'utf8');
const v7Css = await readFile('dist/v7-hamster-alive.css', 'utf8');
const files = new Set([
  'index.html', 'app.js', 'engine.js', 'style.css',
  'v2-prototype.html', 'v2-prototype.js', 'v2-prototype.css',
  'v2-real-preview.html', 'v2-real-preview.js', 'v2-real-preview.css', 'v2-game.bundle.js',
  'v2-animation-lab.html', 'v2-animation-lab.js', 'v2-animation-lab.css',
  'v4-warm-cozy-preview.html', 'v4-warm-cozy-preview.js', 'v4-warm-cozy-preview.css',
  'v4-finished.html', 'v4-finished.js', 'v4-finished.css',
  'v5-living-hamster.html', 'v5-living-hamster.js', 'v5-living-hamster.css', 'v5-assets/hamster-rig-parts.webp',
  'v6-hamster-reborn.html', 'v6-hamster-reborn.js', 'v6-hamster-reborn.css', 'v6-assets/hamster-v6-frames.webp',
  'v7-hamster-alive.html', 'v7-hamster-alive.js', 'v7-hamster-alive.css',
  'v4-assets/v4-room-bg.webp', 'v4-assets/v4-room-fg.webp', 'v4-assets/v4-wheel-wood.webp',
  'vendor/three/three.module.js', 'vendor/three/three.core.js', 'vendor/three/GLTFLoader.js', 'vendor/utils/BufferGeometryUtils.js', 'vendor/utils/SkeletonUtils.js', 'vendor/three-LICENSE.txt',
  'v2-assets-real/hamster-poly-google.glb', 'v2-assets-real/chairRounded.glb', 'v2-assets-real/bookcaseOpen.glb', 'v2-assets-real/rugRound.glb',
  'v2-assets-real/plantSmall1.glb', 'v2-assets-real/lampRoundFloor.glb', 'v2-assets-real/tableCoffee.glb', 'v2-assets-real/animal-bunny-cc0.glb', 'v2-assets-real/hamchan-cc0.glb', 'v2-assets-real/CREDITS.txt'
]);
for (const source of [html, prototypeHtml, realHtml, animationHtml, v4Html, v4FinishedHtml, v5Html, v6Html, v7Html]) for (const match of source.matchAll(/(?:src|href)="([^"]+)"/g)) if (!/^(data:|https?:|#)/.test(match[1])) files.add(match[1]);
for (const source of [css, prototypeCss, realCss, animationCss, v4Css, v4FinishedCss, v5Css, v6Css, v7Css]) for (const match of source.matchAll(/url\(['"]?([^)'"\s]+)['"]?\)/g)) files.add(match[1]);
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
assert.match(prototypeHtml, /<html lang="zh-CN">/); assert.match(prototypeHtml, /type="module" src="v2-prototype.js"/);
assert.match(realHtml, /<html lang="zh-CN">/); assert.match(realHtml, /type="module" src="v2-game.bundle.js"/);
assert.match(animationHtml, /<html lang="zh-CN">/); assert.match(animationHtml, /type="module" src="v2-animation-lab.js"/);
assert.match(v4Html, /<html lang="zh-CN">/); assert.match(v4Html, /type="module" src="v4-warm-cozy-preview.js"/);
assert.match(v4FinishedHtml, /<html lang="zh-CN">/); assert.match(v4FinishedHtml, /type="module" src="v4-finished.js"/);
assert.match(v5Html, /<html lang="zh-CN">/); assert.match(v5Html, /type="module" src="v5-living-hamster.js"/);
assert.match(v6Html, /<html lang="zh-CN">/); assert.match(v6Html, /type="module" src="v6-hamster-reborn.js"/);
assert.match(v7Html, /<html lang="zh-CN">/); assert.match(v7Html, /type="module" src="\.\/v7-hamster-alive.js"/);
assert.equal((html.match(/id="[^"]+"/g) || []).length, new Set(html.match(/id="[^"]+"/g)).size, 'Duplicate HTML ids');
assert.equal((prototypeHtml.match(/id="[^"]+"/g) || []).length, new Set(prototypeHtml.match(/id="[^"]+"/g)).size, 'Duplicate V2 HTML ids');
assert.equal((realHtml.match(/id="[^"]+"/g) || []).length, new Set(realHtml.match(/id="[^"]+"/g)).size, 'Duplicate real-asset V2 HTML ids');
assert.equal((animationHtml.match(/id="[^"]+"/g) || []).length, new Set(animationHtml.match(/id="[^"]+"/g)).size, 'Duplicate animation-lab HTML ids');
assert.equal((v4Html.match(/id="[^"]+"/g) || []).length, new Set(v4Html.match(/id="[^"]+"/g)).size, 'Duplicate V4 HTML ids');
assert.equal((v4FinishedHtml.match(/id="[^"]+"/g) || []).length, new Set(v4FinishedHtml.match(/id="[^"]+"/g)).size, 'Duplicate V4 finished HTML ids');
assert.equal((v5Html.match(/id="[^"]+"/g) || []).length, new Set(v5Html.match(/id="[^"]+"/g)).size, 'Duplicate V5 HTML ids');
assert.equal((v6Html.match(/id="[^"]+"/g) || []).length, new Set(v6Html.match(/id="[^"]+"/g)).size, 'Duplicate V6 HTML ids');
assert.equal((v7Html.match(/id="[^"]+"/g) || []).length, new Set(v7Html.match(/id="[^"]+"/g)).size, 'Duplicate V7 HTML ids');
const candidateFiles = ['v2-real-preview.html','v2-real-preview.css','v2-game.bundle.js','v2-assets-real/hamchan-cc0.glb','v2-assets-real/chairRounded.glb','v2-assets-real/bookcaseOpen.glb','v2-assets-real/rugRound.glb','v2-assets-real/plantSmall1.glb','v2-assets-real/lampRoundFloor.glb','v2-assets-real/tableCoffee.glb'];
let candidateBytes=0; for (const file of candidateFiles) candidateBytes += (await stat(path.resolve('dist', file))).size;
console.log(`JavaScript syntax and ${files.size} static files passed. Repository payload: ${(bytes / 1024 / 1024).toFixed(2)} MB. V2 candidate: ${(candidateBytes / 1024 / 1024).toFixed(2)} MB.`);
