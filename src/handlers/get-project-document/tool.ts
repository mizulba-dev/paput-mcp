import { ToolHandler } from '../../types/index.js';
import { handleGetProjectDocument } from './handler.js';

export const getProjectDocumentTool: ToolHandler = {
  definition: {
    name: 'paput_get_project_document',
    description:
      'Get the full body of a private project document by ID. Use the document index returned by paput_get_project_context to find the ID.',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'number',
          description: 'Project document ID',
        },
      },
      required: ['id'],
    },
  },
  handler: handleGetProjectDocument,
};
