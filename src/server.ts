import { createRequire } from 'node:module';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { setupTool } from './tool.js';
import { setupErrorHandling } from './utils/error-handler.js';

const require = createRequire(import.meta.url);
const packageJson = require('../package.json') as { version: string };

export class MCPServer {
  private server: Server;

  constructor() {
    // 環境変数の取得
    const apiKey = process.env.PAPUT_API_KEY;
    const apiUrl = process.env.PAPUT_API_URL ?? 'https://api.paput.io';

    if (!apiKey) {
      throw new Error('PAPUT_API_KEY environment variable is not set');
    }

    // サーバーの初期化
    this.server = new Server(
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

    // ツールとエラーハンドリングのセットアップ
    setupTool(this.server, apiUrl, apiKey);
    setupErrorHandling(this.server);
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();

    transport.onerror = (error: unknown) => {
      console.error(`MCPエラー発生: ${error}`);
    };

    await this.server.connect(transport);
  }
}
