#!/usr/bin/env node

import { MCPServer } from './server.js';
import { runCli } from './cli/index.js';

if (runCli(process.argv.slice(2))) {
  process.exit(process.exitCode || 0);
}

const server = new MCPServer();
server.run().catch((error) => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
