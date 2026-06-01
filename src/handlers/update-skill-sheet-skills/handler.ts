import { ApiClient } from '../../services/api/client.js';
import { updateSkillSheetSkills } from '../../services/api/skill-sheet.js';
import type { SkillSheetSkill } from '../../types/skill-sheet.js';

export interface UpdateSkillsParams {
  skills: SkillSheetSkill[];
}

export async function handler(
  params: Record<string, unknown> | undefined,
  apiClient: ApiClient,
): Promise<Record<string, unknown>> {
  const skills = parseSkills(params);

  if (!skills) {
    return {
      content: [
        {
          type: 'text',
          text: 'Skill list is required',
        },
      ],
      isError: true,
    };
  }

  await updateSkillSheetSkills(apiClient, { skills });

  return {
    structuredContent: {
      success: true,
      action: 'replaced',
      skills,
    },
    content: [
      {
        type: 'text',
        text: 'Skill list was updated',
      },
    ],
  };
}

function parseSkills(
  params: Record<string, unknown> | undefined,
): SkillSheetSkill[] | undefined {
  if (!params || !Array.isArray(params.skills)) return undefined;

  const skills = params.skills.filter(isSkillSheetSkill);
  return skills.length === params.skills.length ? skills : undefined;
}

function isSkillSheetSkill(value: unknown): value is SkillSheetSkill {
  return (
    typeof value === 'object' &&
    value !== null &&
    'category' in value &&
    isSkillCategory(value.category) &&
    'category_type' in value &&
    typeof value.category_type === 'number' &&
    'level' in value &&
    typeof value.level === 'string' &&
    'years' in value &&
    typeof value.years === 'number'
  );
}

function isSkillCategory(
  value: unknown,
): value is { id: number; name: string } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    typeof value.id === 'number' &&
    'name' in value &&
    typeof value.name === 'string'
  );
}
