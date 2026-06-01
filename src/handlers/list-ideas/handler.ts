import { ApiClient } from '../../services/api/client.js';
import { listIdeas } from '../../services/api/idea.js';

export async function handleListIdeas(
  args: Record<string, unknown> | undefined,
  apiClient: ApiClient,
) {
  try {
    const result = await listIdeas(apiClient);

    if (!result.success) {
      return {
        content: [
          {
            type: 'text',
            text: `アイデアの取得に失敗しました: ${result.error || '不明なエラー'}`,
          },
        ],
        isError: true,
      };
    }

    if (!result.ideas || result.ideas.length === 0) {
      return {
        structuredContent: {
          ideas: [],
        },
        content: [
          {
            type: 'text',
            text: 'アイデアが登録されていません。',
          },
        ],
      };
    }

    const ideas = result.ideas.sort((a, b) => a.sort - b.sort);
    const ideasList = ideas
      .map((idea) => `- [${idea.id}] ${idea.title} (順序: ${idea.sort})`)
      .join('\n');

    return {
      structuredContent: {
        ideas,
      },
      content: [
        {
          type: 'text',
          text: `アイデア一覧 (${ideas.length}件):\n${ideasList}`,
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
          text: `アイデアの取得中にエラーが発生しました: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
}
