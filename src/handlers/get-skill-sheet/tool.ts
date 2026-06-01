import { ToolHandler } from '../../types/index.js';
import { handleGetSkillSheet } from './handler.js';

export const getSkillSheetTool: ToolHandler = {
  definition: {
    name: 'paput_get_skill_sheet',
    description:
      'Get the PaPut skill sheet, including basic profile information, self PR, skills, and projects.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  handler: handleGetSkillSheet,
};
