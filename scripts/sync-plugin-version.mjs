import { readFileSync, writeFileSync } from 'node:fs';

const { version } = JSON.parse(readFileSync('package.json', 'utf8'));

const manifests = [
  'src/plugin/.claude-plugin/plugin.json',
  'src/plugin/.codex-plugin/plugin.json',
];

for (const path of manifests) {
  const manifest = JSON.parse(readFileSync(path, 'utf8'));
  manifest.version = version;
  writeFileSync(path, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`synced ${path} to ${version}`);
}

// Claude ディレクトリは版未固定の npx launcher を Blocks にするため、headersHelper の npx は正確な版に固定する。
const claudeMcpPath = 'src/plugin/mcp/claude.json';
const claudeMcp = readFileSync(claudeMcpPath, 'utf8');
const launcherPattern = /npx -y paput-mcp(@[^\s"]+)? project-header/;
if (!launcherPattern.test(claudeMcp)) {
  throw new Error(
    `${claudeMcpPath}: paput-mcp project-header launcher not found`,
  );
}
writeFileSync(
  claudeMcpPath,
  claudeMcp.replace(
    launcherPattern,
    `npx -y paput-mcp@${version} project-header`,
  ),
);
console.log(`synced ${claudeMcpPath} launcher to ${version}`);
