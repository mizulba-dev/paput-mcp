import { ToolHandler } from '../../types/index.js';
import { handleCacheStatus } from './handler.js';

export const cacheStatusTool: ToolHandler = {
  definition: {
    name: 'paput_cache_status',
    description: 'PaPut のローカルキャッシュ状態を取得します',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  handler: handleCacheStatus,
};
