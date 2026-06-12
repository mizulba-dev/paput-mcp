import { chmodSync, cpSync, rmSync } from 'node:fs';

const assets = ['skills', 'rules'];

for (const asset of assets) {
  rmSync(`dist/cli/${asset}`, { recursive: true, force: true });
  cpSync(`src/cli/${asset}`, `dist/cli/${asset}`, { recursive: true });
  console.log(`copied ${asset} to dist/cli/${asset}`);
}

chmodSync('dist/index.js', 0o755);
console.log('chmod 755 dist/index.js');
