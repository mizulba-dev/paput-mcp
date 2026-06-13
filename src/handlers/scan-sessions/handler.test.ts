import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ApiClient } from '../../services/api/client.js';
import { markSessionProcessed } from '../../services/local-cache/index.js';
import { handleScanSessions } from './handler.js';

const homeDirRef = vi.hoisted(() => ({ current: '' }));

vi.mock('node:os', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:os')>();
  return {
    ...actual,
    homedir: () => homeDirRef.current || actual.homedir(),
  };
});

describe('handleScanSessions', () => {
  const originalPaputHome = process.env.PAPUT_HOME;
  let home: string;

  beforeEach(() => {
    home = mkdtempSync(join(tmpdir(), 'paput-scan-sessions-test-'));
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

  function writeClaudeSession(sessionId: string): void {
    const dir = join(home, '.claude', 'projects', 'repo');
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      join(dir, `${sessionId}.jsonl`),
      [
        JSON.stringify({
          type: 'user',
          cwd: '/repo/project',
          message: {
            role: 'user',
            content: [{ type: 'text', text: 'Question' }],
          },
        }),
        JSON.stringify({
          type: 'assistant',
          message: {
            role: 'assistant',
            content: [{ type: 'text', text: 'Answer' }],
          },
        }),
      ].join('\n'),
    );
  }

  function writeCodexSession(sessionId: string): void {
    const dir = join(home, '.codex', 'sessions', '2026');
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      join(dir, `${sessionId}.jsonl`),
      JSON.stringify({
        type: 'response_item',
        payload: {
          type: 'message',
          role: 'user',
          content: [{ type: 'input_text', text: 'Request' }],
        },
      }),
    );
  }

  it('scans Claude and Codex sessions with metadata', async () => {
    writeClaudeSession('sess-claude');
    writeCodexSession('sess-codex');

    const result = await handleScanSessions(undefined, apiClient);

    expect(result.structuredContent.count).toBe(2);
    expect(result.structuredContent.sessions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          session_id: 'sess-claude',
          source: 'claude',
          cwd: '/repo/project',
          message_count: 2,
          processed: false,
        }),
        expect.objectContaining({
          session_id: 'sess-codex',
          source: 'codex',
          message_count: 1,
          processed: false,
        }),
      ]),
    );
  });

  it('filters by the requested sources and falls back on invalid input', async () => {
    writeClaudeSession('sess-claude');
    writeCodexSession('sess-codex');

    const claudeOnly = await handleScanSessions(
      { sources: ['claude'] },
      apiClient,
    );
    expect(claudeOnly.structuredContent.count).toBe(1);
    expect(claudeOnly.structuredContent.sessions[0].source).toBe('claude');

    const fallback = await handleScanSessions(
      { sources: ['invalid'] },
      apiClient,
    );
    expect(fallback.structuredContent.count).toBe(2);
  });

  it('excludes processed sessions unless include_processed is set', async () => {
    writeClaudeSession('sess-claude');
    writeCodexSession('sess-codex');
    markSessionProcessed('claude', 'sess-claude', '');

    const result = await handleScanSessions(undefined, apiClient);
    expect(result.structuredContent.count).toBe(1);
    expect(result.structuredContent.sessions[0].session_id).toBe('sess-codex');

    const includeProcessed = await handleScanSessions(
      { include_processed: true },
      apiClient,
    );
    expect(includeProcessed.structuredContent.count).toBe(2);
    expect(
      includeProcessed.structuredContent.sessions.find(
        (session) => session.session_id === 'sess-claude',
      )?.processed,
    ).toBe(true);
  });

  it('returns an empty result when no session directories exist', async () => {
    const result = await handleScanSessions(undefined, apiClient);

    expect(result.structuredContent).toEqual({ count: 0, sessions: [] });
  });
});
