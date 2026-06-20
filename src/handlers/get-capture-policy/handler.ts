import { ApiClient } from '../../services/api/client.js';
import { getRemoteCapturePolicy } from '../../services/api/knowledge-candidate.js';

export async function handleGetCapturePolicy(
  _args: Record<string, unknown> | undefined,
  apiClient: ApiClient,
) {
  const policy = await getRemoteCapturePolicy(apiClient);

  return {
    structuredContent: policy as unknown as Record<string, unknown>,
    content: [
      {
        type: 'text',
        text: JSON.stringify(policy, null, 2),
      },
    ],
  };
}
