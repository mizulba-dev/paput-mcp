import { ToolHandler } from '../../types/index.js';
import { handleSearchNotes } from './handler.js';

export const searchNotesTool: ToolHandler = {
  definition: {
    name: 'paput_search_notes',
    description:
      'Search PaPut notes by keyword, visibility, and pagination. Use this to find note collections before reading or updating them.',
    inputSchema: {
      type: 'object',
      properties: {
        word: {
          type: 'string',
          description: 'Search keyword',
        },
        is_public: {
          type: 'boolean',
          description: 'Whether to return only public notes',
        },
        page: {
          type: 'number',
          description: 'Page number, starting at 1',
          minimum: 1,
        },
        limit: {
          type: 'number',
          description: 'Number of items per page',
          minimum: 1,
          maximum: 100,
        },
      },
    },
  },
  handler: handleSearchNotes,
};
