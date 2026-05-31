import { ApiClient } from '../../services/api/client.js';
import { readCache } from '../../services/local-cache/index.js';

export async function handleListPendingCandidates(
  args: Record<string, unknown> | undefined,
  _apiClient: ApiClient,
) {
  const limit = typeof args?.limit === 'number' ? Math.max(1, args.limit) : 20;
  const candidates = readCache()
    .pending.filter((candidate) => candidate.status === 'pending')
    .slice(0, limit);

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(
          {
            count: candidates.length,
            candidates,
          },
          null,
          2,
        ),
      },
    ],
  };
}
