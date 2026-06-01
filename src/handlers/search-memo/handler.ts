import { ApiClient } from '../../services/api/client.js';
import { searchMemos } from '../../services/api/memo.js';
import { SearchMemoParams } from '../../types/index.js';

export async function handleSearchMemo(
  args: Record<string, unknown> | undefined,
  apiClient: ApiClient,
) {
  const params: SearchMemoParams = {};

  if (args) {
    if (typeof args.word === 'string') {
      params.word = args.word;
    }
    if (typeof args.category_id === 'number') {
      params.category_id = args.category_id;
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
            text: `メモの検索に失敗しました: ${result.error || '不明なエラー'}`,
          },
        ],
        isError: true,
      };
    }

    if (!result.memos || result.memos.length === 0) {
      return {
        structuredContent: {
          total: result.total || 0,
          memos: [],
        },
        content: [
          {
            type: 'text',
            text: '該当するメモが見つかりませんでした。',
          },
        ],
      };
    }

    const memoList = result.memos
      .map((memo) => {
        const categories =
          memo.categories.length > 0
            ? `カテゴリ: ${memo.categories.map((c) => c.name).join(', ')}`
            : '';
        const visibility = memo.is_public ? '公開' : '非公開';

        return `【${memo.title}】(ID: ${memo.id}, ${visibility})
${categories}
${memo.body}
(作成日: ${memo.created_at})`;
      })
      .join('\n\n---\n\n');

    return {
      structuredContent: {
        total: result.total,
        memos: result.memos,
      },
      content: [
        {
          type: 'text',
          text: `${result.total}件中${result.memos.length}件のメモが見つかりました:\n\n${memoList}`,
        },
      ],
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : '不明なエラー';

    return {
      content: [
        {
          type: 'text',
          text: `メモの検索中にエラーが発生しました: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
}
