import { type AddressInfo } from 'node:net';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { afterEach, describe, expect, it } from 'vitest';
import { startHttpMcpServer } from './http.js';
import { createMcpServer } from './server.js';

const testServerOptions = {
  apiUrl: 'https://api.example.test',
};

const clients: Client[] = [];

afterEach(async () => {
  await Promise.allSettled(clients.splice(0).map((client) => client.close()));
});

describe('MCP transports', () => {
  it('serves registered tools through an in-memory transport', async () => {
    const mcpServer = createMcpServer(testServerOptions);
    const client = createTestClient();
    clients.push(client);

    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();

    await Promise.all([
      mcpServer.connect(serverTransport),
      client.connect(clientTransport),
    ]);

    const result = await client.listTools();

    expect(result.tools.map((tool) => tool.name)).toContain(
      'paput_search_memo',
    );
    expect(result.tools.map((tool) => tool.name)).toContain(
      'paput_create_memos',
    );

    await mcpServer.close();
  });

  it('serves registered tools through Streamable HTTP', async () => {
    const httpServer = await startHttpMcpServer({
      ...testServerOptions,
      host: '127.0.0.1',
      port: 0,
    });

    try {
      const address = httpServer.address() as AddressInfo;
      const client = createTestClient();
      clients.push(client);
      const transport = new StreamableHTTPClientTransport(
        new URL(`http://127.0.0.1:${address.port}/mcp`),
        {
          requestInit: {
            headers: { Authorization: 'Bearer test-access-token' },
          },
        },
      );

      await client.connect(transport);
      const result = await client.listTools();

      expect(result.tools.map((tool) => tool.name)).toContain(
        'paput_search_memo',
      );
      expect(result.tools.map((tool) => tool.name)).toContain(
        'paput_create_memos',
      );
      expect(result.tools.map((tool) => tool.name)).toContain(
        'paput_mark_processed_session',
      );
    } finally {
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
  });

  it('returns an explicit error when a tool needs authentication but none is configured', async () => {
    const mcpServer = createMcpServer(testServerOptions);
    const client = createTestClient();
    clients.push(client);

    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();

    await Promise.all([
      mcpServer.connect(serverTransport),
      client.connect(clientTransport),
    ]);

    const result = await client.callTool({
      name: 'paput_search_memo',
      arguments: {},
    });

    expect(result.isError).toBe(true);
    expect(result.content).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'text',
          text: expect.stringContaining(
            'PaPut authentication is not configured',
          ),
        }),
      ]),
    );

    await mcpServer.close();
  });

  it('publishes OAuth protected resource metadata', async () => {
    const httpServer = await startHttpMcpServer({
      ...testServerOptions,
      host: '127.0.0.1',
      port: 0,
    });

    try {
      const address = httpServer.address() as AddressInfo;
      const response = await fetch(
        `http://127.0.0.1:${address.port}/.well-known/oauth-protected-resource`,
      );
      const metadata = await response.json();

      expect(response.status).toBe(200);
      expect(metadata.resource).toBe(`http://127.0.0.1:${address.port}/mcp`);
      expect(metadata.resource_name).toBe('PaPut');
      expect(metadata.authorization_servers).toEqual([
        'https://api.example.test',
      ]);
      expect(metadata.scopes_supported).toEqual(['paput.read', 'paput.write']);
    } finally {
      await closeHttpServer(httpServer);
    }
  });

  it('challenges unauthenticated HTTP MCP requests', async () => {
    const httpServer = await startHttpMcpServer({
      ...testServerOptions,
      host: '127.0.0.1',
      port: 0,
    });

    try {
      const address = httpServer.address() as AddressInfo;
      const response = await fetch(`http://127.0.0.1:${address.port}/mcp`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', method: 'tools/list', id: 1 }),
      });

      expect(response.status).toBe(401);
      expect(response.headers.get('www-authenticate')).toContain(
        `resource_metadata="http://127.0.0.1:${address.port}/.well-known/oauth-protected-resource"`,
      );
      expect(response.headers.get('www-authenticate')).toContain(
        'scope="paput.read paput.write"',
      );
    } finally {
      await closeHttpServer(httpServer);
    }
  });

  it('rejects HTTP MCP requests from disallowed origins', async () => {
    const httpServer = await startHttpMcpServer({
      ...testServerOptions,
      host: '127.0.0.1',
      port: 0,
      allowedOrigins: ['https://allowed.example.test'],
    });

    try {
      const address = httpServer.address() as AddressInfo;
      const response = await fetch(`http://127.0.0.1:${address.port}/mcp`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          origin: 'https://evil.example.test',
        },
        body: JSON.stringify({ jsonrpc: '2.0', method: 'tools/list', id: 1 }),
      });
      const body = await response.json();

      expect(response.status).toBe(403);
      expect(body.error.message).toBe('Forbidden origin.');
    } finally {
      await closeHttpServer(httpServer);
    }
  });

  it('allows HTTP MCP requests from configured origins', async () => {
    const httpServer = await startHttpMcpServer({
      ...testServerOptions,
      host: '127.0.0.1',
      port: 0,
      allowedOrigins: ['https://allowed.example.test'],
    });

    try {
      const address = httpServer.address() as AddressInfo;
      const response = await fetch(`http://127.0.0.1:${address.port}/mcp`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          origin: 'https://allowed.example.test',
        },
        body: JSON.stringify({ jsonrpc: '2.0', method: 'tools/list', id: 1 }),
      });

      expect(response.status).toBe(401);
    } finally {
      await closeHttpServer(httpServer);
    }
  });

  it('serves common icon requests from PaPut frontend assets', async () => {
    const httpServer = await startHttpMcpServer({
      ...testServerOptions,
      host: '127.0.0.1',
      port: 0,
    });

    try {
      const address = httpServer.address() as AddressInfo;
      const response = await fetch(
        `http://127.0.0.1:${address.port}/favicon.ico`,
        { redirect: 'manual' },
      );

      // 上流 200 直接配信、失敗時は 307 フォールバック。
      expect([200, 307]).toContain(response.status);
      if (response.status === 307) {
        expect(response.headers.get('location')).toBe(
          'https://paput.io/favicon.ico',
        );
      } else {
        expect(response.headers.get('content-type')).toBeTruthy();
      }
    } finally {
      await closeHttpServer(httpServer);
    }
  });
});

function createTestClient(): Client {
  return new Client(
    {
      name: 'paput-mcp-transport-test',
      version: '1.0.0',
    },
    {
      capabilities: {},
    },
  );
}

async function closeHttpServer(
  httpServer: Awaited<ReturnType<typeof startHttpMcpServer>>,
) {
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
