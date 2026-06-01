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
          content: [{ type: 'text', text: '相談です' }],
        },
      },
      {
        type: 'assistant',
        message: {
          role: 'assistant',
          content: [{ type: 'text', text: '回答です' }],
        },
      },
    ]);

    expect(readSessionMessages('claude', path)).toEqual([
      { role: 'user', text: '相談です' },
      { role: 'assistant', text: '回答です' },
    ]);
  });

  it('parses Codex JSONL message content', () => {
    const path = writeJsonl([
      {
        type: 'response_item',
        payload: {
          type: 'message',
          role: 'user',
          content: [{ type: 'input_text', text: '依頼です' }],
        },
      },
      {
        type: 'response_item',
        payload: {
          type: 'message',
          role: 'assistant',
          content: [{ type: 'output_text', text: '対応しました' }],
        },
      },
    ]);

    expect(readSessionMessages('codex', path)).toEqual([
      { role: 'user', text: '依頼です' },
      { role: 'assistant', text: '対応しました' },
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
            content: [{ summary: '要約です' }],
          },
        }),
      ].join('\n'),
    );

    expect(readSessionMessages('codex', path)).toEqual([
      { role: 'assistant', text: '要約です' },
    ]);
  });
});

function writeJsonl(items: unknown[]): string {
  const dir = mkdtempSync(join(tmpdir(), 'paput-session-test-'));
  const path = join(dir, 'session.jsonl');
  writeFileSync(path, items.map((item) => JSON.stringify(item)).join('\n'));
  return path;
}
