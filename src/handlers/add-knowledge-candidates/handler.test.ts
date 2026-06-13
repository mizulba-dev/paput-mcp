import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ApiClient } from '../../services/api/client.js';
import { readCache } from '../../services/local-cache/index.js';
import { handleAddKnowledgeCandidates } from './handler.js';

const homeDirRef = vi.hoisted(() => ({ current: '' }));

vi.mock('node:os', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:os')>();
  return {
    ...actual,
    homedir: () => homeDirRef.current || actual.homedir(),
  };
});

describe('handleAddKnowledgeCandidates', () => {
  const originalPaputHome = process.env.PAPUT_HOME;
  let home: string;
  let sessionCwd: string;

  beforeEach(() => {
    home = mkdtempSync(join(tmpdir(), 'paput-add-candidates-test-'));
    homeDirRef.current = home;
    process.env.PAPUT_HOME = join(home, '.paput');
    sessionCwd = join(home, 'repo');
    mkdirSync(sessionCwd, { recursive: true });
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    homeDirRef.current = '';
    if (originalPaputHome === undefined) {
      delete process.env.PAPUT_HOME;
    } else {
      process.env.PAPUT_HOME = originalPaputHome;
    }
    rmSync(home, { force: true, recursive: true });
  });

  function writeSessionFile(sessionId: string): void {
    const dir = join(home, '.claude', 'projects', 'repo');
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      join(dir, `${sessionId}.jsonl`),
      JSON.stringify({
        type: 'user',
        cwd: sessionCwd,
        message: { role: 'user', content: [{ type: 'text', text: 'Hi' }] },
      }),
    );
  }

  function createMockClient(handlers: {
    similar?: () => unknown;
    projects?: () => unknown;
  }) {
    return {
      get: vi.fn().mockImplementation(async (endpoint: string) => {
        if (endpoint.startsWith('/api/v1/mcp/memos/similar')) {
          const value = (handlers.similar ?? (() => ({ memos: [] })))();
          if (value instanceof Error) throw value;
          return value;
        }
        if (endpoint.startsWith('/api/v1/mcp/skill-sheet/projects')) {
          const value = (handlers.projects ?? (() => []))();
          if (value instanceof Error) throw value;
          return value;
        }
        throw new Error(`Unexpected endpoint: ${endpoint}`);
      }),
    } as unknown as ApiClient;
  }

  it('rejects invalid arguments', async () => {
    const client = createMockClient({});

    const noSession = await handleAddKnowledgeCandidates(undefined, client);
    expect(noSession.isError).toBe(true);

    const badSource = await handleAddKnowledgeCandidates(
      { session_id: 's', source: 'cursor', candidates: [] },
      client,
    );
    expect(badSource.isError).toBe(true);

    const badCandidates = await handleAddKnowledgeCandidates(
      { session_id: 's', source: 'claude', candidates: 'nope' },
      client,
    );
    expect(badCandidates.isError).toBe(true);
  });

  it('adds candidates with similar memos and the session timestamp', async () => {
    writeSessionFile('sess-1');
    const client = createMockClient({
      similar: () => ({
        memos: [{ id: 9, title: 'Existing memo', score: 0.5, body: 'b' }],
      }),
    });

    const result = await handleAddKnowledgeCandidates(
      {
        session_id: 'sess-1',
        source: 'claude',
        candidates: [
          { title: 'New knowledge', body: 'Body', categories: ['Go', 1] },
          'broken',
          { title: 'No body' },
        ],
      },
      client,
    );

    expect(result.structuredContent).toMatchObject({
      added: 1,
      duplicates: 0,
    });
    expect(result.structuredContent?.candidates[0]).toMatchObject({
      title: 'New knowledge',
      categories: ['Go'],
      projects: [],
      similar_memos: [{ id: 9, title: 'Existing memo', score: 0.5 }],
    });
    expect(
      result.structuredContent?.candidates[0].source_session_updated_at,
    ).toEqual(expect.any(String));
    expect(readCache().pending).toHaveLength(1);
  });

  it('skips semantically near-duplicate candidates', async () => {
    writeSessionFile('sess-1');
    const client = createMockClient({
      similar: () => ({
        memos: [{ id: 9, title: 'Existing memo', score: 0.95 }],
      }),
    });

    const result = await handleAddKnowledgeCandidates(
      {
        session_id: 'sess-1',
        source: 'claude',
        candidates: [{ title: 'Duplicate', body: 'Body' }],
      },
      client,
    );

    expect(result.structuredContent).toMatchObject({
      added: 0,
      duplicates: 1,
    });
    expect(result.structuredContent?.duplicate_details[0]).toMatchObject({
      title: 'Duplicate',
      reason: 'Semantically near-duplicate of an existing memo',
    });
    expect(readCache().pending).toHaveLength(0);
  });

  it('still adds candidates when the similarity search fails', async () => {
    writeSessionFile('sess-1');
    const client = createMockClient({
      similar: () => new Error('similarity down'),
    });

    const result = await handleAddKnowledgeCandidates(
      {
        session_id: 'sess-1',
        source: 'claude',
        candidates: [{ title: 'Knowledge', body: 'Body' }],
      },
      client,
    );

    expect(result.structuredContent).toMatchObject({ added: 1 });
    expect(result.structuredContent?.candidates[0].similar_memos).toEqual([]);
  });

  it('attaches projects resolved from the session cwd', async () => {
    writeSessionFile('sess-1');
    writeFileSync(
      join(sessionCwd, '.mcp.json'),
      JSON.stringify({
        mcpServers: { paput: { env: { PAPUT_PROJECT_MATCH: 'paput' } } },
      }),
    );
    const client = createMockClient({
      projects: () => [{ id: 5, title: 'paput' }],
    });

    const result = await handleAddKnowledgeCandidates(
      {
        session_id: 'sess-1',
        source: 'claude',
        candidates: [{ title: 'Knowledge', body: 'Body' }],
      },
      client,
    );

    expect(result.structuredContent?.candidates[0].projects).toEqual([
      { id: 5, title: 'paput' },
    ]);
  });

  it('adds candidates without projects when project resolution fails', async () => {
    writeSessionFile('sess-1');
    writeFileSync(
      join(sessionCwd, '.mcp.json'),
      JSON.stringify({
        mcpServers: { paput: { env: { PAPUT_PROJECT_MATCH: 'paput' } } },
      }),
    );
    const client = createMockClient({
      projects: () => new Error('projects down'),
    });

    const result = await handleAddKnowledgeCandidates(
      {
        session_id: 'sess-1',
        source: 'claude',
        candidates: [{ title: 'Knowledge', body: 'Body' }],
      },
      client,
    );

    expect(result.structuredContent).toMatchObject({ added: 1 });
    expect(result.structuredContent?.candidates[0].projects).toEqual([]);
  });
});
