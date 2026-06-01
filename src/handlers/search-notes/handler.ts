import { ApiClient } from '../../services/api/client.js';
import { searchNotes } from '../../services/api/note.js';
import { SearchNotesParams } from '../../types/index.js';

export async function handleSearchNotes(
  args: Record<string, unknown> | undefined,
  apiClient: ApiClient,
) {
  // パラメータの構築
  const params: SearchNotesParams = {};

  if (args) {
    if (typeof args.word === 'string') {
      params.word = args.word;
    }
    if (typeof args.is_public === 'boolean') {
      params.is_public = args.is_public;
    }
    if (typeof args.page === 'number' && args.page > 0) {
      params.page = args.page;
    }
    if (typeof args.limit === 'number' && args.limit > 0) {
      params.limit = args.limit;
    }
  }

  try {
    const result = await searchNotes(apiClient, params);

    if (!result.success) {
      return {
        content: [
          {
            type: 'text',
            text: `ノートの検索に失敗しました: ${result.error || '不明なエラー'}`,
          },
        ],
        isError: true,
      };
    }

    if (!result.notes || result.notes.length === 0) {
      return {
        structuredContent: {
          total: result.total || 0,
          notes: [],
        },
        content: [
          {
            type: 'text',
            text: '該当するノートが見つかりませんでした。',
          },
        ],
      };
    }

    const notesList = result.notes
      .map((note) => {
        const visibility = note.is_public ? '公開' : '非公開';
        const memoInfo =
          note.memo_count > 0 ? ` (メモ数: ${note.memo_count})` : '';
        return `- [${note.id}] ${note.title} (${visibility})${memoInfo}`;
      })
      .join('\n');

    const totalInfo = result.total
      ? `\n\n検索結果: ${result.notes.length}件 / 全${result.total}件`
      : '';

    return {
      structuredContent: {
        total: result.total,
        notes: result.notes,
      },
      content: [
        {
          type: 'text',
          text: `ノート一覧:\n${notesList}${totalInfo}`,
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
          text: `ノートの検索中にエラーが発生しました: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
}
