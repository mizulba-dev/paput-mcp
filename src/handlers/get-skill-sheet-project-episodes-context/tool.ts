import { ToolHandler } from '../../types/index.js';
import { handler } from './handler.js';

export const getSkillSheetProjectEpisodesContextTool: ToolHandler = {
  definition: {
    name: 'paput_get_skill_sheet_project_episodes_context',
    description:
      'Get project information and public linked memo bodies so the MCP client AI model can draft design-and-judgment episodes for a skill sheet project. Private linked memos are returned only as a count.',
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
