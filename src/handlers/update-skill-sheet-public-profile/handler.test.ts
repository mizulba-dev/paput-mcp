import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ApiClient } from '../../services/api/client.js';
import { handler } from './handler.js';

describe('update-skill-sheet-public-profile handler', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  function createMockClient() {
    return {
      put: vi.fn().mockResolvedValue(undefined),
    } as unknown as ApiClient;
  }

  it('parses stances and supporting_memo_ids and forwards them to the API', async () => {
    const client = createMockClient();

    await handler(
      {
        headline: 'フルスタックエンジニア',
        stances: [
          {
            type: 'decision',
            statement: '可逆で軽い解を優先し、破壊的なやり直しを却下する',
            supporting_memo_ids: [10, 11],
          },
          {
            type: 'operation',
            statement: 'fail-closed を既定にする',
            supporting_memo_ids: [20],
          },
        ],
        strength_labels: [
          {
            label: '設計',
            supporting_memo_ids: [10],
          },
        ],
      },
      client,
    );

    expect(client.put).toHaveBeenCalledTimes(1);
    const [path, body] = (client.put as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(path).toBe('/api/v1/mcp/skill-sheet/public-profile');
    expect(body.stances).toEqual([
      {
        type: 'decision',
        statement: '可逆で軽い解を優先し、破壊的なやり直しを却下する',
        supporting_memo_ids: [10, 11],
      },
      {
        type: 'operation',
        statement: 'fail-closed を既定にする',
        supporting_memo_ids: [20],
      },
    ]);
    expect(body.strength_labels[0].supporting_memo_ids).toEqual([10]);
  });

  it('drops stances without a statement and invalid memo ids', async () => {
    const client = createMockClient();

    await handler(
      {
        stances: [
          { type: 'decision', statement: '' },
          {
            type: 'decision',
            statement: '境界を意図で引く',
            supporting_memo_ids: [5, 0, -1, 'x', 3.5],
          },
        ],
      },
      client,
    );

    const [, body] = (client.put as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(body.stances).toHaveLength(1);
    expect(body.stances[0].statement).toBe('境界を意図で引く');
    expect(body.stances[0].supporting_memo_ids).toEqual([5]);
  });
});
