import { setupAi } from './setup-ai.js';

export function runCli(args: string[]): boolean {
  const command = args[0];

  if (!command) return false;

  if (command === 'setup-ai') {
    setupAi(args.slice(1));
    return true;
  }

  if (command === '--help' || command === '-h' || command === 'help') {
    printHelp();
    return true;
  }

  console.error(`Unknown command: ${command}`);
  printHelp();
  process.exitCode = 1;
  return true;
}

function printHelp(): void {
  console.log(`Usage:
  paput-mcp             MCP サーバーを起動
  paput-mcp setup-ai    Claude/Codex 向け PaPut 連携を初期設定

Options:
  --force               PaPut 管理の既存リンク/ルールを更新
  --no-rules            グローバルルールを追記しない
  --claude-only         Claude のみ設定
  --codex-only          Codex のみ設定
`);
}
