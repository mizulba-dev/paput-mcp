import { ApiClient } from '../../services/api/client.js';
import { getMemo } from '../../services/api/memo.js';
import { GetMemoParams, GetMemoResponse } from '../../types/index.js';

export async function handleGetMemo(
  args: Record<string, unknown> | undefined,
  apiClient: ApiClient,
) {
  if (!args || typeof args.id !== 'number') {
    return {
      content: [
        {
          type: 'text',
          text: 'Memo ID is required.',
        },
      ],
      isError: true,
    };
  }

  const params: GetMemoParams = {
    id: args.id,
  };

  try {
    const result = await getMemo(apiClient, params);

    const categories =
      result.categories.length > 0
        ? `Categories: ${result.categories.map((c) => c.name).join(', ')}`
        : '';
    const visibility = result.is_public ? 'Public' : 'Private';
    const likeInfo = `Likes: ${result.like_count}${result.has_liked ? ' (liked)' : ''}`;
    const bookmarkInfo = `Bookmarks: ${result.bookmark_count}${result.has_bookmarked ? ' (bookmarked)' : ''}`;
    const projects =
      result.projects.length > 0
        ? `Project: ${result.projects.map((p) => p.title).join(', ')}`
        : '';

    const memoDetail = `【${result.title}】(${visibility})
${categories}
${projects}

${result.body}

${likeInfo}
${bookmarkInfo}

Created at: ${result.created_at}
Updated at: ${result.updated_at}
Author: ${result.user.name} (@${result.user.user_id})`;

    return {
      structuredContent: {
        memo: result,
      },
      content: [
        {
          type: 'text',
          text: memoDetail,
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
          text: `Error while fetching memo: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
}
