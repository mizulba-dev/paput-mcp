import { ApiClient } from '../../services/api/client.js';
import { updateProjectDocument } from '../../services/api/project-context.js';

export async function handleUpdateProjectDocument(
  args: Record<string, unknown> | undefined,
  apiClient: ApiClient,
) {
  const invalid = validateArgs(args);
  if (invalid) {
    return invalid;
  }

  const input = args as Record<string, unknown>;

  try {
    const document = await updateProjectDocument(apiClient, {
      id: input.id as number,
      title: input.title as string,
      summary: typeof input.summary === 'string' ? input.summary : undefined,
      body: input.body as string,
    });

    const decided = document.decided_at
      ? `\nDecided at: ${document.decided_at}`
      : '';

    return {
      structuredContent: document as unknown as Record<string, unknown>,
      content: [
        {
          type: 'text',
          text: `Project document updated: 【${document.title}】(ID: ${document.id}, ${document.kind}, ${document.status})${decided}`,
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
          text: `Failed to update project document: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
}

function validateArgs(args: Record<string, unknown> | undefined) {
  if (
    !args ||
    typeof args.id !== 'number' ||
    args.id <= 0 ||
    typeof args.title !== 'string' ||
    args.title.trim() === '' ||
    typeof args.body !== 'string' ||
    args.body.trim() === ''
  ) {
    return {
      content: [
        {
          type: 'text',
          text: 'id, title, and body are required.',
        },
      ],
      isError: true,
    };
  }

  return null;
}
