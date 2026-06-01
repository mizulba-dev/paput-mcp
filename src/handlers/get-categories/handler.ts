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
            text: 'No categories are registered.',
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
          text: `Available categories:\n\n${categoryList}`,
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
          text: `Error while fetching categories: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
}
