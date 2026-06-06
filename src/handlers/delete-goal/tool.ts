import { ToolHandler } from '../../types/index.js';
import { handleDeleteGoal } from './handler.js';

export const deleteGoalTool: ToolHandler = {
  definition: {
    name: 'paput_delete_goal',
    description: 'Delete a PaPut goal by ID.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  handler: handleDeleteGoal,
};
