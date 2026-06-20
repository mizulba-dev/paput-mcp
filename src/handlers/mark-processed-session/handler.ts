import { ApiClient } from '../../services/api/client.js';
import { markRemoteProcessedSession } from '../../services/api/knowledge-candidate.js';
import type { SessionSource } from '../../types/knowledge.js';

export async function handleMarkProcessedSession(
  args: Record<string, unknown> | undefined,
  apiClient: ApiClient,
) {
  if (!args || typeof args.session_id !== 'string') {
    return {
      content: [{ type: 'text', text: 'session_id is required' }],
      isError: true,
    };
  }

  if (args.source !== 'claude' && args.source !== 'codex') {
    return {
      content: [
        {
          type: 'text',
          text: 'source must be claude or codex',
        },
      ],
      isError: true,
    };
  }

  const result = await markRemoteProcessedSession(apiClient, {
    source: args.source as SessionSource,
    session_id: args.session_id,
    source_session_updated_at:
      typeof args.source_session_updated_at === 'string'
        ? args.source_session_updated_at
        : undefined,
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
