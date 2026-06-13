import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ApiClient } from '../api/client.js';
import { resolveProjectsForCwd } from './index.js';

describe('resolveProjectsForCwd', () => {
  let root: string;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'paput-project-match-test-'));
  });

  afterEach(() => {
    rmSync(root, { force: true, recursive: true });
  });

  function createMockClient(
    projects: Array<{ id: number; title: string }> | Error,
  ) {
    return {
      get:
        projects instanceof Error
          ? vi.fn().mockRejectedValue(projects)
          : vi.fn().mockResolvedValue(projects),
    } as unknown as ApiClient;
  }

  function writeMcpJson(dir: string, projectMatch: string): void {
    writeFileSync(
      join(dir, '.mcp.json'),
      JSON.stringify({
        mcpServers: {
          paput: { env: { PAPUT_PROJECT_MATCH: projectMatch } },
        },
      }),
    );
  }

  it('returns an empty list when cwd is undefined', async () => {
    const client = createMockClient([]);

    await expect(resolveProjectsForCwd(client, undefined)).resolves.toEqual([]);
    expect(client.get).not.toHaveBeenCalled();
  });

  it('returns an empty list when no config is found', async () => {
    const client = createMockClient([]);

    await expect(resolveProjectsForCwd(client, root)).resolves.toEqual([]);
    expect(client.get).not.toHaveBeenCalled();
  });

  it('reads PAPUT_PROJECT_MATCH from .mcp.json in the cwd', async () => {
    writeMcpJson(root, 'paput');
    const client = createMockClient([{ id: 1, title: 'PaPut' }]);

    const result = await resolveProjectsForCwd(client, root);

    expect(client.get).toHaveBeenCalledWith(
      '/api/v1/mcp/skill-sheet/projects?search=paput',
    );
    expect(result).toEqual([{ id: 1, title: 'PaPut' }]);
  });

  it('walks up ancestor directories to find .mcp.json', async () => {
    const nested = join(root, 'packages', 'app');
    mkdirSync(nested, { recursive: true });
    writeMcpJson(root, 'paput');
    const client = createMockClient([{ id: 1, title: 'paput' }]);

    await expect(resolveProjectsForCwd(client, nested)).resolves.toEqual([
      { id: 1, title: 'paput' },
    ]);
  });

  it('reads PAPUT_PROJECT_MATCH from .codex/config.toml', async () => {
    mkdirSync(join(root, '.codex'), { recursive: true });
    writeFileSync(
      join(root, '.codex', 'config.toml'),
      '[mcp_servers.paput.env]\nPAPUT_PROJECT_MATCH = "codex-project"\n',
    );
    const client = createMockClient([{ id: 2, title: 'Codex-Project' }]);

    const result = await resolveProjectsForCwd(client, root);

    expect(client.get).toHaveBeenCalledWith(
      '/api/v1/mcp/skill-sheet/projects?search=codex-project',
    );
    expect(result).toEqual([{ id: 2, title: 'Codex-Project' }]);
  });

  it('prefers .mcp.json over .codex/config.toml in the same directory', async () => {
    writeMcpJson(root, 'from-mcp-json');
    mkdirSync(join(root, '.codex'), { recursive: true });
    writeFileSync(
      join(root, '.codex', 'config.toml'),
      'PAPUT_PROJECT_MATCH = "from-toml"\n',
    );
    const client = createMockClient([{ id: 1, title: 'from-mcp-json' }]);

    await resolveProjectsForCwd(client, root);

    expect(client.get).toHaveBeenCalledWith(
      '/api/v1/mcp/skill-sheet/projects?search=from-mcp-json',
    );
  });

  it('ignores a broken .mcp.json', async () => {
    writeFileSync(join(root, '.mcp.json'), '{broken');
    const client = createMockClient([]);

    await expect(resolveProjectsForCwd(client, root)).resolves.toEqual([]);
    expect(client.get).not.toHaveBeenCalled();
  });

  it('selects the case-insensitive exact title match from multiple results', async () => {
    writeMcpJson(root, 'PaPut');
    const client = createMockClient([
      { id: 1, title: 'paput-related' },
      { id: 2, title: 'paput' },
    ]);

    await expect(resolveProjectsForCwd(client, root)).resolves.toEqual([
      { id: 2, title: 'paput' },
    ]);
  });

  it('returns an empty list when multiple results have no exact match', async () => {
    writeMcpJson(root, 'paput');
    const client = createMockClient([
      { id: 1, title: 'paput-api' },
      { id: 2, title: 'paput-front' },
    ]);

    await expect(resolveProjectsForCwd(client, root)).resolves.toEqual([]);
  });

  it('returns an empty list when the search has no results', async () => {
    writeMcpJson(root, 'paput');
    const client = createMockClient([]);

    await expect(resolveProjectsForCwd(client, root)).resolves.toEqual([]);
  });

  it('propagates API failures to the caller', async () => {
    writeMcpJson(root, 'paput');
    const client = createMockClient(new Error('api down'));

    await expect(resolveProjectsForCwd(client, root)).rejects.toThrow(
      'api down',
    );
  });
});
