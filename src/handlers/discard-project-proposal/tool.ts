import { ToolHandler } from '../../types/index.js';
import { handleDiscardProjectProposal } from './handler.js';

export const discardProjectProposalTool: ToolHandler = {
  definition: {
    name: 'paput_discard_project_proposal',
    description:
      'Discard a skill proposal (a project document with kind skill_candidate) that the user rejected. The discard reason and the current repetition count are recorded; the same proposal will not be raised again unless the repetition grows substantially.',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'number',
          description: 'Proposal document ID',
        },
        reason: {
          type: 'string',
          description: 'Why the user rejected the proposal',
        },
      },
      required: ['id', 'reason'],
    },
  },
  handler: handleDiscardProjectProposal,
};
