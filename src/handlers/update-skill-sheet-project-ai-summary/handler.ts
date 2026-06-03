import { ApiClient } from '../../services/api/client.js';
import { updateSkillSheetProjectAiSummary } from '../../services/api/skill-sheet.js';

export async function handler(
  params: Record<string, unknown> | undefined,
  apiClient: ApiClient,
): Promise<Record<string, unknown>> {
  if (
    !params ||
    typeof params.project_id !== 'number' ||
    typeof params.ai_summary !== 'string' ||
    params.ai_summary.trim().length === 0
  ) {
    return {
      content: [
        {
          type: 'text',
          text: 'Project ID and non-empty AI summary are required',
        },
      ],
      isError: true,
    };
  }

  const result = await updateSkillSheetProjectAiSummary(
    apiClient,
    params.project_id,
    params.ai_summary.trim(),
  );

  return {
    structuredContent: {
      success: true,
      project: result,
    },
    content: [
      {
        type: 'text',
        text: `Project AI summary was updated: ${result.title} (ID: ${result.id})`,
      },
    ],
  };
}
