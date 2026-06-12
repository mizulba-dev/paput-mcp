import { ApiClient } from '../../services/api/client.js';
import { getProjectDocument } from '../../services/api/project-context.js';

export async function handleGetProjectDocument(
  args: Record<string, unknown> | undefined,
  apiClient: ApiClient,
) {
  if (!args || typeof args.id !== 'number' || args.id <= 0) {
    return {
      content: [
        {
          type: 'text',
          text: 'id is required.',
        },
      ],
      isError: true,
    };
  }

  try {
    const document = await getProjectDocument(apiClient, args.id);

    const promoted = document.promoted_to
      ? `\nPromoted to: ${document.promoted_to}`
      : '';
    const decided = document.decided_at
      ? `\nDecided at: ${document.decided_at}`
      : '';

    return {
      structuredContent: document as unknown as Record<string, unknown>,
      content: [
        {
          type: 'text',
          text: `【${document.title}】(ID: ${document.id}, ${document.kind}, ${document.status})${promoted}${decided}\n\n${document.body}\n\n(Created at: ${document.created_at}, Updated at: ${document.updated_at})`,
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
          text: `Failed to get project document: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
}
