import { ApiClient } from '../../services/api/client.js';
import { getSessionTranscript } from '../../services/session/index.js';
import { SessionSource } from '../../types/knowledge.js';

export async function handleGetSessionTranscript(
  args: Record<string, unknown> | undefined,
  _apiClient: ApiClient,
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

  const maxChars =
    typeof args.max_chars === 'number' ? Math.max(1000, args.max_chars) : 20000;
  const transcript = getSessionTranscript(
    args.source as SessionSource,
    args.session_id,
    maxChars,
  );

  if (!transcript) {
    return {
      content: [
        {
          type: 'text',
          text: `Session not found: ${args.source}:${args.session_id}`,
        },
      ],
      isError: true,
    };
  }

  return {
    structuredContent: {
      session_id: args.session_id,
      source: args.source,
      max_chars: maxChars,
      transcript,
    },
    content: [
      {
        type: 'text',
        text: transcript,
      },
    ],
  };
}
