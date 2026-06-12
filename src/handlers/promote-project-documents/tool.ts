import { ToolHandler } from '../../types/index.js';
import { handlePromoteProjectDocuments } from './handler.js';

export const promoteProjectDocumentsTool: ToolHandler = {
  definition: {
    name: 'paput_promote_project_documents',
    description:
      'Mark project documents as promoted (status retired with a promotion link) after the user approved a skill proposal and the skill has been created. Pass the skill proposal document ID and the related procedure document IDs together, with the skill name or path as promoted_to. Promoted documents leave the active index and future identical procedures get guided to the skill.',
    inputSchema: {
      type: 'object',
      properties: {
        ids: {
          type: 'array',
          items: { type: 'number' },
          description:
            'Document IDs to promote (the skill proposal and its related procedure records)',
        },
        promoted_to: {
          type: 'string',
          description:
            'Promotion target, e.g. the skill name or file path (max 255 chars)',
        },
      },
      required: ['ids', 'promoted_to'],
    },
  },
  handler: handlePromoteProjectDocuments,
};
