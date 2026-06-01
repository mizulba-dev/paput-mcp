import { ToolHandler } from '../../types/index.js';
import { handleCreateMemo } from './handler.js';

export const createMemoTool: ToolHandler = {
  definition: {
    name: 'paput_create_memo',
    description:
      'Create a PaPut memo. Use this when the user explicitly wants to save a memo directly, not when adding reusable knowledge candidates to the pending queue.',
    inputSchema: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'Memo title',
        },
        body: {
          type: 'string',
          description: 'Memo body',
        },
        is_public: {
          type: 'boolean',
          description: 'Whether to publish the memo',
          default: false,
        },
        created_at: {
          type: 'string',
          description:
            'Memo creation timestamp in ISO 8601 format, for example 2026-05-30T12:34:56Z',
        },
        categories: {
          type: 'array',
          items: {
            type: 'string',
          },
          description: 'Memo categories',
        },
      },
      required: ['title', 'body'],
    },
  },
  handler: handleCreateMemo,
};
