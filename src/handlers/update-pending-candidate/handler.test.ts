import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createFingerprint,
  readCache,
  writePending,
} from '../../services/local-cache/index.js';
import type { ApiClient } from '../../services/api/client.js';
import type { PendingKnowledgeCandidate } from '../../types/knowledge.js';
import { handleUpdatePendingCandidate } from './handler.js';

describe('handleUpdatePendingCandidate', () => {
  const originalPaputHome = process.env.PAPUT_HOME;
  const tempDirs: string[] = [];

  afterEach(() => {
    vi.restoreAllMocks();
    if (originalPaputHome === undefined) {
      delete process.env.PAPUT_HOME;
    } else {
      process.env.PAPUT_HOME = originalPaputHome;
    }
    for (const dir of tempDirs.splice(0)) {
      rmSync(dir, { force: true, recursive: true });
    }
  });

  it('updates only provided fields and recomputes the fingerprint', async () => {
    const candidate = buildCandidate();
    setupTest(candidate);

    const result = await handleUpdatePendingCandidate(
      {
        candidate_id: candidate.id,
        title: 'Updated title',
        categories: ['MCP', 'Testing'],
        memo_type_keys: ['decision'],
        is_public: true,
      },
      apiClientStub(),
    );

    expect(result.structuredContent).toMatchObject({
      updated: true,
      candidate_id: candidate.id,
      title: 'Updated title',
      changed_fields: expect.arrayContaining([
        'title',
        'categories',
        'memo_type_keys',
        'is_public',
      ]),
    });

    const stored = readCache().pending.find((item) => item.id === candidate.id);
    expect(stored).toMatchObject({
      title: 'Updated title',
      body: candidate.body,
      categories: ['MCP', 'Testing'],
      memo_type_keys: ['decision'],
      is_public: true,
      status: 'pending',
      fingerprint: createFingerprint('Updated title', candidate.body),
    });
    expect(stored?.updated_at).not.toBe(candidate.updated_at);
  });

  it('returns an error when the candidate does not exist', async () => {
    setupTest(buildCandidate());

    const result = await handleUpdatePendingCandidate(
      { candidate_id: 'missing-id', title: 'x' },
      apiClientStub(),
    );

    expect(result.isError).toBe(true);
  });

  it('refuses to update a non-pending candidate', async () => {
    const candidate = buildCandidate({ status: 'saved' });
    setupTest(candidate);

    const result = await handleUpdatePendingCandidate(
      { candidate_id: candidate.id, title: 'x' },
      apiClientStub(),
    );

    expect(result.isError).toBe(true);
    const stored = readCache().pending.find((item) => item.id === candidate.id);
    expect(stored?.title).toBe(candidate.title);
  });

  it('rejects an empty title', async () => {
    const candidate = buildCandidate();
    setupTest(candidate);

    const result = await handleUpdatePendingCandidate(
      { candidate_id: candidate.id, title: '   ' },
      apiClientStub(),
    );

    expect(result.isError).toBe(true);
  });

  it('requires at least one updatable field', async () => {
    const candidate = buildCandidate();
    setupTest(candidate);

    const result = await handleUpdatePendingCandidate(
      { candidate_id: candidate.id },
      apiClientStub(),
    );

    expect(result.isError).toBe(true);
  });

  function setupTest(candidate: PendingKnowledgeCandidate): void {
    const paputHome = mkdtempSync(join(tmpdir(), 'paput-mcp-test-'));
    tempDirs.push(paputHome);
    process.env.PAPUT_HOME = paputHome;
    writePending([candidate]);
  }

  function apiClientStub(): ApiClient {
    return {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
      request: vi.fn(),
    } as unknown as ApiClient;
  }

  function buildCandidate(
    overrides: Partial<PendingKnowledgeCandidate> = {},
  ): PendingKnowledgeCandidate {
    return {
      id: 'candidate-id',
      session_id: 'session-id',
      source: 'codex',
      title: 'Reusable knowledge',
      body: 'Use a deterministic timestamp when saving pending knowledge.',
      categories: ['MCP'],
      memo_type_keys: [],
      projects: [],
      confidence: 0.9,
      is_public: false,
      status: 'pending',
      fingerprint: 'fingerprint',
      similar_memos: [],
      created_at: '2026-06-02T10:00:00.000Z',
      updated_at: '2026-06-02T10:00:00.000Z',
      ...overrides,
    };
  }
});
