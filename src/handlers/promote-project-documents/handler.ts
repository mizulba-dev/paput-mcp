import { ApiClient } from '../../services/api/client.js';
import { promoteProjectDocuments } from '../../services/api/project-context.js';

export async function handlePromoteProjectDocuments(
  args: Record<string, unknown> | undefined,
  apiClient: ApiClient,
) {
  const ids = Array.isArray(args?.ids)
    ? args.ids.filter((id): id is number => typeof id === 'number')
    : [];

  if (
    !args ||
    ids.length === 0 ||
    typeof args.promoted_to !== 'string' ||
    args.promoted_to.trim() === ''
  ) {
    return {
      content: [
        {
          type: 'text',
          text: 'ids and promoted_to are required.',
        },
      ],
      isError: true,
    };
  }

  try {
    await promoteProjectDocuments(apiClient, {
      ids,
      promoted_to: args.promoted_to,
    });

    return {
      structuredContent: {
        success: true,
        ids,
        promoted_to: args.promoted_to,
      },
      content: [
        {
          type: 'text',
          text: `${ids.length} documents promoted to "${args.promoted_to}" (status: retired). Future identical procedures will be guided to this skill instead of being recorded again.`,
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
          text: `Failed to promote project documents: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
}
