#!/usr/bin/env node

import {
  createServer,
  type Server as HttpServer,
  type ServerResponse,
} from 'node:http';
import { fileURLToPath } from 'node:url';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createMcpServer, type MCPServerOptions } from './server.js';

export interface HttpMcpServerOptions extends MCPServerOptions {
  endpoint?: string;
  host?: string;
  port?: number;
}

export async function startHttpMcpServer(
  options: HttpMcpServerOptions = {},
): Promise<HttpServer> {
  const endpoint = options.endpoint ?? '/mcp';
  const port = options.port ?? Number(process.env.PORT ?? 3000);
  const host = options.host ?? process.env.HOST;

  const httpServer = createServer(async (req, res) => {
    const requestUrl = new URL(
      req.url ?? '/',
      `http://${req.headers.host ?? 'localhost'}`,
    );

    if (requestUrl.pathname === '/healthz') {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
      return;
    }

    if (requestUrl.pathname !== endpoint) {
      sendJsonRpcError(res, 404, -32000, 'Not found');
      return;
    }

    if (req.method !== 'POST') {
      res.setHeader('allow', 'POST');
      sendJsonRpcError(res, 405, -32000, 'Method not allowed.');
      return;
    }

    const mcpServer = createMcpServer(options);
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });

    transport.onerror = (error) => {
      console.error('MCP HTTP transport error:', error);
    };

    res.on('close', () => {
      void transport.close().catch((error) => {
        console.error('Failed to close MCP HTTP transport:', error);
      });
      void mcpServer.close().catch((error) => {
        console.error('Failed to close MCP server:', error);
      });
    });

    try {
      await mcpServer.connect(transport);
      await transport.handleRequest(req, res);
    } catch (error) {
      console.error('Error handling MCP HTTP request:', error);
      if (!res.headersSent) {
        sendJsonRpcError(res, 500, -32603, 'Internal server error');
      }
    }
  });

  await new Promise<void>((resolve, reject) => {
    httpServer.once('error', reject);
    httpServer.listen(port, host, () => {
      httpServer.off('error', reject);
      resolve();
    });
  });

  return httpServer;
}

function sendJsonRpcError(
  res: ServerResponse,
  statusCode: number,
  code: number,
  message: string,
): void {
  res.writeHead(statusCode, { 'content-type': 'application/json' });
  res.end(
    JSON.stringify({
      jsonrpc: '2.0',
      error: { code, message },
      id: null,
    }),
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  startHttpMcpServer()
    .then((server) => {
      const address = server.address();
      const listeningOn =
        typeof address === 'object' && address
          ? `${address.address}:${address.port}`
          : String(address);

      console.error(
        `PaPut MCP Streamable HTTP server listening on ${listeningOn}`,
      );
      console.error('MCP endpoint: /mcp');
    })
    .catch((error) => {
      console.error('Unexpected error:', error);
      process.exit(1);
    });
}
