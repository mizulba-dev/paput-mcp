import { ToolHandler } from '../../types/index.js';
import { handleSearchProjectDocuments } from './handler.js';

export const searchProjectDocumentsTool: ToolHandler = {
  definition: {
    name: 'paput_search_project_documents',
    description:
      'Find private project documents (design decisions, procedures, skill candidates) semantically similar to a natural-language query using vector search. Use this before drafting a design decision, implementation plan, or refactor to check past decisions and rejected alternatives so you do not re-propose or contradict them. Only active documents are returned by default; set include_archived to also search settled or superseded ones. Document bodies are not included; fetch them on demand with paput_get_project_document.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description:
            'Natural-language query describing the design decision, procedure, or topic to find',
        },
        limit: {
          type: 'number',
          description:
            'Maximum number of documents to return (default 5, max 20)',
        },
        include_archived: {
          type: 'boolean',
          description:
            'Include archived (settled/superseded) documents in the results. Defaults to false.',
        },
      },
      required: ['query'],
    },
  },
  handler: handleSearchProjectDocuments,
};
