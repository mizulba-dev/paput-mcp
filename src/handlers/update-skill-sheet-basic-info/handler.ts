import { ApiClient } from '../../services/api/client.js';
import { updateSkillSheetBasicInfo } from '../../services/api/skill-sheet.js';

export interface UpdateBasicInfoParams {
  nearest_station?: string;
  gender?: number;
  birth_date?: string;
  years_of_experience?: number;
}

export async function handler(
  params: Record<string, unknown> | undefined,
  apiClient: ApiClient,
): Promise<Record<string, unknown>> {
  const basicInfo = parseBasicInfoParams(params);
  await updateSkillSheetBasicInfo(apiClient, basicInfo);

  return {
    content: [
      {
        type: 'text',
        text: '基本情報を更新しました',
      },
    ],
  };
}

function parseBasicInfoParams(
  params: Record<string, unknown> | undefined,
): UpdateBasicInfoParams {
  const basicInfo: UpdateBasicInfoParams = {};
  if (!params) return basicInfo;

  if (typeof params.nearest_station === 'string') {
    basicInfo.nearest_station = params.nearest_station;
  }
  if (typeof params.gender === 'number') {
    basicInfo.gender = params.gender;
  }
  if (typeof params.birth_date === 'string') {
    basicInfo.birth_date = params.birth_date;
  }
  if (typeof params.years_of_experience === 'number') {
    basicInfo.years_of_experience = params.years_of_experience;
  }

  return basicInfo;
}
