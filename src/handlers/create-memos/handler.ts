import { ApiClient } from '../../services/api/client.js';
import { createMemos } from '../../services/api/memo.js';
import { CreateMemoParams, type ToolContext } from '../../types/index.js';
import { buildCreateMemoParams } from './params.js';

export async function handleCreateMemos(
  args: Record<string, unknown> | undefined,
  apiClient: ApiClient,
  context?: ToolContext,
) {
  if (!args || !Array.isArray(args.memos)) {
    return {
      content: [{ type: 'text', text: 'memos must be an array' }],
      isError: true,
    };
  }

  const failed: Array<{ index: number; title?: string; error: string }> = [];
  const validMemos: CreateMemoParams[] = [];
  const originalIndexes: number[] = [];

  for (const [index, rawMemo] of args.memos.entries()) {
    if (typeof rawMemo !== 'object' || rawMemo === null) {
      failed.push({ index, error: 'Memo item must be an object' });
      continue;
    }

    const memoArgs = rawMemo as Record<string, unknown>;
    if (
      typeof memoArgs.title !== 'string' ||
      typeof memoArgs.body !== 'string'
    ) {
      failed.push({
        index,
        title: typeof memoArgs.title === 'string' ? memoArgs.title : undefined,
        error: 'Title and body must be strings',
      });
      continue;
    }

    try {
      const params = await buildCreateMemoParams(memoArgs, apiClient, context);
      validMemos.push(params);
      originalIndexes.push(index);
    } catch (error) {
      failed.push({
        index,
        title: typeof memoArgs.title === 'string' ? memoArgs.title : undefined,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  const result =
    validMemos.length > 0
      ? await createMemos(apiClient, { memos: validMemos })
      : {
          success: failed.length === 0,
          created_count: 0,
          failed_count: 0,
          created: [],
          failed: [],
        };

  const created = result.created.map((memo) => ({
    ...memo,
    index: originalIndexes[memo.index] ?? memo.index,
  }));
  const apiFailed = result.failed.map((memo) => ({
    ...memo,
    index: originalIndexes[memo.index] ?? memo.index,
  }));
  const allFailed = [...failed, ...apiFailed];

  const response = {
    success: allFailed.length === 0,
    action: 'created',
    created_count: created.length,
    failed_count: allFailed.length,
    created,
    failed: allFailed,
  };

  return {
    structuredContent: response,
    content: [
      {
        type: 'text',
        text: JSON.stringify(response, null, 2),
      },
    ],
    isError: allFailed.length > 0,
  };
}
