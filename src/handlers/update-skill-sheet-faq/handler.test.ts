import { describe, expect, it, vi } from 'vitest';
import type { ApiClient } from '../../services/api/client.js';
import { handler } from './handler.js';

describe('update-skill-sheet-faq handler', () => {
  it('saves an empty array to clear all FAQ items', async () => {
    const apiClient = apiClientStub({ faq: [] });

    const result = await handler({ faq: [] }, apiClient);

    expect(apiClient.put).toHaveBeenCalledWith('/api/v1/mcp/skill-sheet/faq', {
      faq: [],
    });
    expect(result.structuredContent).toMatchObject({
      success: true,
      faq: [],
    });
  });

  it('rejects more than 15 items', async () => {
    const faq = Array.from({ length: 16 }, (_, i) => ({
      question: `Question ${i}`,
      answer: `Answer ${i}`,
    }));

    const result = await handler({ faq }, apiClientStub());

    expect(result.isError).toBe(true);
  });

  it('rejects a blank answer', async () => {
    const result = await handler(
      { faq: [{ question: 'What do you check first?', answer: '   ' }] },
      apiClientStub(),
    );

    expect(result.isError).toBe(true);
  });

  it('rejects non-positive related_memo_ids', async () => {
    const result = await handler(
      {
        faq: [
          {
            question: 'What do you check first?',
            answer: 'I start with the slow query log.',
            related_memo_ids: [1, -2],
          },
        ],
      },
      apiClientStub(),
    );

    expect(result.isError).toBe(true);
  });

  it('reports dropped related memo IDs from the response', async () => {
    const apiClient = apiClientStub({
      faq: [
        {
          question: 'What do you check first?',
          answer: 'I start with the slow query log.',
          theme: 'Database',
          related_memos: [],
          dropped_ids: [42],
        },
      ],
    });

    const result = await handler(
      {
        faq: [
          {
            question: 'What do you check first?',
            answer: 'I start with the slow query log.',
            related_memo_ids: [42],
          },
        ],
      },
      apiClient,
    );

    expect(result.content).toMatchObject([
      {
        type: 'text',
        text: expect.stringContaining('Dropped related memo IDs: 42'),
      },
    ]);
  });

  function apiClientStub(
    response: Record<string, unknown> = { faq: [] },
  ): ApiClient {
    return {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn().mockResolvedValue(response),
      delete: vi.fn(),
      request: vi.fn(),
    } as unknown as ApiClient;
  }
});
