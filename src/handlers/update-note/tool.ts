import { ToolHandler } from '../../types/index.js';
import { handleUpdateNote } from './handler.js';

export const updateNoteTool: ToolHandler = {
  definition: {
    name: 'paput_update_note',
    description:
      'Update an existing PaPut note by changing its title, visibility, or attached memo IDs.',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'number',
          description: 'Note ID',
        },
        title: {
          type: 'string',
          description: 'New note title',
        },
        is_public: {
          type: 'boolean',
          description: 'Whether to publish the note',
        },
        memo_ids: {
          type: 'array',
          items: {
            type: 'number',
          },
          description: 'Memo IDs to include in the note',
        },
      },
      required: ['id'],
    },
  },
  handler: handleUpdateNote,
};
