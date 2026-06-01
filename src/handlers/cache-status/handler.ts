import { ApiClient } from '../../services/api/client.js';
import { getCacheDir, readCache } from '../../services/local-cache/index.js';

export async function handleCacheStatus(
  _args: Record<string, unknown> | undefined,
  _apiClient: ApiClient,
) {
  const cache = readCache();
  const pendingCount = cache.pending.filter(
    (candidate) => candidate.status === 'pending',
  ).length;
  const status = {
    cache_dir: getCacheDir(),
    memos: cache.memos.length,
    pending: pendingCount,
    saved_candidates: cache.pending.filter(
      (candidate) => candidate.status === 'saved',
    ).length,
    discarded_candidates: cache.pending.filter(
      (candidate) => candidate.status === 'discarded',
    ).length,
    processed_sessions: cache.sessions.length,
    last_remote_sync_at: cache.config.last_remote_sync_at || null,
  };

  return {
    structuredContent: status,
    content: [
      {
        type: 'text',
        text: JSON.stringify(status, null, 2),
      },
    ],
  };
}
