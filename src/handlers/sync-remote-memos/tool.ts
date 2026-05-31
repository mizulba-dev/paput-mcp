import { ToolHandler } from '../../types/index.js';
import { handleSyncRemoteMemos } from './handler.js';

export const syncRemoteMemosTool: ToolHandler = {
  definition: {
    name: 'paput_sync_remote_memos',
    description: 'PaPut の既存メモをローカルキャッシュへ同期します',
    inputSchema: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: '1ページあたりの取得件数。最大100です',
        },
        max_pages: {
          type: 'number',
          description: '取得する最大ページ数。デフォルトは20です',
        },
      },
    },
  },
  handler: handleSyncRemoteMemos,
};
