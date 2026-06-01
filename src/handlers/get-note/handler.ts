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

  const params: GetNoteParams = {
    id: args.id,
  };

  try {
    const note = await getNote(apiClient, params);

    const visibility = note.is_public ? 'Public' : 'Private';
    const memoList = note.memos
      .map((memo) => {
        const categories =
          memo.categories.map((c) => c.name).join(', ') || 'None';
        const memoVisibility = memo.is_public ? 'Public' : 'Private';
        return `  - [${memo.id}] ${memo.title} (${memoVisibility})\n    Categories: ${categories}\n    ${memo.body.substring(0, 100)}${memo.body.length > 100 ? '...' : ''}`;
      })
      .join('\n\n');

    const content = `Note details:
ID: ${note.id}
Title: ${note.title}
Visibility: ${visibility}
Created at: ${note.created_at}
Updated at: ${note.updated_at}

Attached memos (${note.memos.length}):
${memoList || '  None'}`;

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
      error instanceof Error ? error.message : 'Unknown error';

    return {
      content: [
        {
          type: 'text',
          text: `Error while fetching note: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
}
