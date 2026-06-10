import { ApiClient } from '../../services/api/client.js';
import {
  getDiscardedCandidates,
  readCache,
  readCapturePolicy,
} from '../../services/local-cache/index.js';

export async function handleGetDiscardPolicyContext(
  args: Record<string, unknown> | undefined,
  _apiClient: ApiClient,
) {
  const limit =
    args && typeof args.limit === 'number' && args.limit > 0
      ? Math.min(Math.floor(args.limit), 200)
      : 50;
  const policy = readCapturePolicy();
  const cache = readCache();
  const discarded_candidates = getDiscardedCandidates(limit);
  const result = {
    policy,
    total_discarded_count: cache.pending.filter(
      (candidate) => candidate.status === 'discarded',
    ).length,
    returned_discarded_count: discarded_candidates.length,
    discarded_candidates,
  };

  return {
    structuredContent: result,
    content: [
      {
        type: 'text',
        text: JSON.stringify(result, null, 2),
      },
    ],
  };
}
