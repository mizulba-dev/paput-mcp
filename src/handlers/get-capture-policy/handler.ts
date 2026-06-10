import { ApiClient } from '../../services/api/client.js';
import { readCapturePolicy } from '../../services/local-cache/index.js';

export async function handleGetCapturePolicy(
  _args: Record<string, unknown> | undefined,
  _apiClient: ApiClient,
) {
  const policy = readCapturePolicy();

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
