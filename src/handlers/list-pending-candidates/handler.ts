import { ApiClient } from '../../services/api/client.js';
import { listRemoteKnowledgeCandidates } from '../../services/api/knowledge-candidate.js';

export async function handleListPendingCandidates(
  args: Record<string, unknown> | undefined,
  apiClient: ApiClient,
) {
  const limit = typeof args?.limit === 'number' ? Math.max(1, args.limit) : 20;
  const result = await listRemoteKnowledgeCandidates(apiClient, {
    status: 'pending',
    limit,
  });

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
