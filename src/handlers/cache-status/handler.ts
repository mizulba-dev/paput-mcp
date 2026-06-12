import { ApiClient } from '../../services/api/client.js';
import {
  getCacheDir,
  readCache,
  readCapturePolicy,
} from '../../services/local-cache/index.js';

export async function handleCacheStatus(
  _args: Record<string, unknown> | undefined,
  _apiClient: ApiClient,
) {
  const cache = readCache();
  const pendingCount = cache.pending.filter(
    (candidate) => candidate.status === 'pending',
  ).length;
  const capturePolicy = readCapturePolicy();
  const status = {
    cache_dir: getCacheDir(),
    pending: pendingCount,
    saved_candidates: cache.pending.filter(
      (candidate) => candidate.status === 'saved',
    ).length,
    discarded_candidates: cache.pending.filter(
      (candidate) => candidate.status === 'discarded',
    ).length,
    capture_policy: {
      path: capturePolicy.path,
      exists: capturePolicy.exists,
      updated_at: capturePolicy.updated_at,
    },
    processed_sessions: cache.sessions.length,
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
