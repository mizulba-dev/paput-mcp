import { describe, expect, it, vi } from 'vitest';
import type { ApiClient } from '../../services/api/client.js';
import { handleListProcessedSessions } from './handler.js';

describe('handleListProcessedSessions', () => {
  it('lists processed sessions from the PaPut API', async () => {
    const client = {
      get: vi.fn().mockResolvedValue({
        sessions: [
          {
            source: 'codex',
            session_id: 'session-1',
            processed_at: '2026-06-21T00:00:00.000Z',
          },
        ],
      }),
    } as unknown as ApiClient;

    const result = await handleListProcessedSessions(
      { source: 'codex' },
      client,
    );

    expect(client.get).toHaveBeenCalledWith(
      '/api/v1/mcp/processed-sessions?source=codex',
    );
    expect(result.structuredContent).toEqual({
      sessions: [
        {
          source: 'codex',
          session_id: 'session-1',
          processed_at: '2026-06-21T00:00:00.000Z',
        },
      ],
    });
  });

  it('ignores invalid source filters', async () => {
    const client = {
      get: vi.fn().mockResolvedValue({ sessions: [] }),
    } as unknown as ApiClient;

    await handleListProcessedSessions({ source: 'cursor' }, client);

    expect(client.get).toHaveBeenCalledWith('/api/v1/mcp/processed-sessions');
  });
});
