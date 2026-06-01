import { ToolHandler } from '../../types/index.js';
import { handleGetCategories } from './handler.js';

export const getCategoriesTool: ToolHandler = {
  definition: {
    name: 'paput_get_categories',
    description:
      'List available PaPut categories. Use this before assigning categories or checking whether a category already exists.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  handler: handleGetCategories,
};
