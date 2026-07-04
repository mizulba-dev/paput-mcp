import { ToolHandler } from '../../types/index.js';
import { handleSavePendingCandidate } from './handler.js';

export const savePendingCandidateTool: ToolHandler = {
  definition: {
    name: 'paput_save_pending_candidate',
    description:
      'Save an approved pending knowledge candidate as a PaPut memo. Use only when the user explicitly approves saving a pending candidate.',
    inputSchema: {
      type: 'object',
      properties: {
        candidate_id: { type: 'string', description: 'Candidate ID to save' },
        saved_memo_id: {
          type: 'number',
          description:
            'Existing memo ID to attach when retrying after memo creation succeeded but candidate save failed. Omit for normal saves.',
        },
        title: { type: 'string', description: 'Title override when saving' },
        body: { type: 'string', description: 'Body override when saving' },
        created_at: {
          type: 'string',
          description:
            'Creation timestamp to use for the PaPut memo. Defaults to the source session updated timestamp, then the pending candidate created timestamp.',
        },
        categories: { type: 'array', items: { type: 'string' } },
        memo_type_keys: {
          type: 'array',
          items: {
            type: 'string',
            enum: ['knowledge', 'decision', 'operation', 'principle'],
          },
          description:
            'Memo type classification keys override when saving (a memo can have multiple). decision/operation/principle are the primary material for durable judgment and working-practice summaries.',
        },
        projects: {
          type: 'array',
          description: 'Projects to link when saving',
          items: {
            type: 'object',
            properties: {
              id: { type: 'number' },
              title: { type: 'string' },
            },
            required: ['id'],
          },
        },
        is_public: { type: 'boolean', default: false },
      },
      required: ['candidate_id'],
    },
  },
  handler: handleSavePendingCandidate,
};
