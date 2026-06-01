import { ToolHandler } from '../../types/index.js';
import { handleSearchMemo } from './handler.js';

export const searchMemoTool: ToolHandler = {
  definition: {
    name: 'paput_search_memo',
    description:
      'Search PaPut memos by keyword, category, IDs, date, visibility, or pagination. Use this to find existing knowledge before creating or saving a memo.',
    inputSchema: {
      type: 'object',
      properties: {
        word: {
          type: 'string',
          description: 'Search keyword',
        },
        category_id: {
          type: 'number',
          description: 'Category ID',
        },
        ids: {
          type: 'array',
          items: {
            type: 'number',
          },
          description: 'Memo IDs',
        },
        date: {
          type: 'string',
          description: 'Date in YYYY-MM-DD format',
        },
        is_public: {
          type: 'boolean',
          description: 'Visibility filter',
        },
        page: {
          type: 'number',
          description: 'Page number',
        },
        limit: {
          type: 'number',
          description: 'Number of items to return',
        },
      },
    },
  },
  handler: handleSearchMemo,
};
