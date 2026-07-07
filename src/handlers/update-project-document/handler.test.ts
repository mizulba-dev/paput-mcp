import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ApiClient } from '../../services/api/client.js';
import { handleUpdateProjectDocument } from './handler.js';

describe('handleUpdateProjectDocument', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  function createMockClient(response: unknown | Error) {
    return {
      put:
        response instanceof Error
          ? vi.fn().mockRejectedValue(response)
          : vi.fn().mockResolvedValue(response),
    } as unknown as ApiClient;
  }

  const document = {
    id: 1,
    skill_sheet_project_id: 10,
    kind: 'design_doc',
    status: 'active',
    title: 'Title',
    summary: '',
    body: 'Body',
    promoted_to: null,
    decided_at: null,
    created_at: '2026-06-01T00:00:00Z',
    updated_at: '2026-06-01T00:00:00Z',
  };

  it('rejects a status value other than active or archived without calling the API', async () => {
    const client = createMockClient(document);

    const result = await handleUpdateProjectDocument(
      { id: 1, title: 'Title', body: 'Body', status: 'retired' },
      client,
    );

    expect(result).toEqual({
      content: [
        {
          type: 'text',
          text: 'status must be "active" or "archived" when provided.',
        },
      ],
      isError: true,
    });
    expect(client.put).not.toHaveBeenCalled();
  });

  it('passes status through to the API when it is active or archived', async () => {
    const client = createMockClient({ ...document, status: 'archived' });

    await handleUpdateProjectDocument(
      { id: 1, title: 'Title', body: 'Body', status: 'archived' },
      client,
    );

    expect(client.put).toHaveBeenCalledWith(
      '/api/v1/mcp/project-document',
      expect.objectContaining({ status: 'archived' }),
    );
  });

  it('omits status when it is not provided', async () => {
    const client = createMockClient(document);

    await handleUpdateProjectDocument(
      { id: 1, title: 'Title', body: 'Body' },
      client,
    );

    expect(client.put).toHaveBeenCalledWith(
      '/api/v1/mcp/project-document',
      expect.objectContaining({ status: undefined }),
    );
  });
});
