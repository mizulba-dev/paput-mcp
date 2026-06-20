import { setupAi } from './setup-ai.js';
import { exportSkill } from './export-skill.js';

export async function runCli(args: string[]): Promise<boolean> {
  const command = args[0];

  if (!command) {
    printHelp();
    return true;
  }

  if (command === 'setup-ai') {
    setupAi(args.slice(1));
    return true;
  }

  if (command === 'export-skill') {
    try {
      exportSkill(args.slice(1));
    } catch (error) {
      console.error(error instanceof Error ? error.message : error);
      process.exitCode = 1;
    }
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
  paput-mcp setup-ai    Set up PaPut integration for Claude/Codex
  paput-mcp export-skill [name]
                         Export PaPut skill ZIP files for Claude Desktop

Options:
  --force               Refresh existing PaPut-managed links and rules
  --no-rules            Do not update global rules
  --claude-only         Configure Claude only
  --codex-only          Configure Codex only
  -o, --output <PATH>   Output directory or ZIP path for export-skill. Defaults to ~/Downloads

PaPut MCP connections use Remote HTTP mode:
  https://mcp.paput.io/mcp
`);
}
