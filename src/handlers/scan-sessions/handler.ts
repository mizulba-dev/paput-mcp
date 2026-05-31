import { ApiClient } from '../../services/api/client.js';
import { scanSessions } from '../../services/session/index.js';
import { SessionSource } from '../../types/knowledge.js';

export async function handleScanSessions(
  args: Record<string, unknown> | undefined,
  _apiClient: ApiClient,
) {
  const sources = parseSources(args?.sources);
  const includeProcessed =
    typeof args?.include_processed === 'boolean'
      ? args.include_processed
      : false;
  const sessions = scanSessions(sources, includeProcessed);

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(
          {
            count: sessions.length,
            sessions,
          },
          null,
          2,
        ),
      },
    ],
  };
}

function parseSources(value: unknown): SessionSource[] {
  if (!Array.isArray(value)) return ['claude', 'codex'];
  const sources = value.filter(
    (source): source is SessionSource =>
      source === 'claude' || source === 'codex',
  );
  return sources.length > 0 ? sources : ['claude', 'codex'];
}
