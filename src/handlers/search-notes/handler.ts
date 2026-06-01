import { ApiClient } from '../../services/api/client.js';
import { searchNotes } from '../../services/api/note.js';
import { SearchNotesParams } from '../../types/index.js';

export async function handleSearchNotes(
  args: Record<string, unknown> | undefined,
  apiClient: ApiClient,
) {
  // Build parameters
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
            text: `Failed to search notes: ${result.error || 'Unknown error'}`,
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
            text: 'No matching notes found.',
          },
        ],
      };
    }

    const notesList = result.notes
      .map((note) => {
        const visibility = note.is_public ? 'Public' : 'Private';
        const memoInfo =
          note.memo_count > 0 ? ` (Memo count: ${note.memo_count})` : '';
        return `- [${note.id}] ${note.title} (${visibility})${memoInfo}`;
      })
      .join('\n');

    const totalInfo = result.total
      ? `\n\nSearch results: ${result.notes.length} / total ${result.total}`
      : '';

    return {
      structuredContent: {
        total: result.total,
        notes: result.notes,
      },
      content: [
        {
          type: 'text',
          text: `Notes:\n${notesList}${totalInfo}`,
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
          text: `Error while searching notes: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
}
