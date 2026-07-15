import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ApiClient } from '../../services/api/client.js';
import { handleAddKnowledgeCandidates } from './handler.js';

describe('handleAddKnowledgeCandidates', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  function createMockClient(handlers: {
    similar?: () => unknown;
    addCandidates?: (body: Record<string, unknown>) => unknown;
  }) {
    return {
      get: vi.fn().mockImplementation(async (endpoint: string) => {
        if (endpoint.startsWith('/api/v1/mcp/memos/similar')) {
          const value = (handlers.similar ?? (() => ({ memos: [] })))();
          if (value instanceof Error) throw value;
          return value;
        }
        throw new Error(`Unexpected endpoint: ${endpoint}`);
      }),
      post: vi
        .fn()
        .mockImplementation(async (endpoint: string, body: unknown) => {
          if (endpoint === '/api/v1/mcp/knowledge-candidates') {
            const request = body as {
              source: string;
              session_id: string;
              source_session_updated_at?: string;
              candidates: Array<Record<string, unknown>>;
            };
            const value = handlers.addCandidates?.(request) ?? {
              added: request.candidates.length,
              duplicates: 0,
              candidates: request.candidates.map((candidate, index) => ({
                id: `candidate-${index}`,
                session_id: request.session_id,
                source: request.source,
                source_session_updated_at: request.source_session_updated_at,
                status: 'pending',
                fingerprint: `fingerprint-${index}`,
                created_at: '2026-06-02T10:00:00.000Z',
                updated_at: '2026-06-02T10:00:00.000Z',
                ...candidate,
              })),
              duplicate_details: [],
            };
            if (value instanceof Error) throw value;
            return value;
          }
          throw new Error(`Unexpected endpoint: ${endpoint}`);
        }),
    } as unknown as ApiClient;
  }

  it('rejects invalid arguments', async () => {
    const client = createMockClient({});

    const noArgs = await handleAddKnowledgeCandidates(undefined, client);
    expect(noArgs.isError).toBe(true);

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

  it('requires session_id only for local session sources', async () => {
    const client = createMockClient({});

    for (const source of ['claude', 'codex']) {
      const missing = await handleAddKnowledgeCandidates(
        { source, candidates: [{ title: 'Knowledge', body: 'Body' }] },
        client,
      );
      expect(missing.isError).toBe(true);
    }

    const emptySession = await handleAddKnowledgeCandidates(
      {
        source: 'claude',
        session_id: '',
        candidates: [{ title: 'Knowledge', body: 'Body' }],
      },
      client,
    );
    expect(emptySession.isError).toBe(true);
  });

  it('adds candidates from conversation clients without a session_id', async () => {
    const client = createMockClient({});

    for (const source of ['claude-ai', 'chatgpt']) {
      const result = await handleAddKnowledgeCandidates(
        { source, candidates: [{ title: `From ${source}`, body: 'Body' }] },
        client,
      );

      expect(result.isError).toBeUndefined();
      expect(result.structuredContent).toMatchObject({ added: 1 });
    }

    const lastBody = (client.post as ReturnType<typeof vi.fn>).mock
      .calls[1][1] as Record<string, unknown>;
    expect(lastBody.source).toBe('chatgpt');
    expect(lastBody.session_id).toBeUndefined();
  });

  it('adds candidates with similar memos and an explicit source timestamp', async () => {
    const client = createMockClient({
      similar: () => ({
        memos: [{ id: 9, title: 'Existing memo', score: 0.5, body: 'b' }],
      }),
    });

    const result = await handleAddKnowledgeCandidates(
      {
        session_id: 'sess-1',
        source: 'claude',
        source_session_updated_at: '2026-06-21T00:00:00.000Z',
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
      source_session_updated_at: '2026-06-21T00:00:00.000Z',
    });
  });

  it('skips semantically near-duplicate candidates', async () => {
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
    expect(client.post).not.toHaveBeenCalled();
  });

  it('still adds candidates when the similarity search fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
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

  it('uses configured project context as the default candidate project', async () => {
    const client = createMockClient({});

    const result = await handleAddKnowledgeCandidates(
      {
        session_id: 'sess-1',
        source: 'claude',
        candidates: [{ title: 'Knowledge', body: 'Body' }],
      },
      client,
      { projectId: 5, projectTitle: 'paput' },
    );

    expect(result.structuredContent?.candidates[0].projects).toEqual([
      { id: 5, title: 'paput' },
    ]);
  });

  it('keeps explicit candidate projects over configured project context', async () => {
    const client = createMockClient({});

    const result = await handleAddKnowledgeCandidates(
      {
        session_id: 'sess-1',
        source: 'claude',
        candidates: [
          {
            title: 'Knowledge',
            body: 'Body',
            projects: [{ id: 9, title: 'explicit' }],
          },
        ],
      },
      client,
      { projectId: 5, projectTitle: 'paput' },
    );

    expect(result.structuredContent?.candidates[0].projects).toEqual([
      { id: 9, title: 'explicit' },
    ]);
  });

  it('keeps an explicit empty candidate projects array over configured project context', async () => {
    const client = createMockClient({});

    const result = await handleAddKnowledgeCandidates(
      {
        session_id: 'sess-1',
        source: 'claude',
        candidates: [
          {
            title: 'Knowledge',
            body: 'Body',
            projects: [],
          },
        ],
      },
      client,
      { projectId: 5, projectTitle: 'paput' },
    );

    expect(result.structuredContent?.candidates[0].projects).toEqual([]);
  });
});
