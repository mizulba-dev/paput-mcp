import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ApiClient } from '../services/api/client.js';
import { resolveMemoProjects } from './memo-projects.js';

describe('resolveMemoProjects', () => {
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

  function createMockClient(
    projects: Array<{ id: number; title: string }> | Error = [],
  ) {
    return {
      get:
        projects instanceof Error
          ? vi.fn().mockRejectedValue(projects)
          : vi.fn().mockResolvedValue(projects),
    } as unknown as ApiClient;
  }

  it('uses an explicit projects array and filters invalid entries', async () => {
    const client = createMockClient();

    const result = await resolveMemoProjects(
      {
        projects: [{ id: 1, title: 'PaPut' }, { id: '2' }, 'broken', null],
      },
      client,
    );

    expect(result).toEqual([{ id: 1, title: 'PaPut' }]);
    expect(client.get).not.toHaveBeenCalled();
  });

  it('searches by args.project_match and returns the first result', async () => {
    const client = createMockClient([
      { id: 1, title: 'paput' },
      { id: 2, title: 'paput-api' },
    ]);

    const result = await resolveMemoProjects(
      { project_match: ' paput ' },
      client,
    );

    expect(client.get).toHaveBeenCalledWith(
      '/api/v1/mcp/skill-sheet/projects?search=paput',
    );
    expect(result).toEqual([{ id: 1, title: 'paput' }]);
  });

  it('falls back to the tool context project match', async () => {
    const client = createMockClient([{ id: 3, title: 'ctx' }]);

    const result = await resolveMemoProjects({}, client, {
      projectMatch: 'ctx',
    });

    expect(result).toEqual([{ id: 3, title: 'ctx' }]);
  });

  it('falls back to the PAPUT_PROJECT_MATCH environment variable', async () => {
    process.env.PAPUT_PROJECT_MATCH = 'env-project';
    const client = createMockClient([{ id: 4, title: 'env-project' }]);

    const result = await resolveMemoProjects({}, client);

    expect(client.get).toHaveBeenCalledWith(
      '/api/v1/mcp/skill-sheet/projects?search=env-project',
    );
    expect(result).toEqual([{ id: 4, title: 'env-project' }]);
  });

  it('returns undefined when no project match is configured', async () => {
    const client = createMockClient();

    await expect(resolveMemoProjects({}, client)).resolves.toBeUndefined();
    expect(client.get).not.toHaveBeenCalled();
  });

  it('returns undefined when the search has no results', async () => {
    const client = createMockClient([]);

    await expect(
      resolveMemoProjects({ project_match: 'paput' }, client),
    ).resolves.toBeUndefined();
  });

  it('returns undefined when the search fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const client = createMockClient(new Error('api down'));

    await expect(
      resolveMemoProjects({ project_match: 'paput' }, client),
    ).resolves.toBeUndefined();
  });
});
