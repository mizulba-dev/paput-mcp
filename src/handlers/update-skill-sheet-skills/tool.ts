import { ToolHandler } from '../../types/index.js';
import { handler } from './handler.js';

export const setSkillSheetSkillsTool: ToolHandler = {
  definition: {
    name: 'paput_set_skill_sheet_skills',
    description:
      'Replace the full skill list on the PaPut skill sheet with the provided final state. The list may appear on the public skill sheet. Use this when the complete desired skill list is known.',
    inputSchema: {
      type: 'object',
      properties: {
        skills: {
          type: 'array',
          description: 'Skill list',
          items: {
            type: 'object',
            properties: {
              category: {
                type: 'object',
                properties: {
                  id: {
                    type: 'number',
                    description: 'Category ID',
                  },
                  name: {
                    type: 'string',
                    description: 'Category name',
                  },
                },
                required: ['id', 'name'],
              },
              category_type: {
                type: 'number',
                description:
                  'Category type: 1 language, 2 framework, 3 database, 4 infrastructure',
              },
              level: {
                type: 'string',
                description: 'Skill level: A, B, C, D, or E',
              },
              years: {
                type: 'number',
                description: 'Years of experience',
              },
            },
            required: ['category', 'category_type', 'level', 'years'],
          },
        },
      },
      required: ['skills'],
    },
  },
  handler,
};
