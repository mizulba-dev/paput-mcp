import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ApiClient } from '../../services/api/client.js';
import { handleGetProjectContext } from './handler.js';

describe('handleGetProjectContext', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  function createMockClient() {
    return {
      get: vi.fn().mockResolvedValue({
        project: { id: 1, title: 'PaPut' },
        instructions: null,
        documents: [],
        proposals: [],
      }),
    } as unknown as ApiClient;
  }

  it('prefers the configured project ID over the explicit argument', async () => {
    const client = createMockClient();

    await handleGetProjectContext({ project: ' explicit-project ' }, client, {
      projectId: 107,
    });

    expect(client.get).toHaveBeenCalledWith(
      '/api/v1/mcp/project-context?project_id=107',
    );
  });

  it('uses the explicit project argument when nothing is configured', async () => {
    const client = createMockClient();

    await handleGetProjectContext({ project: ' explicit-project ' }, client);

    expect(client.get).toHaveBeenCalledWith(
      '/api/v1/mcp/project-context?project=explicit-project',
    );
  });

  it('returns an error when no project selector is configured', async () => {
    const client = createMockClient();

    const result = await handleGetProjectContext({}, client);

    expect(result).toEqual({
      content: [
        {
          type: 'text',
          text: 'project is required when no MCP project_alias is configured.',
        },
      ],
      isError: true,
    });
    expect(client.get).not.toHaveBeenCalled();
  });

  it('resolves the project lazily from the configured alias', async () => {
    const client = createMockClient();

    await handleGetProjectContext({}, client, {
      projectAlias: 'paput',
      resolveProject: vi.fn().mockResolvedValue({
        projectId: 107,
        projectTitle: 'PaPut',
        projectAlias: 'paput',
      }),
    });

    expect(client.get).toHaveBeenCalledWith(
      '/api/v1/mcp/project-context?project_id=107',
    );
  });

  it('returns a clear error when the configured alias is not found', async () => {
    const client = createMockClient();

    const result = await handleGetProjectContext({}, client, {
      projectAlias: 'unknownalias',
      resolveProject: vi.fn().mockResolvedValue(null),
    });

    expect(result.isError).toBe(true);
    expect(result.content).toEqual([
      {
        type: 'text',
        text: expect.stringContaining(
          'project_alias "unknownalias" was not found',
        ),
      },
    ]);
    expect(client.get).not.toHaveBeenCalled();
  });

  it('returns a tool error when alias resolution fails', async () => {
    const client = createMockClient();

    const result = await handleGetProjectContext({}, client, {
      projectAlias: 'paput',
      resolveProject: vi.fn().mockRejectedValue(new Error('unauthorized')),
    });

    expect(result.isError).toBe(true);
    expect(result.content).toEqual([
      {
        type: 'text',
        text: 'Failed to get project context: unauthorized',
      },
    ]);
  });
});
