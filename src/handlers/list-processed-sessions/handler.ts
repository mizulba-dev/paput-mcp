import { ApiClient } from '../../services/api/client.js';
import { listRemoteProcessedSessions } from '../../services/api/knowledge-candidate.js';
import type { SessionSource } from '../../types/knowledge.js';

export async function handleListProcessedSessions(
  args: Record<string, unknown> | undefined,
  apiClient: ApiClient,
) {
  const source = parseSource(args?.source);
  const result = await listRemoteProcessedSessions(apiClient, source);

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

function parseSource(value: unknown): SessionSource | undefined {
  return value === 'claude' || value === 'codex' ? value : undefined;
}
