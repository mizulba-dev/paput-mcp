import { ToolHandler } from '../../types/index.js';
import { handleFindSimilarMemos } from './handler.js';

export const findSimilarMemosTool: ToolHandler = {
  definition: {
    name: 'paput_find_similar_memos',
    description:
      'Find PaPut memos semantically similar to a natural-language query using vector search. Unlike paput_search_memo (keyword match), this finds memos with related meaning even when wording differs. Use this to discover related knowledge or check for near-duplicate memos before saving.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description:
            'Natural-language query describing the topic or content to find',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of memos to return (default 10, max 50)',
        },
      },
      required: ['query'],
    },
  },
  handler: handleFindSimilarMemos,
};
