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
  allowedOrigins?: string[];
  endpoint?: string;
  host?: string;
  port?: number;
}

const OAUTH_SCOPES = ['paput.read', 'paput.write'] as const;
const FRONT_ORIGIN = 'https://paput.io';
// アイコン系は paput.io 上の実体を 200 で直接配信する（プロキシ）。
// 307 リダイレクトだと Google favicon クローラーや一部クライアントがクロスドメイン
// リダイレクトを追わず、ディレクトリ/ツールコールのアイコンが汎用アイコンになってしまうため。
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
  const endpoint = options.endpoint ?? '/';
  const port = options.port ?? Number(process.env.PORT ?? 3000);
  // 既定はローカル安全のため 127.0.0.1。外部公開する本番（Render 等）では
  // HOST=0.0.0.0 を明示的に設定する。
  const host = options.host ?? process.env.HOST ?? '127.0.0.1';
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
      // 不正な Host ヘッダーによる new URL の例外などをここで捕捉し、
      // 未捕捉の Promise リジェクションでプロセスが落ちるのを防ぐ。
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

    const iconPath = ICON_SOURCES[requestUrl.pathname];
    if (iconPath) {
      await serveIcon(res, `${FRONT_ORIGIN}${iconPath}`);
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

    if (
      !isAllowedOrigin(req, publicOrigin, apiOrigin, configuredAllowedOrigins)
    ) {
      sendJsonRpcError(res, 403, -32000, 'Forbidden origin.');
      return;
    }

    // ブラウザ/クローラーの GET には favicon リンク付きの最小 HTML を 200 で返す。
    // Google favicon クローラーがルートを GET したとき <link rel="icon"> を発見できるようにし、
    // ディレクトリ/ツールコールのアイコンが正しく解決されるようにするため。
    // MCP の SSE プローブ(GET + Accept: text/event-stream)だけ 405 を維持する。
    // Accept に text/html を含むかではなく SSE 要求かどうかで判定するのは、
    // Google のクローラーが */* など text/html を明示しない Accept を送る場合に
    // 405(=他の4xx)で弾かれ、favicon を取得できなくなるのを防ぐため。
    if (req.method === 'GET' && !requestsEventStream(req)) {
      sendLandingPage(res);
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

function parseAllowedOrigins(value?: string): string[] {
  return (value ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

// MCP の Streamable HTTP クライアントが SSE ストリームを開こうとする GET かどうか。
// これらにはランディング HTML ではなく従来どおり 405 を返す。
function requestsEventStream(req: IncomingMessage): boolean {
  const accept = req.headers.accept;
  const value = Array.isArray(accept) ? accept.join(',') : (accept ?? '');
  return value.toLowerCase().includes('text/event-stream');
}

// ブラウザ/クローラー向けのランディング HTML。favicon リンクを明示して発見性を高める。
function sendLandingPage(res: ServerResponse): void {
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
    <link rel="canonical" href="https://paput.io" />
  </head>
  <body>
    <h1>PaPut MCP Server</h1>
    <p>
      This is the remote Model Context Protocol endpoint for
      <a href="https://paput.io">PaPut</a>. MCP clients connect over HTTP POST
      with OAuth. See <a href="https://github.com/mizulba-dev/paput-mcp">the documentation</a>.
    </p>
  </body>
</html>
`;
  res.writeHead(200, {
    'content-type': 'text/html; charset=utf-8',
    'cache-control': 'public, max-age=3600',
  });
  res.end(html);
}

// 上流(paput.io)のアイコンを取得し 200 で直接返す。失敗時のみ 307 リダイレクトにフォールバック。
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
    // フォールスルーしてリダイレクトする
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

// Host ヘッダーを妥当な host[:port] に正規化する。不正な値（空白や制御文字を
// 含むもの）はそのまま new URL に渡すと例外を投げ、未捕捉リジェクションで
// プロセスがクラッシュする恐れがあるため、安全なデフォルトにフォールバックする。
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

function getPublicOrigin(req: IncomingMessage, requestUrl: URL): string {
  // 信頼できるプロキシ背後では、公開オリジンを環境変数で固定して
  // Host / X-Forwarded-Proto 詐称の影響を排除できる。
  const configuredOrigin = process.env.PAPUT_PUBLIC_ORIGIN?.trim();
  if (configuredOrigin) {
    return normalizeOrigin(configuredOrigin);
  }

  const protoHeader = req.headers['x-forwarded-proto'];
  const forwardedProto = Array.isArray(protoHeader)
    ? protoHeader[0]
    : protoHeader;
  const scheme = forwardedProto ?? requestUrl.protocol.replace(':', '');
  return `${scheme}://${normalizeHostHeader(req.headers.host)}`;
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
  // 未捕捉の Promise リジェクション / 例外でプロセスを落とさない（DoS 耐性）。
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
      console.error('MCP endpoint: /');
    })
    .catch((error) => {
      console.error('Unexpected error:', error);
      process.exit(1);
    });
}
