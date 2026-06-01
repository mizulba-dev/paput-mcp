import { ApiClient } from '../../services/api/client.js';
import { deleteSkillSheetProject } from '../../services/api/skill-sheet.js';

export async function handler(
  params: Record<string, unknown> | undefined,
  apiClient: ApiClient,
): Promise<Record<string, unknown>> {
  if (!params || typeof params.project_id !== 'number') {
    return {
      content: [
        {
          type: 'text',
          text: 'Project ID to delete is required',
        },
      ],
      isError: true,
    };
  }

  const projectId = params.project_id;
  await deleteSkillSheetProject(apiClient, projectId);

  return {
    structuredContent: {
      success: true,
      action: 'deleted',
      project_id: projectId,
    },
    content: [
      {
        type: 'text',
        text: 'Project was deleted',
      },
    ],
  };
}
