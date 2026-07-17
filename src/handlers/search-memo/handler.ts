import { ApiClient } from '../../services/api/client.js';
import { searchMemos } from '../../services/api/memo.js';
import { SearchMemoParams } from '../../types/index.js';

export async function handleSearchMemo(
  args: Record<string, unknown> | undefined,
  apiClient: ApiClient,
) {
  const params: SearchMemoParams = {};

  if (args) {
    if (typeof args.query === 'string') {
      params.query = args.query;
    }
    if (typeof args.category_id === 'number') {
      params.category_id = args.category_id;
    }
    if (typeof args.memo_type === 'string') {
      params.memo_type = args.memo_type;
    }
    if (Array.isArray(args.ids)) {
      params.ids = args.ids.filter(
        (id): id is number => typeof id === 'number',
      );
    }
    if (typeof args.date === 'string') {
      params.date = args.date;
    }
    if (typeof args.is_public === 'boolean') {
      params.is_public = args.is_public;
    }
    if (typeof args.page === 'number') {
      params.page = args.page;
    }
    if (typeof args.limit === 'number') {
      params.limit = args.limit;
    }
  }

  try {
    const result = await searchMemos(apiClient, params);

    if (!result.success) {
      return {
        content: [
          {
            type: 'text',
            text: `Failed to search memos: ${result.error || 'Unknown error'}`,
          },
        ],
        isError: true,
      };
    }

    const searchMode = result.search_mode ?? 'filter';

    if (!result.memos || result.memos.length === 0) {
      return {
        structuredContent: {
          total: result.total || 0,
          memos: [],
          search_mode: searchMode,
        },
        content: [
          {
            type: 'text',
            text: 'No matching memos found.',
          },
        ],
      };
    }

    const showMatchInfo = searchMode !== 'filter';
    const memoList = result.memos
      .map((memo) => {
        const categories =
          memo.categories.length > 0
            ? `Categories: ${memo.categories.map((c) => c.name).join(', ')}`
            : '';
        const memoTypes =
          memo.memo_types && memo.memo_types.length > 0
            ? `Types: ${memo.memo_types.map((t) => t.key).join(', ')}`
            : '';
        const visibility = memo.is_public ? 'Public' : 'Private';
        const match = showMatchInfo
          ? typeof memo.score === 'number'
            ? `, Score: ${memo.score.toFixed(3)}`
            : ', keyword match'
          : '';

        return `【${memo.title}】(ID: ${memo.id}, ${visibility}${match})
${categories}
${memoTypes}
${memo.body}
(Created at: ${memo.created_at})`;
      })
      .join('\n\n---\n\n');

    return {
      structuredContent: {
        total: result.total,
        memos: result.memos,
        search_mode: searchMode,
      },
      content: [
        {
          type: 'text',
          text: `${result.total} of ${result.memos.length} memos found (search_mode: ${searchMode}):\n\n${memoList}`,
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
          text: `Error while searching memos: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
}
