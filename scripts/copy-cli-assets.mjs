import { cpSync } from 'node:fs';

const assets = ['skills', 'rules'];

for (const asset of assets) {
  cpSync(`src/cli/${asset}`, `dist/cli/${asset}`, { recursive: true });
  console.log(`copied ${asset} to dist/cli/${asset}`);
}
