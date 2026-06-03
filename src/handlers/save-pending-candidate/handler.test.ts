import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { writePending } from '../../services/local-cache/index.js';
import type { ApiClient } from '../../services/api/client.js';
import type { PendingKnowledgeCandidate } from '../../types/knowledge.js';
import { handleSavePendingCandidate } from './handler.js';

describe('handleSavePendingCandidate', () => {
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

  it('uses the source session updated timestamp when available', async () => {
    const candidate = buildCandidate({
      source_session_updated_at: '2026-06-01T12:00:00.000Z',
    });
    const apiClient = setupSaveTest(candidate);

    const result = await handleSavePendingCandidate(
      { candidate_id: candidate.id },
      apiClient,
    );

    expect(apiClient.post).toHaveBeenCalledWith(
      '/api/v1/mcp/memo',
      expect.objectContaining({
        created_at: '2026-06-01T12:00:00.000Z',
      }),
    );
    expect(result.structuredContent).toMatchObject({
      created_at: '2026-06-01T12:00:00.000Z',
      created_at_source: 'source_session_updated_at',
      warnings: [],
    });
  });

  it('falls back to the pending candidate created timestamp', async () => {
    const candidate = buildCandidate({
      created_at: '2026-06-02T15:22:09.801Z',
    });
    const apiClient = setupSaveTest(candidate);

    const result = await handleSavePendingCandidate(
      { candidate_id: candidate.id },
      apiClient,
    );

    expect(apiClient.post).toHaveBeenCalledWith(
      '/api/v1/mcp/memo',
      expect.objectContaining({
        created_at: '2026-06-02T15:22:09.801Z',
      }),
    );
    expect(result.structuredContent).toMatchObject({
      created_at: '2026-06-02T15:22:09.801Z',
      created_at_source: 'pending_created_at',
      warnings: [
        'source_session_updated_at was not available; used pending candidate created_at',
      ],
    });
  });

  function setupSaveTest(candidate: PendingKnowledgeCandidate): ApiClient {
    const paputHome = mkdtempSync(join(tmpdir(), 'paput-mcp-test-'));
    tempDirs.push(paputHome);
    process.env.PAPUT_HOME = paputHome;
    writePending([candidate]);

    return {
      get: vi.fn().mockResolvedValue({
        memos: [
          {
            id: 123,
            title: candidate.title,
            body: candidate.body,
            categories: candidate.categories.map((name) => ({ name })),
            is_public: candidate.is_public,
            created_at: candidate.created_at,
            updated_at: candidate.updated_at,
          },
        ],
        total: 1,
      }),
      post: vi.fn().mockResolvedValue({}),
      put: vi.fn(),
      delete: vi.fn(),
      request: vi.fn(),
    };
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
