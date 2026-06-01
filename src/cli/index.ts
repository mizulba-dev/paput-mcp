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
  paput-mcp             Start the MCP server
  paput-mcp setup-ai    Set up PaPut integration for Claude/Codex

Options:
  --force               Refresh existing PaPut-managed links and rules
  --no-rules            Do not update global rules
  --claude-only         Configure Claude only
  --codex-only          Configure Codex only
`);
}
