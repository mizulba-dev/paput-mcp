import { ToolHandler } from '../../types/index.js';
import { handleSearchMemo } from './handler.js';

export const searchMemoTool: ToolHandler = {
  definition: {
    name: 'paput_search_memo',
    description:
      'Hybrid search for PaPut memos: finds memos by meaning even when the wording differs, in addition to exact keyword, category, memo type, IDs, date, visibility, and pagination filters. Use this to find existing knowledge before creating or saving a memo, to check for near-duplicate memos beforehand, or to gather typed public memos (decision/operation/principle) for judgment summaries. When query is set, results are ranked by combined relevance and page is ignored; omit query to page through a plain filtered list ordered by most recently updated.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description:
            'Natural-language or keyword query. Finds memos by meaning as well as exact wording. When set, page is ignored, limit defaults to 10 (max 50), and each matched memo may include a semantic-similarity score; results without a score are keyword-only matches.',
        },
        category_id: {
          type: 'number',
          description: 'Category ID',
        },
        memo_type: {
          type: 'string',
          enum: ['knowledge', 'decision', 'operation', 'principle'],
          description:
            'Filter by memo type key. Combine with is_public=true to collect public decision/operation/principle memos as material for judgment summaries.',
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
          description: 'Page number. Ignored when query is set.',
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
