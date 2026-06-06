import { ToolHandler } from '../../types/index.js';
import { handleGetDashboardAnalysis } from './handler.js';

export const getDashboardAnalysisTool: ToolHandler = {
  definition: {
    name: 'paput_get_dashboard_analysis',
    description: 'Get the saved PaPut dashboard analysis result.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  handler: handleGetDashboardAnalysis,
};
