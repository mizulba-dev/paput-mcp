import { ToolHandler } from '../../types/index.js';
import { handleListPendingCandidates } from './handler.js';

export const listPendingCandidatesTool: ToolHandler = {
  definition: {
    name: 'paput_list_pending_candidates',
    description:
      'List pending knowledge candidates that have not yet been saved to PaPut. Use this when the user wants to review or decide what to save.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: 'Number of items to return. Defaults to 20.',
        },
      },
    },
  },
  handler: handleListPendingCandidates,
};
