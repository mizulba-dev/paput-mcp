import { request, type IncomingHttpHeaders } from 'node:http';
import { type AddressInfo, type Server as HttpServer } from 'node:net';
import { afterEach, describe, expect, it } from 'vitest';
import { startHttpMcpServer } from './http.js';

const testServerOptions = {
  apiUrl: 'https://api.example.test',
};

interface RawResponse {
  status: number;
  headers: IncomingHttpHeaders;
  body: string;
}

describe('HTTP MCP server security handling', () => {
  const servers: HttpServer[] = [];
  const originalPublicOrigin = process.env.PAPUT_PUBLIC_ORIGIN;

  afterEach(async () => {
    if (originalPublicOrigin === undefined) {
      delete process.env.PAPUT_PUBLIC_ORIGIN;
    } else {
      process.env.PAPUT_PUBLIC_ORIGIN = originalPublicOrigin;
    }
    await Promise.all(servers.splice(0).map(closeHttpServer));
  });

  async function startTestServer(): Promise<number> {
    const httpServer = await startHttpMcpServer({
      ...testServerOptions,
      host: '127.0.0.1',
      port: 0,
    });
    servers.push(httpServer);
    return (httpServer.address() as AddressInfo).port;
  }

  it('serves the health check endpoint', async () => {
    const port = await startTestServer();

    const response = await fetch(`http://127.0.0.1:${port}/healthz`);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
  });

  it('returns 404 for unknown paths', async () => {
    const port = await startTestServer();

    const response = await fetch(`http://127.0.0.1:${port}/unknown`);
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error.message).toBe('Not found');
  });

  it('serves a landing page for browser GET requests', async () => {
    const port = await startTestServer();

    const response = await fetch(`http://127.0.0.1:${port}/`, {
      headers: { accept: 'text/html' },
    });
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/html');
    expect(html).toContain('href="/favicon.ico"');
  });

  it('keeps returning 405 for SSE stream GET requests', async () => {
    const port = await startTestServer();

    const response = await fetch(`http://127.0.0.1:${port}/`, {
      headers: { accept: 'text/event-stream' },
    });
    const body = await response.json();

    expect(response.status).toBe(405);
    expect(response.headers.get('allow')).toBe('POST');
    expect(body.error.message).toBe('Method not allowed.');
  });

  it('rejects non-POST methods on the MCP endpoint', async () => {
    const port = await startTestServer();

    const response = await fetch(`http://127.0.0.1:${port}/`, {
      method: 'DELETE',
    });

    expect(response.status).toBe(405);
    expect(response.headers.get('allow')).toBe('POST');
  });

  it('redirects authorization server metadata to the API origin', async () => {
    const port = await startTestServer();

    const response = await fetch(
      `http://127.0.0.1:${port}/.well-known/oauth-authorization-server`,
      { redirect: 'manual' },
    );

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe(
      'https://api.example.test/.well-known/oauth-authorization-server',
    );
  });

  it('challenges requests with an empty bearer token', async () => {
    const port = await startTestServer();

    const response = await fetch(`http://127.0.0.1:${port}/`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: 'Bearer ',
      },
      body: JSON.stringify({ jsonrpc: '2.0', method: 'tools/list', id: 1 }),
    });

    expect(response.status).toBe(401);
    expect(response.headers.get('www-authenticate')).toContain(
      'resource_metadata=',
    );
  });

  it('challenges requests with a non-bearer authorization scheme', async () => {
    const port = await startTestServer();

    const response = await fetch(`http://127.0.0.1:${port}/`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: 'Basic dXNlcjpwYXNz',
      },
      body: JSON.stringify({ jsonrpc: '2.0', method: 'tools/list', id: 1 }),
    });

    expect(response.status).toBe(401);
  });

  it('builds the resource URL from X-Forwarded-Proto when no public origin is set', async () => {
    const port = await startTestServer();

    const response = await fetch(
      `http://127.0.0.1:${port}/.well-known/oauth-protected-resource`,
      { headers: { 'x-forwarded-proto': 'https' } },
    );
    const metadata = await response.json();

    expect(metadata.resource).toBe(`https://127.0.0.1:${port}`);
  });

  it('prefers PAPUT_PUBLIC_ORIGIN over request headers for the resource URL', async () => {
    process.env.PAPUT_PUBLIC_ORIGIN = 'https://mcp.example.test';
    const port = await startTestServer();

    const response = await fetch(
      `http://127.0.0.1:${port}/.well-known/oauth-protected-resource`,
      { headers: { 'x-forwarded-proto': 'https' } },
    );
    const metadata = await response.json();

    expect(metadata.resource).toBe('https://mcp.example.test');
  });

  it('falls back to localhost when the Host header is malformed', async () => {
    const port = await startTestServer();

    const response = await rawRequest(port, {
      path: '/.well-known/oauth-protected-resource',
      headers: { host: 'bad host header!!' },
    });
    const metadata = JSON.parse(response.body);

    expect(response.status).toBe(200);
    expect(metadata.resource).toBe('http://localhost');
  });
});

function rawRequest(
  port: number,
  options: { path: string; headers?: Record<string, string> },
): Promise<RawResponse> {
  return new Promise((resolve, reject) => {
    const req = request(
      {
        host: '127.0.0.1',
        port,
        method: 'GET',
        path: options.path,
        headers: options.headers,
        setHost: false,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () =>
          resolve({
            status: res.statusCode ?? 0,
            headers: res.headers,
            body: Buffer.concat(chunks).toString('utf8'),
          }),
        );
      },
    );
    req.on('error', reject);
    req.end();
  });
}

async function closeHttpServer(httpServer: HttpServer): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    httpServer.close((error) => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });
}
