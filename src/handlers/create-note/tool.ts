import { ToolHandler } from '../../types/index.js';
import { handleCreateNote } from './handler.js';

export const createNoteTool: ToolHandler = {
  definition: {
    name: 'paput_create_note',
    description:
      'Create a PaPut note that groups existing memos. Use this to organize related memo IDs into a named note.',
    inputSchema: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'Note title',
        },
        is_public: {
          type: 'boolean',
          description: 'Whether to publish the note',
          default: false,
        },
        memo_ids: {
          type: 'array',
          items: {
            type: 'number',
          },
          description: 'Memo IDs to include in the note',
        },
      },
      required: ['title'],
    },
  },
  handler: handleCreateNote,
};
