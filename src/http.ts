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
import {
  createApiClient,
  getSkillSheetProjectByAlias,
} from './services/api/index.js';
import type { ResolvedProjectContext } from './types/index.js';

export interface HttpMcpServerOptions extends MCPServerOptions {
  allowedOrigins?: string[];
  endpoint?: string;
  host?: string;
  port?: number;
}

const OAUTH_SCOPES = ['paput.read', 'paput.write'] as const;
const MAX_REQUEST_BODY_BYTES = 5 * 1024 * 1024;
const FRONT_ORIGIN = 'https://paput.io';
const ICON_SOURCES: Record<string, string> = {
  '/apple-touch-icon.png': '/icons/apple-touch-icon.png',
  '/favicon.ico': '/favicon.ico',
  '/icon-192x192.png': '/icons/icon-192x192.png',
  '/icon-512x512.png': '/icons/icon-512x512.png',
  '/icon.png': '/icons/icon-192x192.png',
  '/icon.svg': '/icon.svg',
};

export async function startHttpMcpServer(
  options: HttpMcpServerOptions = {},
): Promise<HttpServer> {
  const endpoint = normalizeEndpoint(options.endpoint ?? '/mcp');
  const port = options.port ?? Number(process.env.PORT ?? 3000);
  // host 未指定は 0.0.0.0 全開放。ローカル開発では HOST=127.0.0.1 を渡すこと。
  const host = options.host ?? process.env.HOST;
  const apiUrl =
    options.apiUrl ?? process.env.PAPUT_API_URL ?? 'https://api.paput.io';
  const apiOrigin = new URL(apiUrl).origin;
  const configuredAllowedOrigins =
    options.allowedOrigins ??
    parseAllowedOrigins(process.env.PAPUT_ALLOWED_ORIGINS);

  const httpServer = createServer(async (req, res) => {
    try {
      await handleHttpRequest(req, res);
    } catch (error) {
      // 未捕捉例外（不正 Host 等）を吸収してプロセス停止を防ぐ。
      console.error('Unhandled error in MCP HTTP request handler:', error);
      if (!res.headersSent) {
        sendJsonRpcError(res, 400, -32000, 'Bad request');
      } else if (!res.writableEnded) {
        res.end();
      }
    }
  });

  async function handleHttpRequest(
    req: IncomingMessage,
    res: ServerResponse,
  ): Promise<void> {
    const requestUrl = new URL(
      req.url ?? '/',
      `http://${normalizeHostHeader(req.headers.host)}`,
    );
    const publicOrigin = getPublicOrigin(req, requestUrl);
    const effectiveEndpoint = resolveEndpoint(requestUrl.pathname, endpoint);
    const protectedResourceMetadataUrl =
      getProtectedResourceMetadataUrl(publicOrigin);

    if (requestUrl.pathname === '/healthz') {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
      return;
    }

    if (requestUrl.pathname === '/robots.txt') {
      sendRobotsTxt(res);
      return;
    }

    if (requestUrl.pathname === '/.well-known/openai-apps-challenge') {
      const token = process.env.OPENAI_APPS_DOMAIN_VERIFICATION_TOKEN;
      if (!token) {
        sendJsonRpcError(res, 404, -32000, 'Not found');
        return;
      }
      res.writeHead(200, { 'content-type': 'text/plain; charset=utf-8' });
      res.end(token);
      return;
    }

    const iconPath = ICON_SOURCES[requestUrl.pathname];
    if (iconPath) {
      await serveIcon(res, `${FRONT_ORIGIN}${iconPath}`);
      return;
    }

    if (
      requestUrl.pathname === '/.well-known/oauth-protected-resource' ||
      requestUrl.pathname.startsWith('/.well-known/oauth-protected-resource/')
    ) {
      sendJson(res, 200, {
        resource: getResourceUrl(publicOrigin, endpoint),
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

    // 公開案内ページはクローラー向けにも 200 を返す。MCP endpoint ではない。
    if (
      requestUrl.pathname === '/' &&
      (req.method === 'GET' || req.method === 'HEAD') &&
      !requestsEventStream(req)
    ) {
      sendLandingPage(res, req.method === 'HEAD');
      return;
    }

    if (!effectiveEndpoint) {
      sendJsonRpcError(res, 404, -32000, 'Not found');
      return;
    }

    if (
      !isAllowedOrigin(req, publicOrigin, apiOrigin, configuredAllowedOrigins)
    ) {
      sendJsonRpcError(res, 403, -32000, 'Forbidden origin.');
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

    const contentLength = parseInt(req.headers['content-length'] ?? '', 10);
    if (!isNaN(contentLength) && contentLength > MAX_REQUEST_BODY_BYTES) {
      sendJsonRpcError(res, 413, -32000, 'Request body too large.');
      return;
    }

    let parsedBody: unknown;
    try {
      parsedBody = await readRequestBody(req, MAX_REQUEST_BODY_BYTES);
    } catch (error) {
      if (error instanceof BodyTooLargeError) {
        sendJsonRpcError(res, 413, -32000, 'Request body too large.');
        return;
      }
      sendJsonRpcError(res, 400, -32000, 'Bad request');
      return;
    }

    const projectAlias = normalizeProjectAlias(
      requestUrl.searchParams.get('project_alias') ??
        requestUrl.searchParams.get('alias'),
    );
    if (projectAlias === false) {
      sendJsonRpcError(
        res,
        400,
        -32602,
        'project_alias must be 3-40 lowercase alphanumeric characters.',
      );
      return;
    }

    // alias の実在確認は handshake で行わない。ここで API を呼ぶと、
    // トークン失効時に 401 challenge を返せず client の OAuth 回復が壊れる。
    const mcpServer = createMcpServer({
      ...options,
      accessToken,
      projectAlias: projectAlias ?? options.projectAlias,
      resolveProject: projectAlias
        ? createProjectResolver(apiUrl, accessToken, projectAlias)
        : options.resolveProject,
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
      await transport.handleRequest(req, res, parsedBody);
    } catch (error) {
      console.error('Error handling MCP HTTP request:', error);
      if (!res.headersSent) {
        sendJsonRpcError(res, 500, -32603, 'Internal server error');
      }
    }
  }

  await new Promise<void>((resolve, reject) => {
    httpServer.once('error', reject);
    httpServer.listen(port, host, () => {
      httpServer.off('error', reject);
      resolve();
    });
  });

  return httpServer;
}

function normalizeEndpoint(endpoint: string): string {
  const trimmed = endpoint.trim();
  if (!trimmed || trimmed === '/') return '/';
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
}

function resolveEndpoint(pathname: string, endpoint: string): string | null {
  if (pathname === endpoint) return endpoint;
  return null;
}

export function normalizeProjectAlias(
  value: string | null,
): string | null | false {
  const alias = value?.trim() ?? '';
  if (!alias) return null;
  // Clients that do not substitute config placeholders (claude.ai web plugins, Codex) send the raw template.
  if (alias.includes('${')) return null;
  if (!/^[a-z0-9]{3,40}$/.test(alias)) return false;
  return alias;
}

function createProjectResolver(
  apiUrl: string,
  accessToken: string,
  projectAlias: string,
): () => Promise<ResolvedProjectContext | null> {
  let cached: Promise<ResolvedProjectContext | null> | undefined;
  return () => {
    cached ??= (async () => {
      const apiClient = createApiClient(apiUrl, accessToken);
      const project = await getSkillSheetProjectByAlias(
        apiClient,
        projectAlias,
      );
      if (!project) return null;
      return {
        projectId: project.id,
        projectTitle: project.title,
        projectAlias,
      };
    })();
    return cached;
  };
}

function parseAllowedOrigins(value?: string): string[] {
  return (value ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function requestsEventStream(req: IncomingMessage): boolean {
  const accept = req.headers.accept;
  const value = Array.isArray(accept) ? accept.join(',') : (accept ?? '');
  return value.toLowerCase().includes('text/event-stream');
}

function sendLandingPage(res: ServerResponse, headOnly = false): void {
  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>PaPut MCP Server</title>
    <link rel="icon" href="/favicon.ico" sizes="any" />
    <link rel="icon" type="image/svg+xml" href="/icon.svg" />
    <link rel="icon" type="image/png" sizes="192x192" href="/icon.png" />
    <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
    <link rel="canonical" href="https://mcp.paput.io/" />
  </head>
  <body>
    <h1>PaPut MCP Server</h1>
    <p>
      This is the remote Model Context Protocol server for
      <a href="https://paput.io">PaPut</a>. MCP clients should use
      <code>https://mcp.paput.io/mcp</code> and connect over HTTP POST with OAuth.
      See <a href="https://github.com/mizulba-dev/paput-mcp">the documentation</a>.
    </p>
  </body>
</html>
`;
  res.writeHead(200, {
    'content-type': 'text/html; charset=utf-8',
    'cache-control': 'public, max-age=3600',
  });
  if (headOnly) {
    res.end();
    return;
  }
  res.end(html);
}

async function serveIcon(
  res: ServerResponse,
  sourceUrl: string,
): Promise<void> {
  try {
    const upstream = await fetch(sourceUrl);
    if (upstream.ok) {
      const body = Buffer.from(await upstream.arrayBuffer());
      res.writeHead(200, {
        'content-type': upstream.headers.get('content-type') ?? 'image/x-icon',
        'cache-control': 'public, max-age=86400',
      });
      res.end(body);
      return;
    }
  } catch {
    // 失敗時は 307 リダイレクトにフォールバック
  }
  res.writeHead(307, { location: sourceUrl });
  res.end();
}

function isAllowedOrigin(
  req: IncomingMessage,
  publicOrigin: string,
  apiOrigin: string,
  configuredAllowedOrigins: string[],
): boolean {
  const originHeader = req.headers.origin;
  const origin = Array.isArray(originHeader) ? originHeader[0] : originHeader;

  if (!origin) {
    return true;
  }

  const allowedOrigins = new Set([
    publicOrigin,
    apiOrigin,
    FRONT_ORIGIN,
    'https://claude.ai',
    'https://claude.com',
    'https://chatgpt.com',
    'https://chat.openai.com',
    ...configuredAllowedOrigins,
  ]);

  return allowedOrigins.has(normalizeOrigin(origin));
}

function normalizeOrigin(origin: string): string {
  try {
    return new URL(origin).origin;
  } catch {
    return origin;
  }
}

// 不正な Host をそのまま new URL に渡すとクラッシュするため安全なデフォルトにフォールバック。
function normalizeHostHeader(host?: string | string[]): string {
  const value = Array.isArray(host) ? host[0] : host;
  if (!value) {
    return 'localhost';
  }
  if (/^[a-zA-Z0-9.\-_]+(:\d+)?$/.test(value)) {
    return value;
  }
  return 'localhost';
}

// X-Forwarded-Proto を信頼してしまう設定ミスは一度だけ警告する。
let warnedUntrustedForwardedProto = false;

function getPublicOrigin(req: IncomingMessage, requestUrl: URL): string {
  const configuredOrigin = process.env.PAPUT_PUBLIC_ORIGIN?.trim();
  if (configuredOrigin) {
    return normalizeOrigin(configuredOrigin);
  }

  const protoHeader = req.headers['x-forwarded-proto'];
  const forwardedProto = Array.isArray(protoHeader)
    ? protoHeader[0]
    : protoHeader;

  // PAPUT_PUBLIC_ORIGIN 未設定時のみ X-Forwarded-Proto 詐称の警告を一度だけ出す。
  if (forwardedProto && !warnedUntrustedForwardedProto) {
    warnedUntrustedForwardedProto = true;
    console.error(
      'WARNING: PAPUT_PUBLIC_ORIGIN is not set but X-Forwarded-Proto is present. ' +
        'Set PAPUT_PUBLIC_ORIGIN explicitly when running behind a proxy or on a public host ' +
        'to avoid origin spoofing.',
    );
  }

  const scheme = forwardedProto ?? requestUrl.protocol.replace(':', '');
  return `${scheme}://${normalizeHostHeader(req.headers.host)}`;
}

function getResourceUrl(publicOrigin: string, endpoint: string): string {
  return endpoint === '/' ? publicOrigin : `${publicOrigin}${endpoint}`;
}

function getProtectedResourceMetadataUrl(publicOrigin: string): string {
  return `${publicOrigin}/.well-known/oauth-protected-resource`;
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

function sendRobotsTxt(res: ServerResponse): void {
  res.writeHead(200, {
    'content-type': 'text/plain; charset=utf-8',
    'cache-control': 'public, max-age=3600',
  });
  res.end('User-agent: *\nAllow: /\n');
}

class BodyTooLargeError extends Error {}

async function readRequestBody(
  req: IncomingMessage,
  maxBytes: number,
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let bytesRead = 0;

    req.on('data', (chunk: Buffer) => {
      bytesRead += chunk.length;
      if (bytesRead > maxBytes) {
        req.destroy();
        reject(new BodyTooLargeError('Request body too large'));
        return;
      }
      chunks.push(chunk);
    });

    req.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      } catch {
        reject(new Error('Invalid JSON body'));
      }
    });

    req.on('error', reject);
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  // 未捕捉例外・リジェクションでプロセスを落とさない。
  process.on('unhandledRejection', (reason) => {
    console.error('Unhandled promise rejection:', reason);
  });
  process.on('uncaughtException', (error) => {
    console.error('Uncaught exception:', error);
  });

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
