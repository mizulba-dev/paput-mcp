import { ToolHandler } from '../../types/index.js';
import { handleCreateGoal } from './handler.js';

export const createGoalTool: ToolHandler = {
  definition: {
    name: 'paput_create_goal',
    description:
      'Create a PaPut goal. Use active goals for current analysis targets and archived goals for historical context.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  handler: handleCreateGoal,
};
