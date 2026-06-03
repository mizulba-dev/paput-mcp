#!/usr/bin/env node

import {
  createServer,
  type IncomingMessage,
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

const OAUTH_SCOPES = ['paput.read', 'paput.write'] as const;
const FRONT_ORIGIN = 'https://paput.io';
const ICON_REDIRECTS: Record<string, string> = {
  '/apple-touch-icon.png': '/icons/apple-touch-icon.png',
  '/favicon.ico': '/favicon.ico',
  '/icon.ico': '/icon.ico',
};

export async function startHttpMcpServer(
  options: HttpMcpServerOptions = {},
): Promise<HttpServer> {
  const endpoint = options.endpoint ?? '/';
  const port = options.port ?? Number(process.env.PORT ?? 3000);
  const host = options.host ?? process.env.HOST;
  const apiUrl =
    options.apiUrl ?? process.env.PAPUT_API_URL ?? 'https://api.paput.io';
  const apiOrigin = new URL(apiUrl).origin;

  const httpServer = createServer(async (req, res) => {
    const requestUrl = new URL(
      req.url ?? '/',
      `http://${req.headers.host ?? 'localhost'}`,
    );
    const publicOrigin = getPublicOrigin(req, requestUrl);
    const resourceUrl = getResourceUrl(publicOrigin, endpoint);
    const protectedResourceMetadataUrl = getProtectedResourceMetadataUrl(
      publicOrigin,
      endpoint,
    );

    if (requestUrl.pathname === '/healthz') {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
      return;
    }

    const iconPath = ICON_REDIRECTS[requestUrl.pathname];
    if (iconPath) {
      res.writeHead(307, { location: `${FRONT_ORIGIN}${iconPath}` });
      res.end();
      return;
    }

    if (requestUrl.pathname === '/.well-known/oauth-protected-resource') {
      sendJson(res, 200, {
        resource: resourceUrl,
        resource_name: 'PaPut',
        authorization_servers: [apiOrigin],
        scopes_supported: OAUTH_SCOPES,
        bearer_methods_supported: ['header'],
      });
      return;
    }

    if (requestUrl.pathname === '/.well-known/oauth-authorization-server') {
      res.writeHead(307, {
        location: `${apiOrigin}/.well-known/oauth-authorization-server`,
      });
      res.end();
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

    const accessToken = extractBearerToken(req.headers.authorization);
    if (!accessToken) {
      sendOAuthChallenge(res, protectedResourceMetadataUrl);
      return;
    }

    const mcpServer = createMcpServer({
      ...options,
      accessToken,
      includeLocalTools: false,
      projectMatch: options.projectMatch,
    });
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

function getPublicOrigin(req: IncomingMessage, requestUrl: URL): string {
  const protoHeader = req.headers['x-forwarded-proto'];
  const forwardedProto = Array.isArray(protoHeader)
    ? protoHeader[0]
    : protoHeader;
  const scheme = forwardedProto ?? requestUrl.protocol.replace(':', '');
  return `${scheme}://${req.headers.host ?? 'localhost'}`;
}

function getResourceUrl(publicOrigin: string, endpoint: string): string {
  return endpoint === '/' ? publicOrigin : `${publicOrigin}${endpoint}`;
}

function getProtectedResourceMetadataUrl(
  publicOrigin: string,
  endpoint: string,
): string {
  return endpoint === '/'
    ? `${publicOrigin}/.well-known/oauth-protected-resource`
    : `${publicOrigin}/.well-known/oauth-protected-resource${endpoint}`;
}

function extractBearerToken(authorizationHeader?: string): string | undefined {
  if (!authorizationHeader?.toLowerCase().startsWith('bearer ')) {
    return undefined;
  }
  const token = authorizationHeader.slice('bearer '.length).trim();
  return token || undefined;
}

function sendOAuthChallenge(
  res: ServerResponse,
  resourceMetadataUrl: string,
): void {
  res.writeHead(401, {
    'content-type': 'application/json',
    'www-authenticate': `Bearer resource_metadata="${resourceMetadataUrl}", scope="${OAUTH_SCOPES.join(' ')}"`,
  });
  res.end(
    JSON.stringify({
      error: 'unauthorized',
      error_description: 'OAuth authentication is required.',
    }),
  );
}

function sendJson(
  res: ServerResponse,
  statusCode: number,
  body: unknown,
): void {
  res.writeHead(statusCode, { 'content-type': 'application/json' });
  res.end(JSON.stringify(body));
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
      console.error('MCP endpoint: /');
    })
    .catch((error) => {
      console.error('Unexpected error:', error);
      process.exit(1);
    });
}
