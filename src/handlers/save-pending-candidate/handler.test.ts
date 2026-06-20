import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ApiClient } from '../../services/api/client.js';
import type { PendingKnowledgeCandidate } from '../../types/knowledge.js';
import { handleSavePendingCandidate } from './handler.js';

describe('handleSavePendingCandidate', () => {
  afterEach(() => {
    vi.restoreAllMocks();
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
      '/api/v1/mcp/memos',
      expect.objectContaining({
        memos: [
          expect.objectContaining({
            created_at: '2026-06-01T12:00:00.000Z',
          }),
        ],
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
      '/api/v1/mcp/memos',
      expect.objectContaining({
        memos: [
          expect.objectContaining({
            created_at: '2026-06-02T15:22:09.801Z',
          }),
        ],
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

  it('uses an existing memo ID when retrying a candidate save', async () => {
    const candidate = buildCandidate();
    const apiClient = setupSaveTest(candidate);

    const result = await handleSavePendingCandidate(
      { candidate_id: candidate.id, saved_memo_id: 456 },
      apiClient,
    );

    expect(apiClient.post).not.toHaveBeenCalled();
    expect(apiClient.put).toHaveBeenCalledWith(
      '/api/v1/mcp/knowledge-candidate/save',
      expect.objectContaining({
        candidate_id: candidate.id,
        saved_memo_id: 456,
      }),
    );
    expect(result.structuredContent).toMatchObject({
      success: true,
      memo_id: 456,
      used_existing_memo: true,
    });
  });

  it('treats a saved candidate with the same memo ID as an idempotent retry', async () => {
    const candidate = buildCandidate({
      status: 'saved',
      saved_memo_id: 456,
    });
    const apiClient = setupSaveTest(candidate);

    const result = await handleSavePendingCandidate(
      { candidate_id: candidate.id, saved_memo_id: 456 },
      apiClient,
    );

    expect(apiClient.post).not.toHaveBeenCalled();
    expect(apiClient.put).not.toHaveBeenCalled();
    expect(result.structuredContent).toMatchObject({
      success: true,
      memo_id: 456,
      created_at_source: 'saved_candidate',
      used_existing_memo: true,
    });
  });

  it('returns retry args when candidate save fails after memo creation', async () => {
    const candidate = buildCandidate();
    const apiClient = setupSaveTest(candidate, {
      saveError: new Error('candidate save failed'),
    });

    const result = await handleSavePendingCandidate(
      { candidate_id: candidate.id },
      apiClient,
    );

    expect(result.isError).toBe(true);
    expect(result.structuredContent).toMatchObject({
      success: false,
      action: 'save_candidate_failed_after_memo_created',
      candidate_id: candidate.id,
      memo_id: 123,
      retry_args: {
        candidate_id: candidate.id,
        saved_memo_id: 123,
      },
    });
  });

  function setupSaveTest(
    candidate: PendingKnowledgeCandidate,
    options: { saveError?: Error; createdMemoId?: number } = {},
  ): ApiClient {
    return {
      get: vi.fn().mockImplementation(async (endpoint: string) => {
        if (endpoint === `/api/v1/mcp/knowledge-candidate/${candidate.id}`) {
          return candidate;
        }
        throw new Error(`Unexpected endpoint: ${endpoint}`);
      }),
      post: vi.fn().mockResolvedValue({
        success: true,
        created_count: 1,
        failed_count: 0,
        created: [
          {
            index: 0,
            id: options.createdMemoId ?? 123,
            title: candidate.title,
          },
        ],
        failed: [],
      }),
      put: vi
        .fn()
        .mockImplementation(async (endpoint: string, body: unknown) => {
          if (endpoint === '/api/v1/mcp/knowledge-candidate/save') {
            if (options.saveError) throw options.saveError;
            return {
              success: true,
              action: 'saved',
              candidate_id: candidate.id,
              memo_id:
                (body as { saved_memo_id?: number }).saved_memo_id ??
                options.createdMemoId ??
                123,
              title: candidate.title,
              candidate: {
                ...candidate,
                ...(body as Record<string, unknown>),
                status: 'saved',
              },
            };
          }
          throw new Error(`Unexpected endpoint: ${endpoint}`);
        }),
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
