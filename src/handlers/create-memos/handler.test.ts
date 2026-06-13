import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ApiClient } from '../../services/api/client.js';
import { handleCreateMemos } from './handler.js';

describe('handleCreateMemos', () => {
  const originalProjectMatch = process.env.PAPUT_PROJECT_MATCH;

  beforeEach(() => {
    delete process.env.PAPUT_PROJECT_MATCH;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    if (originalProjectMatch === undefined) {
      delete process.env.PAPUT_PROJECT_MATCH;
    } else {
      process.env.PAPUT_PROJECT_MATCH = originalProjectMatch;
    }
  });

  function createMockClient(overrides: Partial<Record<string, unknown>> = {}) {
    return {
      get: vi.fn().mockResolvedValue([]),
      post: vi.fn().mockResolvedValue({
        success: true,
        created_count: 0,
        failed_count: 0,
        created: [],
        failed: [],
      }),
      put: vi.fn(),
      delete: vi.fn(),
      ...overrides,
    } as unknown as ApiClient;
  }

  it('rejects arguments without a memos array', async () => {
    const client = createMockClient();

    const result = await handleCreateMemos(undefined, client);
    expect(result.isError).toBe(true);

    const result2 = await handleCreateMemos({ memos: 'not-array' }, client);
    expect(result2.isError).toBe(true);
    expect(client.post).not.toHaveBeenCalled();
  });

  it('creates multiple memos and forwards normalized params', async () => {
    const client = createMockClient({
      post: vi.fn().mockResolvedValue({
        success: true,
        created_count: 2,
        failed_count: 0,
        created: [
          { index: 0, id: 1, title: 'A' },
          { index: 1, id: 2, title: 'B' },
        ],
        failed: [],
      }),
    });

    const result = await handleCreateMemos(
      {
        memos: [
          { title: 'A', body: 'a', categories: ['Go', 7], is_public: true },
          { title: 'B', body: 'b', projects: [{ id: 9, title: 'PaPut' }] },
        ],
      },
      client,
    );

    expect(client.post).toHaveBeenCalledWith('/api/v1/mcp/memos', {
      memos: [
        {
          title: 'A',
          body: 'a',
          is_public: true,
          created_at: undefined,
          categories: [{ name: 'Go' }],
          projects: [],
        },
        {
          title: 'B',
          body: 'b',
          is_public: false,
          created_at: undefined,
          categories: [],
          projects: [{ id: 9, title: 'PaPut' }],
        },
      ],
    });
    expect(result.isError).toBe(false);
    expect(result.structuredContent).toMatchObject({
      success: true,
      created_count: 2,
      failed_count: 0,
    });
  });

  it('reports invalid memo items with their original indexes', async () => {
    const client = createMockClient({
      post: vi.fn().mockResolvedValue({
        success: true,
        created_count: 1,
        failed_count: 0,
        created: [{ index: 0, id: 10, title: 'Valid' }],
        failed: [],
      }),
    });

    const result = await handleCreateMemos(
      {
        memos: ['broken', { title: 'NoBody' }, { title: 'Valid', body: 'ok' }],
      },
      client,
    );

    expect(result.isError).toBe(true);
    expect(result.structuredContent).toMatchObject({
      success: false,
      created_count: 1,
      failed_count: 2,
    });
    expect(result.structuredContent?.created).toEqual([
      expect.objectContaining({ index: 2, id: 10 }),
    ]);
    expect(result.structuredContent?.failed).toEqual([
      expect.objectContaining({
        index: 0,
        error: 'Memo item must be an object',
      }),
      expect.objectContaining({
        index: 1,
        title: 'NoBody',
        error: 'Title and body must be strings',
      }),
    ]);
  });

  it('maps API failures back to the original memo indexes', async () => {
    const client = createMockClient({
      post: vi.fn().mockRejectedValue(new Error('server down')),
    });

    const result = await handleCreateMemos(
      {
        memos: [{ title: 'NoBody' }, { title: 'Valid', body: 'ok' }],
      },
      client,
    );

    expect(result.isError).toBe(true);
    expect(result.structuredContent?.failed).toEqual([
      expect.objectContaining({ index: 0 }),
      expect.objectContaining({
        index: 1,
        title: 'Valid',
        error: 'server down',
      }),
    ]);
  });

  it('succeeds without calling the API when memos is empty', async () => {
    const client = createMockClient();

    const result = await handleCreateMemos({ memos: [] }, client);

    expect(client.post).not.toHaveBeenCalled();
    expect(result.isError).toBe(false);
    expect(result.structuredContent).toMatchObject({
      success: true,
      created_count: 0,
      failed_count: 0,
    });
  });
});
