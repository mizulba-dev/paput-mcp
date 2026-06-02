import { login } from './login.js';
import { logout } from './logout.js';
import { setupAi } from './setup-ai.js';

export async function runCli(args: string[]): Promise<boolean> {
  const command = args[0];

  if (!command) return false;

  if (command === 'login') {
    try {
      await login(args.slice(1));
    } catch (error) {
      console.error(error instanceof Error ? error.message : error);
      process.exitCode = 1;
    }
    return true;
  }

  if (command === 'logout') {
    try {
      await logout(args.slice(1));
    } catch (error) {
      console.error(error instanceof Error ? error.message : error);
      process.exitCode = 1;
    }
    return true;
  }

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
  paput-mcp login       Log in to PaPut with OAuth for local CLI mode
  paput-mcp logout      Revoke and remove the local OAuth token cache
  paput-mcp setup-ai    Set up PaPut integration for Claude/Codex

Options:
  --api-url <URL>       PaPut API URL for login. Defaults to PAPUT_API_URL or https://api.paput.io
  --scopes <SCOPES>     Comma-separated OAuth scopes for login
  --no-open             Print the login URL without opening a browser
  --local-only          Remove local token cache without remote revoke during logout
  --force               Refresh existing PaPut-managed links and rules
  --no-rules            Do not update global rules
  --claude-only         Configure Claude only
  --codex-only          Configure Codex only
`);
}
