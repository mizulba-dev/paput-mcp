import { ToolHandler } from '../../types/index.js';
import { handleGetNote } from './handler.js';

export const getNoteTool: ToolHandler = {
  definition: {
    name: 'paput_get_note',
    description:
      'Get the full details of a PaPut note by ID, including the memos attached to that note.',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'number',
          description: 'Note ID',
        },
      },
      required: ['id'],
    },
  },
  handler: handleGetNote,
};
