import { ToolHandler } from '../../types/index.js';
import { handler } from './handler.js';

export const upsertSkillSheetProjectTool: ToolHandler = {
  definition: {
    name: 'paput_upsert_skill_sheet_project',
    description:
      'Add or update a PaPut skill sheet project. If an ID is provided, update that project; otherwise update an exact title match or create a new project.',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'number',
          description:
            'Project ID to update. Omit when creating a new project.',
        },
        type: {
          type: 'number',
          description:
            'Project type: 1 business, 2 personal, 3 private (hidden from public profile)',
        },
        title: {
          type: 'string',
          description: 'Project title',
        },
        mcp_alias: {
          type: 'string',
          description:
            'Project alias used in remote MCP URLs. Use 3-40 lowercase alphanumeric characters, e.g. paput.',
        },
        start_period: {
          type: 'string',
          description: 'Start period in YYYY-MM format',
        },
        end_period: {
          type: 'string',
          description: 'End period in YYYY-MM format',
        },
        description: {
          type: 'string',
          description: 'Project description',
        },
        role: {
          type: 'string',
          description: 'Role',
        },
        scale: {
          type: 'string',
          description: 'Team or project scale',
        },
        technologies: {
          type: 'array',
          description: 'Technologies used',
          items: {
            type: 'object',
            properties: {
              id: {
                type: 'number',
                description: 'Technology ID for an existing technology',
              },
              name: {
                type: 'string',
                description: 'Technology name',
              },
            },
            required: ['name'],
          },
        },
        processes: {
          type: 'array',
          description:
            'Development process IDs: 1 requirements, 2 basic design, 3 detailed design, 4 implementation, 5 testing, 6 maintenance',
          items: {
            type: 'number',
          },
        },
        memos: {
          type: 'array',
          description: 'Related memos',
          items: {
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
            },
            required: ['id', 'title'],
          },
        },
        achievements: {
          type: 'array',
          description:
            'Achievement bullets owned by the user. Omit to keep existing values; pass an empty array to clear them. Maximum 10 items, 100 characters each.',
          maxItems: 10,
          items: {
            type: 'string',
            maxLength: 100,
          },
        },
      },
      required: [
        'type',
        'title',
        'start_period',
        'description',
        'role',
        'scale',
        'technologies',
        'processes',
        'memos',
      ],
    },
  },
  handler,
};
