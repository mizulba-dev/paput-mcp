import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ApiClient } from '../services/api/client.js';
import { resolveMemoProjects } from './memo-projects.js';

describe('resolveMemoProjects', () => {
  afterEach(() => {
    vi.restoreAllMocks();
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

  it('rejects ambiguous args.project_match results', async () => {
    const client = createMockClient([
      { id: 1, title: 'paput' },
      { id: 2, title: 'paput-api' },
    ]);

    await expect(
      resolveMemoProjects({ project_match: ' paput ' }, client),
    ).rejects.toThrow('project_match matched multiple projects');

    expect(client.get).toHaveBeenCalledWith(
      '/api/v1/mcp/skill-sheet/projects?search=paput',
    );
  });

  it('ignores the configured project context and does not auto-link', async () => {
    const client = createMockClient();

    const result = await resolveMemoProjects({}, client, {
      projectId: 3,
      projectTitle: 'ctx',
    });

    expect(result).toBeUndefined();
    expect(client.get).not.toHaveBeenCalled();
  });

  it('prefers an explicit projects array over the configured context', async () => {
    const client = createMockClient();

    const result = await resolveMemoProjects(
      { projects: [{ id: 1, title: 'PaPut' }] },
      client,
      { projectId: 3, projectTitle: 'ctx' },
    );

    expect(result).toEqual([{ id: 1, title: 'PaPut' }]);
    expect(client.get).not.toHaveBeenCalled();
  });

  it('returns undefined when no project selector is configured', async () => {
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

  it('rejects when the search fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const client = createMockClient(new Error('api down'));

    await expect(
      resolveMemoProjects({ project_match: 'paput' }, client),
    ).rejects.toThrow('api down');
  });
});
