import { createRequire } from 'node:module';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { setupTool } from './tool.js';
import { setupErrorHandling } from './utils/error-handler.js';
import type { ResolvedProjectContext } from './types/index.js';

const require = createRequire(import.meta.url);
const packageJson = require('../package.json') as { version: string };

export interface MCPServerOptions {
  apiUrl?: string;
  accessToken?: string;
  projectId?: number;
  projectTitle?: string;
  projectAlias?: string;
  resolveProject?: () => Promise<ResolvedProjectContext | null>;
}

export function createMcpServer(options: MCPServerOptions = {}): Server {
  const accessToken = options.accessToken;
  const apiUrl =
    options.apiUrl ?? process.env.PAPUT_API_URL ?? 'https://api.paput.io';

  const server = new Server(
    {
      name: 'paput-mcp',
      title: 'PaPut',
      version: packageJson.version,
      websiteUrl: 'https://paput.io',
      icons: [
        {
          src: 'https://paput.io/icons/icon-192x192.png',
          mimeType: 'image/png',
          sizes: ['192x192'],
        },
        {
          src: 'https://paput.io/icons/icon-512x512.png',
          mimeType: 'image/png',
          sizes: ['512x512'],
        },
      ],
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
      resolveProject: options.resolveProject,
    },
  );
  setupErrorHandling(server);

  return server;
}
