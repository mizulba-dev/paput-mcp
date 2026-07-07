import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ApiClient } from '../../services/api/client.js';
import { handleSearchProjectDocuments } from './handler.js';

describe('handleSearchProjectDocuments', () => {
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

  it('returns an error when query is missing', async () => {
    const client = createMockClient({ documents: [] });

    const result = await handleSearchProjectDocuments({}, client);

    expect(result).toEqual({
      content: [{ type: 'text', text: 'query is required.' }],
      isError: true,
    });
    expect(client.get).not.toHaveBeenCalled();
  });

  it('builds the search query from validated arguments', async () => {
    const client = createMockClient({ documents: [] });

    await handleSearchProjectDocuments(
      { query: 'render deploy plan', limit: 3, include_archived: true },
      client,
    );

    expect(client.get).toHaveBeenCalledWith(
      '/api/v1/mcp/project-documents/search?query=render+deploy+plan&limit=3&include_archived=true',
    );
  });

  it('returns a formatted list of matched documents', async () => {
    const doc = {
      id: 42,
      kind: 'design_doc',
      status: 'active',
      title: 'Render plan switch',
      summary: 'Switched to starter plan',
      score: 0.912,
      created_at: '2026-06-01T00:00:00Z',
    };
    const client = createMockClient({ documents: [doc] });

    const result = await handleSearchProjectDocuments(
      { query: 'render plan' },
      client,
    );

    expect(result.isError).toBeUndefined();
    expect(result.structuredContent).toEqual({ documents: [doc] });
    expect(result.content[0].text).toContain(
      '[42] (design_doc, active, score 0.912) Render plan switch',
    );
    expect(result.content[0].text).toContain('paput_get_project_document');
  });

  it('reports when no documents match', async () => {
    const client = createMockClient({ documents: [] });

    const result = await handleSearchProjectDocuments(
      { query: 'unknown topic' },
      client,
    );

    expect(result.structuredContent).toEqual({ documents: [] });
    expect(result.content[0].text).toBe('No matching project documents found.');
  });

  it('returns an error result when the API call fails', async () => {
    const client = createMockClient(new Error('api down'));

    const result = await handleSearchProjectDocuments(
      { query: 'render plan' },
      client,
    );

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('api down');
  });
});
