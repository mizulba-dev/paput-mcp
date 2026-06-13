import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { readSessionCwd, readSessionMessages } from './index.js';

describe('readSessionMessages', () => {
  it('parses Claude JSONL message content', () => {
    const path = writeJsonl([
      {
        type: 'user',
        message: {
          role: 'user',
          content: [{ type: 'text', text: 'Question' }],
        },
      },
      {
        type: 'assistant',
        message: {
          role: 'assistant',
          content: [{ type: 'text', text: 'Answer' }],
        },
      },
    ]);

    expect(readSessionMessages('claude', path)).toEqual([
      { role: 'user', text: 'Question' },
      { role: 'assistant', text: 'Answer' },
    ]);
  });

  it('parses Codex JSONL message content', () => {
    const path = writeJsonl([
      {
        type: 'response_item',
        payload: {
          type: 'message',
          role: 'user',
          content: [{ type: 'input_text', text: 'Request' }],
        },
      },
      {
        type: 'response_item',
        payload: {
          type: 'message',
          role: 'assistant',
          content: [{ type: 'output_text', text: 'Done' }],
        },
      },
    ]);

    expect(readSessionMessages('codex', path)).toEqual([
      { role: 'user', text: 'Request' },
      { role: 'assistant', text: 'Done' },
    ]);
  });

  it('ignores malformed lines and unsupported records', () => {
    const dir = mkdtempSync(join(tmpdir(), 'paput-session-test-'));
    const path = join(dir, 'session.jsonl');
    writeFileSync(
      path,
      [
        '{not json}',
        JSON.stringify({ type: 'unknown' }),
        JSON.stringify({
          type: 'response_item',
          payload: {
            type: 'message',
            role: 'assistant',
            content: [{ summary: 'Summary' }],
          },
        }),
      ].join('\n'),
    );

    expect(readSessionMessages('codex', path)).toEqual([
      { role: 'assistant', text: 'Summary' },
    ]);
  });

  it('parses string message content', () => {
    const path = writeJsonl([
      {
        type: 'user',
        message: { role: 'user', content: '  Plain text  ' },
      },
    ]);

    expect(readSessionMessages('claude', path)).toEqual([
      { role: 'user', text: 'Plain text' },
    ]);
  });

  it('ignores records whose type and message role mismatch', () => {
    const path = writeJsonl([
      {
        type: 'user',
        message: {
          role: 'system',
          content: [{ type: 'text', text: 'System' }],
        },
      },
      {
        type: 'assistant',
        message: { role: 'assistant', content: [] },
      },
    ]);

    expect(readSessionMessages('claude', path)).toEqual([]);
  });
});

describe('readSessionCwd', () => {
  it('reads the top-level cwd from Claude JSONL', () => {
    const path = writeJsonl([
      { type: 'summary' },
      { type: 'user', cwd: '/repo/project', message: { role: 'user' } },
    ]);

    expect(readSessionCwd('claude', path)).toBe('/repo/project');
  });

  it('falls back to message.cwd and payload.cwd for Claude JSONL', () => {
    const messagePath = writeJsonl([
      { type: 'user', message: { cwd: '/repo/from-message' } },
    ]);
    const payloadPath = writeJsonl([
      { type: 'user', payload: { cwd: '/repo/from-payload' } },
    ]);

    expect(readSessionCwd('claude', messagePath)).toBe('/repo/from-message');
    expect(readSessionCwd('claude', payloadPath)).toBe('/repo/from-payload');
  });

  it('reads only payload.cwd for Codex JSONL', () => {
    const path = writeJsonl([
      { type: 'session_meta', cwd: '/repo/top-level' },
      { type: 'session_meta', payload: { cwd: '/repo/codex' } },
    ]);

    expect(readSessionCwd('codex', path)).toBe('/repo/codex');
  });

  it('returns undefined when no cwd is recorded', () => {
    const path = writeJsonl([{ type: 'user', message: { role: 'user' } }]);

    expect(readSessionCwd('claude', path)).toBeUndefined();
  });

  it('skips malformed lines while searching for cwd', () => {
    const dir = mkdtempSync(join(tmpdir(), 'paput-session-test-'));
    const path = join(dir, 'session.jsonl');
    writeFileSync(
      path,
      ['{broken', JSON.stringify({ type: 'user', cwd: '/repo/ok' })].join('\n'),
    );

    expect(readSessionCwd('claude', path)).toBe('/repo/ok');
  });
});

function writeJsonl(items: unknown[]): string {
  const dir = mkdtempSync(join(tmpdir(), 'paput-session-test-'));
  const path = join(dir, 'session.jsonl');
  writeFileSync(path, items.map((item) => JSON.stringify(item)).join('\n'));
  return path;
}
