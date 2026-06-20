import { ToolHandler } from '../../types/index.js';
import { handleGetDiscardPolicyContext } from './handler.js';

export const getDiscardPolicyContextTool: ToolHandler = {
  definition: {
    name: 'paput_get_discard_policy_context',
    description:
      'Get discarded knowledge candidates and the current capture policy so the client AI can analyze rejection patterns.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: 'Maximum number of discarded candidates to include.',
        },
      },
    },
  },
  handler: handleGetDiscardPolicyContext,
};
