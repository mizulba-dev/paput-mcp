import { ToolHandler } from '../../types/index.js';
import { handler } from './handler.js';

export const updateSkillSheetBasicInfoTool: ToolHandler = {
  definition: {
    name: 'paput_update_skill_sheet_basic_info',
    description:
      'Update basic profile fields on the PaPut skill sheet, such as nearest station, gender, birth date, and years of experience.',
    inputSchema: {
      type: 'object',
      properties: {
        nearest_station: {
          type: 'string',
          description: 'Nearest station',
        },
        gender: {
          type: 'number',
          description: 'Gender: 1 male, 2 female',
        },
        birth_date: {
          type: 'string',
          description: 'Birth date in YYYY-MM-DD format',
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
