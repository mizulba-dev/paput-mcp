import { chmodSync, cpSync, rmSync } from 'node:fs';

const assets = [
  { from: 'src/plugin/skills', to: 'dist/plugin/skills' },
  { from: 'src/cli/rules', to: 'dist/cli/rules' },
];

for (const { from, to } of assets) {
  rmSync(to, { recursive: true, force: true });
  cpSync(from, to, { recursive: true });
  console.log(`copied ${from} to ${to}`);
}

chmodSync('dist/index.js', 0o755);
console.log('chmod 755 dist/index.js');
