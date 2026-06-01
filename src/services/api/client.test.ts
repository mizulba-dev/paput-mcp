import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApiClient } from './client.js';

describe('createApiClient', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('uses bearer token before API key when both are provided', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
    const client = createApiClient(
      'https://api.example.test',
      'api-key',
      'access-token',
    );

    await client.get('/api/v1/mcp/memos');

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.example.test/api/v1/mcp/memos',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer access-token',
        }),
      }),
    );
    expect(
      (fetchMock.mock.calls[0]?.[1] as RequestInit | undefined)?.headers,
    ).not.toMatchObject({ 'X-API-Key': 'api-key' });
  });
});
