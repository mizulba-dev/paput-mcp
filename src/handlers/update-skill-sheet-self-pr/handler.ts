import { ApiClient } from '../../services/api/client.js';
import { updateSkillSheetSelfPr } from '../../services/api/skill-sheet.js';

export interface UpdateSelfPrParams {
  self_pr?: string;
}

export async function handler(
  params: Record<string, unknown> | undefined,
  apiClient: ApiClient,
): Promise<Record<string, unknown>> {
  const selfPr = parseSelfPrParams(params);
  await updateSkillSheetSelfPr(apiClient, selfPr);

  return {
    structuredContent: {
      success: true,
      action: 'updated',
      self_pr: selfPr.self_pr || null,
    },
    content: [
      {
        type: 'text',
        text: 'Self PR was updated',
      },
    ],
  };
}

function parseSelfPrParams(
  params: Record<string, unknown> | undefined,
): UpdateSelfPrParams {
  if (!params || typeof params.self_pr !== 'string') {
    return {};
  }

  return { self_pr: params.self_pr };
}
