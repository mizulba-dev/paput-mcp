import { ApiClient } from '../../services/api/client.js';
import { getRemoteDiscardPolicyContext } from '../../services/api/knowledge-candidate.js';

export async function handleGetDiscardPolicyContext(
  args: Record<string, unknown> | undefined,
  apiClient: ApiClient,
) {
  const limit =
    args && typeof args.limit === 'number' && args.limit > 0
      ? Math.min(Math.floor(args.limit), 200)
      : 50;
  const result = await getRemoteDiscardPolicyContext(apiClient, limit);

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
