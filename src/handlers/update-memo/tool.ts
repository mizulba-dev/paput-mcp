import { ToolHandler } from '../../types/index.js';
import { handleUpdateMemo } from './handler.js';

export const updateMemoTool: ToolHandler = {
  definition: {
    name: 'paput_update_memo',
    description:
      'Update an existing PaPut memo, including title, body, visibility, categories, and optional project links.',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'number',
          description: 'Memo ID',
        },
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
        },
        categories: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: {
                type: 'number',
                description: 'Existing category ID. Omit for a new category.',
              },
              name: {
                type: 'string',
                description: 'Category name',
              },
            },
            required: ['name'],
          },
          description: 'Categories',
        },
      },
      required: ['id', 'title', 'body', 'is_public'],
    },
  },
  handler: handleUpdateMemo,
};
