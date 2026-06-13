import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ApiClient } from '../../services/api/client.js';
import { handleSearchNotes } from './handler.js';

describe('handleSearchNotes', () => {
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
    const client = createMockClient({ notes: [], total: 0 });

    await handleSearchNotes(
      { word: 'design', is_public: false, page: 2, limit: 10 },
      client,
    );

    expect(client.get).toHaveBeenCalledWith(
      '/api/v1/mcp/notes?word=design&is_public=false&page=2&limit=10',
    );
  });

  it('ignores non-positive page and limit values', async () => {
    const client = createMockClient({ notes: [], total: 0 });

    await handleSearchNotes({ page: 0, limit: -1 }, client);

    expect(client.get).toHaveBeenCalledWith('/api/v1/mcp/notes');
  });

  it('returns a formatted list of matched notes', async () => {
    const note = {
      id: 5,
      title: 'Design note',
      is_public: true,
      created_at: '2026-06-01T00:00:00Z',
      updated_at: '2026-06-01T00:00:00Z',
      memo_count: 3,
    };
    const client = createMockClient({ notes: [note], total: 1 });

    const result = await handleSearchNotes({}, client);

    expect(result.structuredContent).toEqual({ total: 1, notes: [note] });
    expect(result.content[0].text).toContain(
      '- [5] Design note (Public) (Memo count: 3)',
    );
  });

  it('reports when no notes match', async () => {
    const client = createMockClient({ notes: [], total: 0 });

    const result = await handleSearchNotes({}, client);

    expect(result.structuredContent).toEqual({ total: 0, notes: [] });
    expect(result.content[0].text).toBe('No matching notes found.');
  });

  it('returns an error result when the API call fails', async () => {
    const client = createMockClient(new Error('api down'));

    const result = await handleSearchNotes({}, client);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('api down');
  });
});
