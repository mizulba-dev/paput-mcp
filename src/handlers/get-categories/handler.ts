import { getCategories } from '../../services/api/category.js';
import { ApiClient } from '../../services/api/client.js';

export async function handleGetCategories(
  args: Record<string, unknown> | undefined,
  apiClient: ApiClient,
) {
  try {
    const categories = await getCategories(apiClient);

    if (categories.length === 0) {
      return {
        structuredContent: {
          categories,
        },
        content: [
          {
            type: 'text',
            text: 'カテゴリーが登録されていません。',
          },
        ],
      };
    }

    const categoryList = categories
      .map((category) => `• ${category.name} (ID: ${category.id})`)
      .join('\n');

    return {
      structuredContent: {
        categories,
      },
      content: [
        {
          type: 'text',
          text: `利用可能なカテゴリー:\n\n${categoryList}`,
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
          text: `カテゴリーの取得中にエラーが発生しました: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
}
