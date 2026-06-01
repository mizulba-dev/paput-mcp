import { ToolHandler } from '../../types/index.js';
import { handleCacheStatus } from './handler.js';

export const cacheStatusTool: ToolHandler = {
  definition: {
    name: 'paput_cache_status',
    description:
      'Inspect the local PaPut cache, including cached memos, pending knowledge candidates, processed sessions, and the last remote sync timestamp.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  handler: handleCacheStatus,
};
