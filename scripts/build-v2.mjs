import { build } from 'esbuild';
import path from 'node:path';
import { stat } from 'node:fs/promises';

const outfile = path.resolve('dist/v2-game.bundle.js');
await build({
  entryPoints: [path.resolve('dist/v2-real-preview.js')],
  bundle: true,
  minify: true,
  format: 'esm',
  platform: 'browser',
  target: ['es2022'],
  outfile,
  alias: { three: path.resolve('dist/vendor/three/three.module.js') },
  legalComments: 'none',
});
const meta = await stat(outfile);
console.log(`Built dist/v2-game.bundle.js: ${(meta.size / 1024).toFixed(1)} KB`);
