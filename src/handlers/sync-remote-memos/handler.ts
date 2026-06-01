import { ApiClient } from '../../services/api/client.js';
import { searchMemos } from '../../services/api/memo.js';
import {
  toCachedMemo,
  upsertCachedMemos,
  writeConfig,
  readCache,
} from '../../services/local-cache/index.js';

export async function handleSyncRemoteMemos(
  args: Record<string, unknown> | undefined,
  apiClient: ApiClient,
) {
  const limit =
    typeof args?.limit === 'number' ? Math.min(args.limit, 100) : 100;
  const maxPages =
    typeof args?.max_pages === 'number' ? Math.max(1, args.max_pages) : 20;
  const fetched = [];

  for (let page = 1; page <= maxPages; page++) {
    const result = await searchMemos(apiClient, { page, limit });
    if (!result.success) {
      return {
        content: [
          {
            type: 'text',
            text: `Failed to sync PaPut memos: ${result.error || 'Unknown error'}`,
          },
        ],
        isError: true,
      };
    }

    const memos = result.memos || [];
    fetched.push(...memos.map(toCachedMemo));
    if (memos.length < limit) break;
  }

  const memos = upsertCachedMemos(fetched);
  writeConfig({
    ...readCache().config,
    last_remote_sync_at: new Date().toISOString(),
  });

  const response = {
    success: true,
    action: 'synced',
    synced: fetched.length,
    cached_memos: memos.length,
  };

  return {
    structuredContent: response,
    content: [
      {
        type: 'text',
        text: JSON.stringify(response, null, 2),
      },
    ],
  };
}
