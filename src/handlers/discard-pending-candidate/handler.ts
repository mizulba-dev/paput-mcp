import { ApiClient } from '../../services/api/client.js';
import { discardRemoteKnowledgeCandidate } from '../../services/api/knowledge-candidate.js';

export async function handleDiscardPendingCandidate(
  args: Record<string, unknown> | undefined,
  apiClient: ApiClient,
) {
  if (!args || typeof args.candidate_id !== 'string') {
    return {
      content: [{ type: 'text', text: 'candidate_id is required' }],
      isError: true,
    };
  }

  const result = await discardRemoteKnowledgeCandidate(apiClient, {
    candidate_id: args.candidate_id,
    reason: typeof args.reason === 'string' ? args.reason : undefined,
  });

  return {
    structuredContent: result as unknown as Record<string, unknown>,
    content: [
      {
        type: 'text',
        text: JSON.stringify(result, null, 2),
      },
    ],
  };
}
