import { ToolHandler } from '../../types/index.js';
import { handleSearchMemo } from './handler.js';

export const searchMemoTool: ToolHandler = {
  definition: {
    name: 'paput_search_memo',
    description:
      'Search PaPut memos by keyword, category, memo type, IDs, date, visibility, or pagination. Use this to find existing knowledge before creating or saving a memo, or to gather typed public memos (decision/operation/principle) for the public AI summary.',
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
        memo_type: {
          type: 'string',
          enum: ['knowledge', 'decision', 'operation', 'principle'],
          description:
            'Filter by memo type key. Combine with is_public=true to collect public decision/operation/principle memos as material for the public AI summary.',
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
