import { ToolHandler } from '../../types/index.js';
import { handleSyncRemoteMemos } from './handler.js';

export const syncRemoteMemosTool: ToolHandler = {
  definition: {
    name: 'paput_sync_remote_memos',
    description:
      'Sync existing PaPut memos into the local cache to improve duplicate detection for knowledge candidates.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: 'Number of items per page. Maximum 100.',
        },
        max_pages: {
          type: 'number',
          description: 'Maximum number of pages to fetch. Defaults to 20.',
        },
      },
    },
  },
  handler: handleSyncRemoteMemos,
};
