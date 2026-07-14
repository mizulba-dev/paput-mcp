import { ToolHandler } from '../../types/index.js';
import { handleGetSkillSheet } from './handler.js';

export const getSkillSheetTool: ToolHandler = {
  definition: {
    name: 'paput_get_skill_sheet',
    description:
      'Get the PaPut skill sheet, including nearest station, gender, birth date, years of experience, self PR, skills, FAQ, and projects. These fields may contain personal profile information.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  handler: handleGetSkillSheet,
};
