import { ApiClient } from '../../services/api/client.js';
import { createMemo } from '../../services/api/memo.js';
import { CreateMemoParams, type ToolContext } from '../../types/index.js';
import { resolveMemoProjects } from '../memo-projects.js';

export async function handleCreateMemo(
  args: Record<string, unknown> | undefined,
  apiClient: ApiClient,
  context?: ToolContext,
) {
  if (!args) {
    return {
      content: [
        {
          type: 'text',
          text: 'Missing parameters',
        },
      ],
      isError: true,
    };
  }

  // Validate parameters
  if (typeof args.title !== 'string' || typeof args.body !== 'string') {
    return {
      content: [
        {
          type: 'text',
          text: 'Title and body must be strings',
        },
      ],
      isError: true,
    };
  }

  // Build parameters
  const params: CreateMemoParams = {
    title: args.title,
    body: args.body,
    is_public: typeof args.is_public === 'boolean' ? args.is_public : false,
  };

  if (typeof args.created_at === 'string') {
    params.created_at = args.created_at;
  }

  // Process categories
  if (Array.isArray(args.categories)) {
    params.categories = args.categories
      .filter((item): item is string => typeof item === 'string')
      .map((name) => ({ name }));
  }

  params.projects = await resolveMemoProjects(args, apiClient, context);

  try {
    const result = await createMemo(apiClient, params);

    if (!result.success) {
      return {
        content: [
          {
            type: 'text',
            text: `Failed to create memo: ${result.error || 'Unknown error'}`,
          },
        ],
        isError: true,
      };
    }

    let message = `Memo "" was created successfully.`;
    if (params.projects && params.projects.length > 0) {
      message += `\nProject: ${params.projects[0].title || `ID: ${params.projects[0].id}`}`;
    }

    return {
      structuredContent: {
        success: true,
        action: 'created',
        memo: {
          title: params.title,
          is_public: params.is_public,
          created_at: params.created_at,
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
          text: `Error while creating memo: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
}
