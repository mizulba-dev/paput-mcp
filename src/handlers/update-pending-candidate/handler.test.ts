import { describe, expect, it, vi } from 'vitest';
import type { ApiClient } from '../../services/api/client.js';
import { handleUpdatePendingCandidate } from './handler.js';

describe('handleUpdatePendingCandidate', () => {
  it('updates provided fields through the remote API', async () => {
    const apiClient = apiClientStub();

    const result = await handleUpdatePendingCandidate(
      {
        candidate_id: 'candidate-id',
        title: 'Updated title',
        categories: ['MCP', 'Testing'],
        memo_type_keys: ['decision'],
        is_public: true,
      },
      apiClient,
    );

    expect(apiClient.put).toHaveBeenCalledWith(
      '/api/v1/mcp/knowledge-candidate',
      {
        candidate_id: 'candidate-id',
        title: 'Updated title',
        categories: ['MCP', 'Testing'],
        memo_type_keys: ['decision'],
        is_public: true,
      },
    );
    expect(result.structuredContent).toMatchObject({
      updated: true,
      candidate: {
        id: 'candidate-id',
        title: 'Updated title',
        categories: ['MCP', 'Testing'],
        memo_type_keys: ['decision'],
        is_public: true,
      },
    });
  });

  it('rejects an empty title', async () => {
    const result = await handleUpdatePendingCandidate(
      { candidate_id: 'candidate-id', title: '   ' },
      apiClientStub(),
    );

    expect(result.isError).toBe(true);
  });

  it('requires at least one updatable field', async () => {
    const result = await handleUpdatePendingCandidate(
      { candidate_id: 'candidate-id' },
      apiClientStub(),
    );

    expect(result.isError).toBe(true);
  });

  function apiClientStub(): ApiClient {
    return {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn().mockImplementation(async (_endpoint: string, body: unknown) => ({
        updated: true,
        candidate: {
          id: (body as { candidate_id: string }).candidate_id,
          ...(body as Record<string, unknown>),
        },
      })),
      delete: vi.fn(),
      request: vi.fn(),
    } as unknown as ApiClient;
  }
});
