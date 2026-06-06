import { ToolHandler } from '../../types/index.js';
import { handleListGoals } from './handler.js';

export const listGoalsTool: ToolHandler = {
  definition: {
    name: 'paput_list_goals',
    description:
      'List PaPut goals. Active goals are usually used as the basis for analysis, and archived goals are treated as history.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  handler: handleListGoals,
};
