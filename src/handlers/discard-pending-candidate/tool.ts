import { ToolHandler } from '../../types/index.js';
import { handleDiscardPendingCandidate } from './handler.js';

export const discardPendingCandidateTool: ToolHandler = {
  definition: {
    name: 'paput_discard_pending_candidate',
    description:
      'Discard a pending knowledge candidate so it will not be saved as a PaPut memo. Use this for duplicates, low-value candidates, or candidates with sensitive/project-specific content.',
    inputSchema: {
      type: 'object',
      properties: {
        candidate_id: {
          type: 'string',
          description: 'Candidate ID to discard',
        },
        reason: { type: 'string', description: 'Reason for discarding' },
      },
      required: ['candidate_id'],
    },
  },
  handler: handleDiscardPendingCandidate,
};
