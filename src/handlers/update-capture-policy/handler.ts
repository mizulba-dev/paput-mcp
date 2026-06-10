import { ApiClient } from '../../services/api/client.js';
import { writeCapturePolicy } from '../../services/local-cache/index.js';

export async function handleUpdateCapturePolicy(
  args: Record<string, unknown> | undefined,
  _apiClient: ApiClient,
) {
  if (!args || typeof args.markdown !== 'string') {
    return {
      content: [{ type: 'text', text: 'markdown is required' }],
      isError: true,
    };
  }

  const policy = writeCapturePolicy(args.markdown);

  return {
    structuredContent: policy,
    content: [
      {
        type: 'text',
        text: JSON.stringify(policy, null, 2),
      },
    ],
  };
}
