import { describe, expect, it, vi } from 'vitest';
import type { ApiClient } from '../../services/api/client.js';
import { handleMarkProcessedSession } from './handler.js';

describe('handleMarkProcessedSession', () => {
  it('rejects invalid arguments', async () => {
    const client = { post: vi.fn() } as unknown as ApiClient;

    expect((await handleMarkProcessedSession(undefined, client)).isError).toBe(
      true,
    );
    expect(
      (
        await handleMarkProcessedSession(
          { source: 'cursor', session_id: 's' },
          client,
        )
      ).isError,
    ).toBe(true);
  });

  it('marks a processed session through the PaPut API', async () => {
    const client = {
      post: vi.fn().mockResolvedValue({
        source: 'claude',
        session_id: 'session-1',
        source_session_updated_at: '2026-06-21T00:00:00.000Z',
        processed_at: '2026-06-21T00:01:00.000Z',
      }),
    } as unknown as ApiClient;

    const result = await handleMarkProcessedSession(
      {
        source: 'claude',
        session_id: 'session-1',
        source_session_updated_at: '2026-06-21T00:00:00.000Z',
      },
      client,
    );

    expect(client.post).toHaveBeenCalledWith('/api/v1/mcp/processed-sessions', {
      source: 'claude',
      session_id: 'session-1',
      source_session_updated_at: '2026-06-21T00:00:00.000Z',
    });
    expect(result.structuredContent).toMatchObject({
      source: 'claude',
      session_id: 'session-1',
    });
  });
});
