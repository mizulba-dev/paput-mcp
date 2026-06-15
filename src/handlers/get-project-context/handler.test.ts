import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ApiClient } from '../../services/api/client.js';
import { handleGetProjectContext } from './handler.js';

describe('handleGetProjectContext', () => {
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

  it('uses the explicit project argument first', async () => {
    process.env.PAPUT_PROJECT_MATCH = 'env-project';
    const client = createMockClient();

    await handleGetProjectContext({ project: ' explicit-project ' }, client, {
      projectMatch: 'ctx-project',
    });

    expect(client.get).toHaveBeenCalledWith(
      '/api/v1/mcp/project-context?project=explicit-project',
    );
  });

  it('falls back to the tool context project match', async () => {
    const client = createMockClient();

    await handleGetProjectContext({}, client, {
      projectMatch: 'ctx-project',
    });

    expect(client.get).toHaveBeenCalledWith(
      '/api/v1/mcp/project-context?project=ctx-project',
    );
  });

  it('falls back to the PAPUT_PROJECT_MATCH environment variable', async () => {
    process.env.PAPUT_PROJECT_MATCH = ' env-project ';
    const client = createMockClient();

    await handleGetProjectContext({}, client);

    expect(client.get).toHaveBeenCalledWith(
      '/api/v1/mcp/project-context?project=env-project',
    );
  });

  it('returns an error when no project match is configured', async () => {
    const client = createMockClient();

    const result = await handleGetProjectContext({}, client);

    expect(result).toEqual({
      content: [
        {
          type: 'text',
          text: 'project is required when PAPUT_PROJECT_MATCH is not configured.',
        },
      ],
      isError: true,
    });
    expect(client.get).not.toHaveBeenCalled();
  });
});
