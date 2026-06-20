import { createRequire } from 'node:module';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { setupTool } from './tool.js';
import { setupErrorHandling } from './utils/error-handler.js';

const require = createRequire(import.meta.url);
const packageJson = require('../package.json') as { version: string };

export interface MCPServerOptions {
  apiUrl?: string;
  accessToken?: string;
  projectId?: number;
  projectTitle?: string;
  projectAlias?: string;
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
      projectId: options.projectId,
      projectTitle: options.projectTitle,
      projectAlias: options.projectAlias,
    },
  );
  setupErrorHandling(server);

  return server;
}
