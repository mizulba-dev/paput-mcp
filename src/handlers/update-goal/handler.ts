import { ApiClient } from '../../services/api/client.js';
import { updateGoal } from '../../services/api/goal.js';
import type {
  GoalCategory,
  GoalStatus,
  UpdateGoalParams,
} from '../../types/index.js';

const goalCategories = ['career', 'learning', 'portfolio', 'project', 'other'];
const goalStatuses = ['active', 'archived'];

export async function handleUpdateGoal(
  args: Record<string, unknown> | undefined,
  apiClient: ApiClient,
) {
  const params = parseUpdateGoalParams(args);
  if (!params) {
    return {
      content: [
        {
          type: 'text',
          text: 'ID, title, category, status, and priority are required.',
        },
      ],
      isError: true,
    };
  }

  try {
    await updateGoal(apiClient, params);

    return {
      structuredContent: {
        success: true,
        goal: params,
      },
      content: [
        {
          type: 'text',
          text: `Goal was updated: ${params.title} (ID: ${params.id})`,
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
          text: `Error while updating goal: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
}

function parseUpdateGoalParams(
  args: Record<string, unknown> | undefined,
): UpdateGoalParams | null {
  if (
    !args ||
    typeof args.id !== 'number' ||
    typeof args.title !== 'string' ||
    !isGoalCategory(args.category) ||
    !isGoalStatus(args.status) ||
    typeof args.priority !== 'number'
  ) {
    return null;
  }

  return {
    id: args.id,
    title: args.title,
    description: typeof args.description === 'string' ? args.description : null,
    category: args.category,
    status: args.status,
    priority: args.priority,
    target_date: typeof args.target_date === 'string' ? args.target_date : null,
  };
}

function isGoalCategory(value: unknown): value is GoalCategory {
  return typeof value === 'string' && goalCategories.includes(value);
}

function isGoalStatus(value: unknown): value is GoalStatus {
  return typeof value === 'string' && goalStatuses.includes(value);
}
