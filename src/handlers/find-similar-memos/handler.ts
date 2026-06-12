import { ApiClient } from '../../services/api/client.js';
import { findSimilarMemos } from '../../services/api/memo.js';

export async function handleFindSimilarMemos(
  args: Record<string, unknown> | undefined,
  apiClient: ApiClient,
) {
  if (!args || typeof args.query !== 'string' || args.query.trim() === '') {
    return {
      content: [
        {
          type: 'text',
          text: 'query is required.',
        },
      ],
      isError: true,
    };
  }

  const query = args.query;
  const limit = typeof args.limit === 'number' ? args.limit : undefined;

  try {
    const result = await findSimilarMemos(apiClient, { query, limit });

    if (!result.success) {
      return {
        content: [
          {
            type: 'text',
            text: `Failed to find similar memos: ${result.error || 'Unknown error'}`,
          },
        ],
        isError: true,
      };
    }

    if (!result.memos || result.memos.length === 0) {
      return {
        structuredContent: {
          memos: [],
        },
        content: [
          {
            type: 'text',
            text: 'No similar memos found. If memos exist but embeddings have not been generated yet, run paput_backfill_memo_embeddings first.',
          },
        ],
      };
    }

    const memoList = result.memos
      .map((memo) => {
        const categories =
          memo.categories.length > 0
            ? `Categories: ${memo.categories.map((c) => c.name).join(', ')}`
            : '';
        const visibility = memo.is_public ? 'Public' : 'Private';

        return `【${memo.title}】(ID: ${memo.id}, ${visibility}, Score: ${memo.score.toFixed(3)})
${categories}
${memo.body}
(Created at: ${memo.created_at})`;
      })
      .join('\n\n---\n\n');

    return {
      structuredContent: {
        memos: result.memos,
      },
      content: [
        {
          type: 'text',
          text: `${result.memos.length} similar memos found:\n\n${memoList}`,
        },
      ],
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';

    return {
      content: [
        {
          type: 'text',
          text: `Error while finding similar memos: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
}
