import { cpSync, rmSync } from 'node:fs';

const assets = ['skills', 'rules'];

for (const asset of assets) {
  // ソースから削除した skill/rule が dist に残骸として残らないよう、コピー前に消す
  rmSync(`dist/cli/${asset}`, { recursive: true, force: true });
  cpSync(`src/cli/${asset}`, `dist/cli/${asset}`, { recursive: true });
  console.log(`copied ${asset} to dist/cli/${asset}`);
}
