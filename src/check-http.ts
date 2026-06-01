#!/usr/bin/env node

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const endpoint = process.env.MCP_HTTP_URL ?? process.argv[2];

if (!endpoint) {
  console.error(
    'Usage: MCP_HTTP_URL=https://example.onrender.com/mcp npm run check:http',
  );
  process.exit(1);
}

const client = new Client(
  {
    name: 'paput-mcp-http-check',
    version: '1.0.0',
  },
  {
    capabilities: {},
  },
);

try {
  const transport = new StreamableHTTPClientTransport(new URL(endpoint));
  await client.connect(transport);

  const result = await client.listTools();
  const toolNames = result.tools.map((tool) => tool.name);

  console.log(`Connected to ${endpoint}`);
  console.log(`Tools: ${toolNames.length}`);
  console.log(toolNames.join('\n'));
} finally {
  await client.close();
}
