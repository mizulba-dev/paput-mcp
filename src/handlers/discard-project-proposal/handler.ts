import { ApiClient } from '../../services/api/client.js';
import { discardProjectProposal } from '../../services/api/project-context.js';

export async function handleDiscardProjectProposal(
  args: Record<string, unknown> | undefined,
  apiClient: ApiClient,
) {
  if (
    !args ||
    typeof args.id !== 'number' ||
    typeof args.reason !== 'string' ||
    args.reason.trim() === ''
  ) {
    return {
      content: [
        {
          type: 'text',
          text: 'id and reason are required.',
        },
      ],
      isError: true,
    };
  }

  try {
    await discardProjectProposal(apiClient, {
      id: args.id,
      reason: args.reason,
    });

    return {
      structuredContent: { success: true, id: args.id },
      content: [
        {
          type: 'text',
          text: `Skill proposal ${args.id} discarded. It will be proposed again only if the repetition count grows substantially.`,
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
          text: `Failed to discard project proposal: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
}
