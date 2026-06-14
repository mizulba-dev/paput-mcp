import { ApiClient } from '../../services/api/client.js';
import { createNote } from '../../services/api/note.js';
import { CreateNoteParams } from '../../types/index.js';

export async function handleCreateNote(
  args: Record<string, unknown> | undefined,
  apiClient: ApiClient,
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

  if (typeof args.title !== 'string') {
    return {
      content: [
        {
          type: 'text',
          text: 'Title must be a string',
        },
      ],
      isError: true,
    };
  }

  const params: CreateNoteParams = {
    title: args.title,
    is_public: typeof args.is_public === 'boolean' ? args.is_public : false,
  };

  if (Array.isArray(args.memo_ids)) {
    params.memos = args.memo_ids
      .filter((id): id is number => typeof id === 'number')
      .map((id) => ({ id }));
  }

  try {
    const result = await createNote(apiClient, params);

    if (!result.success) {
      return {
        content: [
          {
            type: 'text',
            text: `Failed to create note: ${result.error || 'Unknown error'}`,
          },
        ],
        isError: true,
      };
    }

    return {
      structuredContent: {
        success: true,
        action: 'created',
        note: {
          id: result.id || null,
          title: params.title,
          is_public: params.is_public,
          memos: params.memos || [],
        },
      },
      content: [
        {
          type: 'text',
          text: `Note "${params.title}" was created successfully.${result.id ? ` ID: ${result.id}` : ''}`,
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
          text: `Error while creating note: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
}
