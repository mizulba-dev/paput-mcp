import { describe, expect, it, vi } from 'vitest';
import type { ApiClient } from './client.js';
import { createNote, getNote, searchNotes, updateNote } from './note.js';

function createMockClient(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    get: vi.fn().mockResolvedValue({ notes: [], total: 0 }),
    post: vi.fn().mockResolvedValue({ id: 1 }),
    put: vi.fn().mockResolvedValue({}),
    delete: vi.fn().mockResolvedValue({}),
    ...overrides,
  } as unknown as ApiClient;
}

describe('note API service', () => {
  describe('createNote', () => {
    it('posts the note with defaults applied', async () => {
      const client = createMockClient();

      const result = await createNote(client, { title: 'Note' });

      expect(client.post).toHaveBeenCalledWith('/api/v1/mcp/note', {
        title: 'Note',
        is_public: false,
        memos: [],
      });
      expect(result).toEqual({ success: true, id: 1 });
    });

    it('returns a failure result when the API call throws', async () => {
      const client = createMockClient({
        post: vi.fn().mockRejectedValue(new Error('boom')),
      });

      await expect(createNote(client, { title: 'Note' })).resolves.toEqual({
        success: false,
        error: 'boom',
      });
    });
  });

  describe('searchNotes', () => {
    it('builds query parameters from all search options', async () => {
      const client = createMockClient();

      await searchNotes(client, {
        word: 'design notes',
        is_public: false,
        page: 3,
        limit: 20,
      });

      expect(client.get).toHaveBeenCalledWith(
        '/api/v1/mcp/notes?word=design+notes&is_public=false&page=3&limit=20',
      );
    });

    it('omits the query string when no options are given', async () => {
      const client = createMockClient();

      await searchNotes(client, {});

      expect(client.get).toHaveBeenCalledWith('/api/v1/mcp/notes');
    });

    it('returns a failure result when the API call throws', async () => {
      const client = createMockClient({
        get: vi.fn().mockRejectedValue(new Error('boom')),
      });

      await expect(searchNotes(client, {})).resolves.toEqual({
        success: false,
        error: 'boom',
      });
    });
  });

  describe('getNote / updateNote', () => {
    it('uses the note id in the GET endpoint', async () => {
      const client = createMockClient();

      await getNote(client, { id: 7 });

      expect(client.get).toHaveBeenCalledWith('/api/v1/mcp/note/7');
    });

    it('puts the update payload and reports success', async () => {
      const client = createMockClient();

      const result = await updateNote(client, {
        id: 7,
        title: 'Renamed',
        is_public: true,
        memos: [{ id: 1 }],
      });

      expect(client.put).toHaveBeenCalledWith('/api/v1/mcp/note', {
        id: 7,
        title: 'Renamed',
        is_public: true,
        memos: [{ id: 1 }],
      });
      expect(result).toEqual({ success: true });
    });

    it('returns a failure result when the update throws', async () => {
      const client = createMockClient({
        put: vi.fn().mockRejectedValue(new Error('forbidden')),
      });

      await expect(updateNote(client, { id: 7 })).resolves.toEqual({
        success: false,
        error: 'forbidden',
      });
    });
  });
});
