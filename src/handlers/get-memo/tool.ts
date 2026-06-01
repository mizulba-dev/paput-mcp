import { ToolHandler } from '../../types/index.js';
import { handleGetMemo } from './handler.js';

export const getMemoTool: ToolHandler = {
  definition: {
    name: 'paput_get_memo',
    description:
      'Get the full details of a PaPut memo by ID, including body, categories, projects, visibility, author, and engagement metadata.',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'number',
          description: 'Memo ID',
        },
      },
      required: ['id'],
    },
  },
  handler: handleGetMemo,
};
