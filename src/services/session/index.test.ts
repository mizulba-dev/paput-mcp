import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { readSessionMessages } from './index.js';

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
});

function writeJsonl(items: unknown[]): string {
  const dir = mkdtempSync(join(tmpdir(), 'paput-session-test-'));
  const path = join(dir, 'session.jsonl');
  writeFileSync(path, items.map((item) => JSON.stringify(item)).join('\n'));
  return path;
}
