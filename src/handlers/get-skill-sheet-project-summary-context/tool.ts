import { ToolHandler } from '../../types/index.js';
import { handler } from './handler.js';

export const getSkillSheetProjectSummaryContextTool: ToolHandler = {
  definition: {
    name: 'paput_get_skill_sheet_project_summary_context',
    description:
      'Get project information and related memo bodies so the MCP client AI model can generate a skill sheet project summary.',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: {
          type: 'number',
          description: 'Project ID',
        },
      },
      required: ['project_id'],
    },
  },
  handler,
};
