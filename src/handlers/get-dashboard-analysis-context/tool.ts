import { ToolHandler } from '../../types/index.js';
import { handleGetDashboardAnalysisContext } from './handler.js';

export const getDashboardAnalysisContextTool: ToolHandler = {
  definition: {
    name: 'paput_get_dashboard_analysis_context',
    description:
      'Get dashboard, goals, skill sheet profile (including nearest station, gender, and birth date), recent memo, note, and category context so the MCP client AI model can generate a dashboard analysis.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  handler: handleGetDashboardAnalysisContext,
};
