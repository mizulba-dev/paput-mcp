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
    content: [
      {
        type: 'text',
        text: '自己PRを更新しました',
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
