import { describe, expect, it, vi } from 'vitest';
import type { ApiClient } from './client.js';
import {
  createMemo,
  createMemos,
  getMemo,
  searchMemos,
  updateMemo,
} from './memo.js';

function createMockClient(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    get: vi.fn().mockResolvedValue({ memos: [], total: 0 }),
    post: vi.fn().mockResolvedValue({}),
    put: vi.fn().mockResolvedValue({}),
    delete: vi.fn().mockResolvedValue({}),
    ...overrides,
  } as unknown as ApiClient;
}

describe('memo API service', () => {
  describe('searchMemos', () => {
    it('builds query parameters from all search options', async () => {
      const client = createMockClient();

      await searchMemos(client, {
        query: 'Go context',
        category_id: 2,
        ids: [1, 2],
        is_public: true,
        project_id: 3,
        page: 2,
        limit: 10,
      });

      expect(client.get).toHaveBeenCalledWith(
        '/api/v1/mcp/memos?query=Go+context&category_id=2&ids%5B%5D=1&ids%5B%5D=2&is_public=true&project_id=3&page=2&limit=10',
      );
    });

    it('sends the date filter to the API', async () => {
      const client = createMockClient();

      await searchMemos(client, { date: '2026-06-14' });

      expect(client.get).toHaveBeenCalledWith(
        '/api/v1/mcp/memos?date=2026-06-14',
      );
    });

    it('omits the query string when no options are given', async () => {
      const client = createMockClient();

      await searchMemos(client, {});

      expect(client.get).toHaveBeenCalledWith('/api/v1/mcp/memos');
    });

    it('returns the search_mode reported by the API', async () => {
      const client = createMockClient({
        get: vi.fn().mockResolvedValue({
          memos: [{ id: 1, score: 0.8 }],
          total: 1,
          search_mode: 'hybrid',
        }),
      });

      await expect(
        searchMemos(client, { query: 'atomic write' }),
      ).resolves.toEqual({
        success: true,
        memos: [{ id: 1, score: 0.8 }],
        total: 1,
        search_mode: 'hybrid',
      });
    });

    it('returns a failure result when the API call throws', async () => {
      const client = createMockClient({
        get: vi.fn().mockRejectedValue(new Error('boom')),
      });

      await expect(searchMemos(client, {})).resolves.toEqual({
        success: false,
        error: 'boom',
      });
    });
  });

  describe('createMemos', () => {
    it('posts memos with defaults applied', async () => {
      const client = createMockClient({
        post: vi.fn().mockResolvedValue({
          success: true,
          created_count: 1,
          failed_count: 0,
          created: [{ id: 1 }],
          failed: [],
        }),
      });

      await createMemos(client, {
        memos: [{ title: 'Title', body: 'Body' }],
      });

      expect(client.post).toHaveBeenCalledWith('/api/v1/mcp/memos', {
        memos: [
          {
            title: 'Title',
            body: 'Body',
            is_public: false,
            created_at: undefined,
            categories: [],
            memo_type_keys: [],
            projects: [],
          },
        ],
      });
    });

    it('maps an API error onto every memo', async () => {
      const client = createMockClient({
        post: vi.fn().mockRejectedValue(new Error('server down')),
      });

      const result = await createMemos(client, {
        memos: [
          { title: 'A', body: 'a' },
          { title: 'B', body: 'b' },
        ],
      });

      expect(result.success).toBe(false);
      expect(result.failed_count).toBe(2);
      expect(result.failed).toEqual([
        { index: 0, title: 'A', error: 'server down' },
        { index: 1, title: 'B', error: 'server down' },
      ]);
    });
  });

  describe('createMemo', () => {
    it('returns the first failure when the batch call fails', async () => {
      const client = createMockClient({
        post: vi.fn().mockRejectedValue(new Error('server down')),
      });

      await expect(
        createMemo(client, { title: 'A', body: 'a' }),
      ).resolves.toEqual({ success: false, error: 'server down' });
    });
  });

  describe('getMemo / updateMemo', () => {
    it('uses the memo id in the GET endpoint', async () => {
      const client = createMockClient();

      await getMemo(client, { id: 42 });

      expect(client.get).toHaveBeenCalledWith('/api/v1/mcp/memo/42');
    });

    it('puts the update payload and reports success', async () => {
      const client = createMockClient();

      const result = await updateMemo(client, {
        id: 42,
        title: 'Title',
        body: 'Body',
        is_public: true,
        categories: [{ name: 'Go' }],
      });

      expect(client.put).toHaveBeenCalledWith('/api/v1/mcp/memo', {
        id: 42,
        title: 'Title',
        body: 'Body',
        is_public: true,
        categories: [{ name: 'Go' }],
        memo_type_keys: [],
        projects: undefined,
      });
      expect(result).toEqual({ success: true });
    });

    it('returns a failure result when the update throws', async () => {
      const client = createMockClient({
        put: vi.fn().mockRejectedValue(new Error('forbidden')),
      });

      await expect(
        updateMemo(client, {
          id: 42,
          title: 'T',
          body: 'B',
          is_public: false,
          categories: [],
        }),
      ).resolves.toEqual({ success: false, error: 'forbidden' });
    });
  });
});
