import { ApiClient } from '../../services/api/client.js';
import { updateProjectInstructions } from '../../services/api/project-context.js';

export async function handleUpdateProjectInstructions(
  args: Record<string, unknown> | undefined,
  apiClient: ApiClient,
) {
  if (
    !args ||
    typeof args.skill_sheet_project_id !== 'number' ||
    typeof args.body !== 'string' ||
    args.body.trim() === ''
  ) {
    return {
      content: [
        {
          type: 'text',
          text: 'skill_sheet_project_id and body are required.',
        },
      ],
      isError: true,
    };
  }

  try {
    const result = await updateProjectInstructions(apiClient, {
      skill_sheet_project_id: args.skill_sheet_project_id,
      body: args.body,
    });

    return {
      structuredContent: result as unknown as Record<string, unknown>,
      content: [
        {
          type: 'text',
          text: `Project instructions updated (project ID: ${result.skill_sheet_project_id}, updated at: ${result.updated_at}). They will be applied from the next session onward.`,
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
          text: `Failed to update project instructions: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
}
