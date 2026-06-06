import { ToolHandler } from '../../types/index.js';
import { handleUpdateGoal } from './handler.js';

export const updateGoalTool: ToolHandler = {
  definition: {
    name: 'paput_update_goal',
    description:
      'Update a PaPut goal. The update request body must include the goal ID.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  handler: handleUpdateGoal,
};
