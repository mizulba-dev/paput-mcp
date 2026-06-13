import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ApiClient } from '../../services/api/client.js';
import { handleGetSessionTranscript } from './handler.js';

const homeDirRef = vi.hoisted(() => ({ current: '' }));

vi.mock('node:os', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:os')>();
  return {
    ...actual,
    homedir: () => homeDirRef.current || actual.homedir(),
  };
});

describe('handleGetSessionTranscript', () => {
  const originalPaputHome = process.env.PAPUT_HOME;
  let home: string;

  beforeEach(() => {
    home = mkdtempSync(join(tmpdir(), 'paput-transcript-test-'));
    homeDirRef.current = home;
    process.env.PAPUT_HOME = join(home, '.paput');
  });

  afterEach(() => {
    homeDirRef.current = '';
    if (originalPaputHome === undefined) {
      delete process.env.PAPUT_HOME;
    } else {
      process.env.PAPUT_HOME = originalPaputHome;
    }
    rmSync(home, { force: true, recursive: true });
  });

  const apiClient = {} as ApiClient;

  function writeClaudeSession(sessionId: string, answer = 'Answer'): void {
    const dir = join(home, '.claude', 'projects', 'repo');
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      join(dir, `${sessionId}.jsonl`),
      [
        JSON.stringify({
          type: 'user',
          message: {
            role: 'user',
            content: [{ type: 'text', text: 'Question' }],
          },
        }),
        JSON.stringify({
          type: 'assistant',
          message: {
            role: 'assistant',
            content: [{ type: 'text', text: answer }],
          },
        }),
      ].join('\n'),
    );
  }

  it('returns the formatted transcript for a known session', async () => {
    writeClaudeSession('sess-1');

    const result = await handleGetSessionTranscript(
      { session_id: 'sess-1', source: 'claude' },
      apiClient,
    );

    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toBe(
      'User:\nQuestion\n\n---\n\nAssistant:\nAnswer',
    );
    expect(result.structuredContent).toMatchObject({
      session_id: 'sess-1',
      source: 'claude',
      max_chars: 20000,
    });
  });

  it('truncates long transcripts from the head and clamps max_chars to 1000', async () => {
    writeClaudeSession('sess-long', 'x'.repeat(3000));

    const result = await handleGetSessionTranscript(
      { session_id: 'sess-long', source: 'claude', max_chars: 5 },
      apiClient,
    );

    expect(result.structuredContent?.max_chars).toBe(1000);
    expect(result.content[0].text).toHaveLength(1000);
    expect(result.content[0].text).toBe('x'.repeat(1000));
  });

  it('rejects missing session_id or invalid source', async () => {
    const missingId = await handleGetSessionTranscript(
      { source: 'claude' },
      apiClient,
    );
    expect(missingId.isError).toBe(true);
    expect(missingId.content[0].text).toBe('session_id is required');

    const badSource = await handleGetSessionTranscript(
      { session_id: 'sess-1', source: 'cursor' },
      apiClient,
    );
    expect(badSource.isError).toBe(true);
    expect(badSource.content[0].text).toBe('source must be claude or codex');
  });

  it('reports unknown sessions as errors', async () => {
    const result = await handleGetSessionTranscript(
      { session_id: 'missing', source: 'claude' },
      apiClient,
    );

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toBe('Session not found: claude:missing');
  });
});
