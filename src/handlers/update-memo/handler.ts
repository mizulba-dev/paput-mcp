import { ApiClient } from '../../services/api/client.js';
import { UpdateMemoParams, type ToolContext } from '../../types/index.js';
import { updateMemo } from '../../services/api/memo.js';
import { resolveMemoProjects } from '../memo-projects.js';

export async function handleUpdateMemo(
  args: Record<string, unknown> | undefined,
  apiClient: ApiClient,
  context?: ToolContext,
) {
  if (!args) {
    return {
      content: [
        {
          type: 'text',
          text: 'Missing parameters.',
        },
      ],
      isError: true,
    };
  }

  if (
    typeof args.id !== 'number' ||
    typeof args.title !== 'string' ||
    typeof args.body !== 'string' ||
    typeof args.is_public !== 'boolean'
  ) {
    return {
      content: [
        {
          type: 'text',
          text: 'Required parameters are missing or have invalid types.',
        },
      ],
      isError: true,
    };
  }

  const categories: UpdateMemoParams['categories'] = [];
  if (Array.isArray(args.categories)) {
    for (const cat of args.categories) {
      if (typeof cat === 'object' && cat !== null && 'name' in cat) {
        const category: UpdateMemoParams['categories'][0] = {
          name: String(cat.name),
        };
        if ('id' in cat && typeof cat.id === 'number') {
          category.id = cat.id;
        }
        categories.push(category);
      }
    }
  }

  const params: UpdateMemoParams = {
    id: args.id,
    title: args.title,
    body: args.body,
    is_public: args.is_public,
    categories,
  };

  params.projects = await resolveMemoProjects(args, apiClient, context);

  try {
    const result = await updateMemo(apiClient, params);

    if (!result.success) {
      return {
        content: [
          {
            type: 'text',
            text: `Failed to update memo: ${result.error || 'Unknown error'}`,
          },
        ],
        isError: true,
      };
    }

    let message = 'Memo was updated.';
    if (params.projects && params.projects.length > 0) {
      message += `\nProject: ${params.projects[0].title || `ID: ${params.projects[0].id}`}`;
    }

    return {
      structuredContent: {
        success: true,
        action: 'updated',
        memo: {
          id: params.id,
          title: params.title,
          is_public: params.is_public,
          categories: params.categories || [],
          projects: params.projects || [],
        },
      },
      content: [
        {
          type: 'text',
          text: message,
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
          text: `Error while updating memo: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
}
