import { ToolHandler } from '../../types/index.js';
import { handler } from './handler.js';

export const updateSkillSheetBasicInfoTool: ToolHandler = {
  definition: {
    name: 'paput_update_skill_sheet_basic_info',
    description:
      'Update personal profile fields on the PaPut skill sheet, including nearest station, gender, birth date, and years of experience. These values may appear on the public skill sheet, so provide them only when the user explicitly intends to update the profile.',
    inputSchema: {
      type: 'object',
      properties: {
        nearest_station: {
          type: 'string',
          description:
            'Nearest station stored in the skill sheet profile; this is personal location information.',
        },
        gender: {
          type: 'number',
          description:
            'Gender stored in the skill sheet profile: 1 male, 2 female.',
        },
        birth_date: {
          type: 'string',
          description:
            'Birth date stored in the skill sheet profile in YYYY-MM-DD format.',
        },
        years_of_experience: {
          type: 'number',
          description: 'Years of experience',
        },
      },
    },
  },
  handler,
};
