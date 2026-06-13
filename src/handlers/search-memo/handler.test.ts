import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ApiClient } from '../../services/api/client.js';
import { handleSearchMemo } from './handler.js';

describe('handleSearchMemo', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  function createMockClient(response: unknown | Error) {
    return {
      get:
        response instanceof Error
          ? vi.fn().mockRejectedValue(response)
          : vi.fn().mockResolvedValue(response),
    } as unknown as ApiClient;
  }

  it('builds the search query from validated arguments', async () => {
    const client = createMockClient({ memos: [], total: 0 });

    await handleSearchMemo(
      {
        word: 'go',
        category_id: 2,
        ids: [1, 'x', 2],
        is_public: true,
        page: 1,
        limit: 5,
        unknown_key: 'ignored',
      },
      client,
    );

    expect(client.get).toHaveBeenCalledWith(
      '/api/v1/mcp/memos?word=go&category_id=2&ids%5B%5D=1&ids%5B%5D=2&is_public=true&page=1&limit=5',
    );
  });

  it('ignores arguments with invalid types', async () => {
    const client = createMockClient({ memos: [], total: 0 });

    await handleSearchMemo(
      { word: 1, category_id: '2', is_public: 'yes' },
      client,
    );

    expect(client.get).toHaveBeenCalledWith('/api/v1/mcp/memos');
  });

  it('returns a formatted list of matched memos', async () => {
    const memo = {
      id: 1,
      title: 'Go context',
      body: 'Body',
      is_public: false,
      created_at: '2026-06-01T00:00:00Z',
      updated_at: '2026-06-01T00:00:00Z',
      categories: [{ id: 1, name: 'Go' }],
    };
    const client = createMockClient({ memos: [memo], total: 1 });

    const result = await handleSearchMemo({ word: 'go' }, client);

    expect(result.isError).toBeUndefined();
    expect(result.structuredContent).toEqual({ total: 1, memos: [memo] });
    expect(result.content[0].text).toContain('【Go context】(ID: 1, Private)');
    expect(result.content[0].text).toContain('Categories: Go');
  });

  it('reports when no memos match', async () => {
    const client = createMockClient({ memos: [], total: 0 });

    const result = await handleSearchMemo({}, client);

    expect(result.structuredContent).toEqual({ total: 0, memos: [] });
    expect(result.content[0].text).toBe('No matching memos found.');
  });

  it('returns an error result when the API call fails', async () => {
    const client = createMockClient(new Error('api down'));

    const result = await handleSearchMemo({}, client);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('api down');
  });
});
