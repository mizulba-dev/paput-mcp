import { createRequire } from 'node:module';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { setupTool } from './tool.js';
import { setupErrorHandling } from './utils/error-handler.js';

const require = createRequire(import.meta.url);
const packageJson = require('../package.json') as { version: string };

export interface MCPServerOptions {
  apiUrl?: string;
  accessToken?: string;
  includeLocalTools?: boolean;
  projectMatch?: string;
}

export function createMcpServer(options: MCPServerOptions = {}): Server {
  const accessToken = options.accessToken;
  const apiUrl =
    options.apiUrl ?? process.env.PAPUT_API_URL ?? 'https://api.paput.io';

  const server = new Server(
    {
      name: 'paput-mcp',
      version: packageJson.version,
    },
    {
      capabilities: {
        tools: {},
        resources: {},
      },
    },
  );

  setupTool(
    server,
    apiUrl,
    accessToken,
    {
      projectMatch: options.projectMatch,
    },
    {
      includeLocalTools: options.includeLocalTools,
    },
  );
  setupErrorHandling(server);

  return server;
}

export class MCPServer {
  private server: Server;

  constructor(options: MCPServerOptions = {}) {
    this.server = createMcpServer(options);
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();

    transport.onerror = (error: unknown) => {
      console.error(`MCP error: ${error}`);
    };

    await this.server.connect(transport);
  }
}
