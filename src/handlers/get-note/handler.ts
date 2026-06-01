import { ApiClient } from '../../services/api/client.js';
import { getNote } from '../../services/api/note.js';
import { GetNoteParams } from '../../types/index.js';

export async function handleGetNote(
  args: Record<string, unknown> | undefined,
  apiClient: ApiClient,
) {
  if (!args) {
    return {
      content: [
        {
          type: 'text',
          text: 'パラメータが不足しています',
        },
      ],
      isError: true,
    };
  }

  // パラメータの検証
  if (typeof args.id !== 'number') {
    return {
      content: [
        {
          type: 'text',
          text: 'IDは数値で指定してください',
        },
      ],
      isError: true,
    };
  }

  const params: GetNoteParams = {
    id: args.id,
  };

  try {
    const note = await getNote(apiClient, params);

    const visibility = note.is_public ? '公開' : '非公開';
    const memoList = note.memos
      .map((memo) => {
        const categories =
          memo.categories.map((c) => c.name).join(', ') || 'なし';
        const memoVisibility = memo.is_public ? '公開' : '非公開';
        return `  - [${memo.id}] ${memo.title} (${memoVisibility})\n    カテゴリ: ${categories}\n    ${memo.body.substring(0, 100)}${memo.body.length > 100 ? '...' : ''}`;
      })
      .join('\n\n');

    const content = `ノート詳細:
ID: ${note.id}
タイトル: ${note.title}
公開設定: ${visibility}
作成日時: ${note.created_at}
更新日時: ${note.updated_at}

含まれるメモ (${note.memos.length}件):
${memoList || '  なし'}`;

    return {
      structuredContent: {
        note,
      },
      content: [
        {
          type: 'text',
          text: content,
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
          text: `ノートの取得中にエラーが発生しました: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
}
