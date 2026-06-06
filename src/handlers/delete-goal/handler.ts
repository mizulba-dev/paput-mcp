import { ApiClient } from '../../services/api/client.js';
import { deleteGoal } from '../../services/api/goal.js';

export async function handleDeleteGoal(
  args: Record<string, unknown> | undefined,
  apiClient: ApiClient,
) {
  if (!args || typeof args.id !== 'number') {
    return {
      content: [{ type: 'text', text: 'Goal ID is required.' }],
      isError: true,
    };
  }

  try {
    await deleteGoal(apiClient, args.id);

    return {
      structuredContent: {
        success: true,
        deleted_goal_id: args.id,
      },
      content: [
        {
          type: 'text',
          text: `Goal was deleted: ${args.id}`,
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
          text: `Error while deleting goal: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
}
