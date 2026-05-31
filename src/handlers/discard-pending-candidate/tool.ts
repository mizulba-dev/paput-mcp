import { ToolHandler } from '../../types/index.js';
import { handleDiscardPendingCandidate } from './handler.js';

export const discardPendingCandidateTool: ToolHandler = {
  definition: {
    name: 'paput_discard_pending_candidate',
    description: 'pending の知見候補を破棄します',
    inputSchema: {
      type: 'object',
      properties: {
        candidate_id: { type: 'string', description: '破棄する候補ID' },
        reason: { type: 'string', description: '破棄理由' },
      },
      required: ['candidate_id'],
    },
  },
  handler: handleDiscardPendingCandidate,
};
