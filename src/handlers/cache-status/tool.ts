import { ToolHandler } from '../../types/index.js';
import { handleCacheStatus } from './handler.js';

export const cacheStatusTool: ToolHandler = {
  definition: {
    name: 'paput_cache_status',
    description:
      'Inspect the local PaPut cache, including pending knowledge candidates, processed sessions, and the capture policy.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  handler: handleCacheStatus,
};
