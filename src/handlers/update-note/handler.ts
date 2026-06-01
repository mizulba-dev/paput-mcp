import { ApiClient } from '../../services/api/client.js';
import { updateNote } from '../../services/api/note.js';
import { UpdateNoteParams } from '../../types/index.js';

export async function handleUpdateNote(
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

  // Validate parameters
  if (typeof args.id !== 'number') {
    return {
      content: [
        {
          type: 'text',
          text: 'ID must be a number',
        },
      ],
      isError: true,
    };
  }

  // Require at least one update field
  const hasUpdateFields =
    typeof args.title === 'string' ||
    typeof args.is_public === 'boolean' ||
    Array.isArray(args.memo_ids);

  if (!hasUpdateFields) {
    return {
      content: [
        {
          type: 'text',
          text: 'Specify at least one field to update',
        },
      ],
      isError: true,
    };
  }

  // Build parameters
  const params: UpdateNoteParams = {
    id: args.id,
  };

  if (typeof args.title === 'string') {
    params.title = args.title;
  }

  if (typeof args.is_public === 'boolean') {
    params.is_public = args.is_public;
  }

  if (Array.isArray(args.memo_ids)) {
    params.memos = args.memo_ids
      .filter((id): id is number => typeof id === 'number')
      .map((id) => ({ id }));
  }

  try {
    const result = await updateNote(apiClient, params);

    if (!result.success) {
      return {
        content: [
          {
            type: 'text',
            text: `Failed to update note: ${result.error || 'Unknown error'}`,
          },
        ],
        isError: true,
      };
    }

    const updateInfo = [];
    if (params.title) updateInfo.push(`Title: ${params.title}`);
    if (params.is_public !== undefined)
      updateInfo.push(`Visibility: ${params.is_public ? 'Public' : 'Private'}`);
    if (params.memos) updateInfo.push(`Memo count: ${params.memos.length}`);

    return {
      structuredContent: {
        success: true,
        action: 'updated',
        note: {
          id: params.id,
          title: params.title,
          is_public: params.is_public,
          memos: params.memos,
        },
      },
      content: [
        {
          type: 'text',
          text: `Note (ID: ) was updated successfully.\nUpdated fields:\n${updateInfo.map((info) => `  - ${info}`).join('\n')}`,
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
          text: `Error while updating note: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
}
