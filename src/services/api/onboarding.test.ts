import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ApiClient } from './client.js';
import { createApiClient } from './client.js';
import { getOnboardingStatus } from './onboarding.js';

function createMockClient(response: unknown): ApiClient {
  return {
    get: vi.fn().mockResolvedValue(response),
  } as unknown as ApiClient;
}

describe('onboarding API service', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('gets the onboarding status from the authenticated MCP endpoint', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ memo_count: 3, has_skill_sheet: true }), {
        status: 200,
      }),
    );
    const client = createApiClient(
      'https://api.example.test',
      'onboarding-token',
    );

    await expect(getOnboardingStatus(client)).resolves.toEqual({
      memo_count: 3,
      has_skill_sheet: true,
    });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.example.test/api/v1/mcp/onboarding-status',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          Authorization: 'Bearer onboarding-token',
        }),
      }),
    );
  });

  it('rejects an invalid response shape', async () => {
    const client = createMockClient({ memo_count: '0' });

    await expect(getOnboardingStatus(client)).rejects.toThrow(
      'Invalid onboarding status response format',
    );
  });

  it('aborts a hanging onboarding status request after three seconds', async () => {
    vi.useFakeTimers();
    let requestSignal: AbortSignal | undefined;
    vi.spyOn(globalThis, 'fetch').mockImplementation(
      async (_input, init) =>
        await new Promise<Response>((_resolve, reject) => {
          requestSignal = init?.signal ?? undefined;
          requestSignal?.addEventListener('abort', () => {
            reject(requestSignal?.reason);
          });
        }),
    );
    const client = createApiClient(
      'https://api.example.test',
      'onboarding-token',
    );

    const statusPromise = getOnboardingStatus(client);
    const rejection = expect(statusPromise).rejects.toMatchObject({
      name: 'AbortError',
    });
    await vi.advanceTimersByTimeAsync(3_000);

    await rejection;
    expect(requestSignal?.aborted).toBe(true);
  });
});
