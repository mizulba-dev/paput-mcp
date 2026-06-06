import { ApiClient } from '../../services/api/client.js';
import { listGoals } from '../../services/api/goal.js';

export async function handleListGoals(
  _args: Record<string, unknown> | undefined,
  apiClient: ApiClient,
) {
  try {
    const goals = await listGoals(apiClient);

    if (goals.length === 0) {
      return {
        structuredContent: { goals: [] },
        content: [{ type: 'text', text: 'Goals were not found.' }],
      };
    }

    const goalList = goals
      .map((goal) => {
        const targetDate = goal.target_date || 'Not set';
        const description = goal.description || 'Not set';
        return `- [${goal.id}] ${goal.title} (${goal.status}, ${goal.category}, priority ${goal.priority})
  Target date: ${targetDate}
  Description: ${description}`;
      })
      .join('\n');

    return {
      structuredContent: { goals },
      content: [
        {
          type: 'text',
          text: `Goals:\n${goalList}`,
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
          text: `Error while fetching goals: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
}
