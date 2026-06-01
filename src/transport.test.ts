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
  it('serves registered tools through an in-memory stdio-compatible transport', async () => {
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
      'paput_create_memo',
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
      );

      await client.connect(transport);
      const result = await client.listTools();

      expect(result.tools.map((tool) => tool.name)).toContain(
        'paput_search_memo',
      );
      expect(result.tools.map((tool) => tool.name)).toContain(
        'paput_create_memo',
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

  it('returns an explicit error when a tool needs an API key but none is configured', async () => {
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
          text: expect.stringContaining('PAPUT_API_KEY is not configured'),
        }),
      ]),
    );

    await mcpServer.close();
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
