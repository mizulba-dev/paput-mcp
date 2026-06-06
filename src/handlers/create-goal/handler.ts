import { ApiClient } from '../../services/api/client.js';
import { createGoal } from '../../services/api/goal.js';
import type {
  CreateGoalParams,
  GoalCategory,
  GoalStatus,
} from '../../types/index.js';

const goalCategories = ['career', 'learning', 'portfolio', 'project', 'other'];
const goalStatuses = ['active', 'archived'];

export async function handleCreateGoal(
  args: Record<string, unknown> | undefined,
  apiClient: ApiClient,
) {
  const params = parseGoalParams(args);
  if (!params) {
    return {
      content: [
        {
          type: 'text',
          text: 'Title, category, status, and priority are required.',
        },
      ],
      isError: true,
    };
  }

  try {
    const goal = await createGoal(apiClient, params);

    return {
      structuredContent: {
        success: true,
        goal,
      },
      content: [
        {
          type: 'text',
          text: `Goal was created: ${goal.title} (ID: ${goal.id})`,
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
          text: `Error while creating goal: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
}

function parseGoalParams(
  args: Record<string, unknown> | undefined,
): CreateGoalParams | null {
  if (
    !args ||
    typeof args.title !== 'string' ||
    !isGoalCategory(args.category) ||
    !isGoalStatus(args.status) ||
    typeof args.priority !== 'number'
  ) {
    return null;
  }

  return {
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
