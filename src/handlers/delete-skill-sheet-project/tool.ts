import { ToolHandler } from '../../types/index.js';
import { handler } from './handler.js';

export const deleteSkillSheetProjectTool: ToolHandler = {
  definition: {
    name: 'paput_delete_skill_sheet_project',
    description:
      'Delete a project from the PaPut skill sheet by project ID. Use only when the user intends to remove that skill sheet project.',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: {
          type: 'number',
          description: 'Project ID to delete',
        },
      },
      required: ['project_id'],
    },
  },
  handler,
};
