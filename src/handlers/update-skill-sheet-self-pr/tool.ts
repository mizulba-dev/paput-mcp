import { ToolHandler } from '../../types/index.js';
import { handler } from './handler.js';

export const updateSkillSheetSelfPrTool: ToolHandler = {
  definition: {
    name: 'paput_update_skill_sheet_self_pr',
    description:
      'Update the self PR section of the PaPut skill sheet. The text may appear on the public skill sheet.',
    inputSchema: {
      type: 'object',
      properties: {
        self_pr: {
          type: 'string',
          description: 'Self PR text',
        },
      },
    },
  },
  handler,
};
