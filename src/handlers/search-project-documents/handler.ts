import { ApiClient } from '../../services/api/client.js';
import { searchProjectDocuments } from '../../services/api/project-context.js';

export async function handleSearchProjectDocuments(
  args: Record<string, unknown> | undefined,
  apiClient: ApiClient,
) {
  if (!args || typeof args.query !== 'string' || args.query.trim() === '') {
    return {
      content: [
        {
          type: 'text',
          text: 'query is required.',
        },
      ],
      isError: true,
    };
  }

  const query = args.query;
  const limit = typeof args.limit === 'number' ? args.limit : undefined;
  const includeArchived =
    typeof args.include_archived === 'boolean'
      ? args.include_archived
      : undefined;

  try {
    const result = await searchProjectDocuments(apiClient, {
      query,
      limit,
      include_archived: includeArchived,
    });

    if (result.documents.length === 0) {
      return {
        structuredContent: {
          documents: [],
        },
        content: [
          {
            type: 'text',
            text: 'No matching project documents found.',
          },
        ],
      };
    }

    const documentList = result.documents
      .map((doc) => {
        const summary = doc.summary ? ` — ${doc.summary}` : '';
        return `- [${doc.id}] (${doc.kind}, ${doc.status}, score ${doc.score.toFixed(3)}) ${doc.title}${summary}`;
      })
      .join('\n');

    return {
      structuredContent: {
        documents: result.documents,
      },
      content: [
        {
          type: 'text',
          text: `${result.documents.length} matching project documents found:\n\n${documentList}\n\nFetch a document body on demand with paput_get_project_document.`,
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
          text: `Failed to search project documents: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
}
