import { ApiClient } from '../../services/api/client.js';
import { backfillMemoEmbeddings } from '../../services/api/memo.js';

export async function handleBackfillMemoEmbeddings(
  _args: Record<string, unknown> | undefined,
  apiClient: ApiClient,
) {
  try {
    const result = await backfillMemoEmbeddings(apiClient);

    if (!result.success) {
      return {
        content: [
          {
            type: 'text',
            text: `Failed to backfill memo embeddings: ${result.error || 'Unknown error'}`,
          },
        ],
        isError: true,
      };
    }

    const hasMoreNote = result.has_more
      ? ' More memos remain; call this tool again to continue.'
      : ' All memos are now processed.';

    return {
      structuredContent: {
        processed: result.processed,
        failed: result.failed,
        has_more: result.has_more,
      },
      content: [
        {
          type: 'text',
          text: `Embeddings generated for ${result.processed} memos (${result.failed} failed).${hasMoreNote}`,
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
          text: `Error while backfilling memo embeddings: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
}
