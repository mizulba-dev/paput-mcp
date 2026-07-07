import { ToolHandler } from '../../types/index.js';
import { handleUpdateProjectDocument } from './handler.js';

export const updateProjectDocumentTool: ToolHandler = {
  definition: {
    name: 'paput_update_project_document',
    description:
      'Update an existing private project document (identified by ID) by replacing its title, summary, and body. This is a full replace of those fields, so provide the complete desired state; an omitted summary is cleared. Fetch the current document with paput_get_project_document first when you only intend to change part of it. Kind, decided_at, and skill promotion are not changed by this tool. Optionally set status to active or archived.',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'number',
          description: 'Project document ID to update',
        },
        title: {
          type: 'string',
          description: 'Concise, searchable title',
        },
        summary: {
          type: 'string',
          description:
            'One-line summary shown in search results (keep it short). Omitting it clears the summary.',
        },
        body: {
          type: 'string',
          description:
            'Markdown body. For design decisions include the decision, reasons, and rejected alternatives.',
        },
        status: {
          type: 'string',
          enum: ['active', 'archived'],
          description:
            'Optional status change. Archive settled or superseded documents to exclude them from default search results.',
        },
      },
      required: ['id', 'title', 'body'],
    },
  },
  handler: handleUpdateProjectDocument,
};
