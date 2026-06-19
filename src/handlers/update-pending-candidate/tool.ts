import { ToolHandler } from '../../types/index.js';
import { handleUpdatePendingCandidate } from './handler.js';

export const updatePendingCandidateTool: ToolHandler = {
  definition: {
    name: 'paput_update_pending_candidate',
    description:
      'Update an existing pending knowledge candidate in the local cache before it is saved to PaPut. Only fields you provide are changed; omitted fields keep their current value. Use this to refine a candidate (title, body, categories, memo type keys, confidence, visibility, or linked projects) instead of discarding and re-adding it. Only candidates that are still pending can be updated.',
    inputSchema: {
      type: 'object',
      properties: {
        candidate_id: {
          type: 'string',
          description: 'Pending candidate ID to update',
        },
        title: { type: 'string', description: 'Replacement title' },
        body: { type: 'string', description: 'Replacement body' },
        categories: {
          type: 'array',
          items: { type: 'string' },
          description: 'Replacement category names',
        },
        memo_type_keys: {
          type: 'array',
          items: {
            type: 'string',
            enum: ['knowledge', 'decision', 'operation', 'principle'],
          },
          description:
            'Memo type classification keys (a memo can have multiple). decision/operation/principle are the primary material for the public AI summary.',
        },
        confidence: { type: 'number', description: 'Confidence score' },
        is_public: {
          type: 'boolean',
          description: 'Whether the saved memo will be public',
        },
        projects: {
          type: 'array',
          description: 'Replacement linked projects',
          items: {
            type: 'object',
            properties: {
              id: { type: 'number' },
              title: { type: 'string' },
            },
            required: ['id'],
          },
        },
      },
      required: ['candidate_id'],
    },
  },
  handler: handleUpdatePendingCandidate,
};
