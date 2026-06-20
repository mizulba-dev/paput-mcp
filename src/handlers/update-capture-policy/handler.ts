import { ApiClient } from '../../services/api/client.js';
import { updateRemoteCapturePolicy } from '../../services/api/knowledge-candidate.js';

export async function handleUpdateCapturePolicy(
  args: Record<string, unknown> | undefined,
  apiClient: ApiClient,
) {
  if (!args || typeof args.markdown !== 'string') {
    return {
      content: [{ type: 'text', text: 'markdown is required' }],
      isError: true,
    };
  }

  const policy = await updateRemoteCapturePolicy(apiClient, args.markdown);

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
