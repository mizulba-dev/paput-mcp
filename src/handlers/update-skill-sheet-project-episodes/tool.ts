import { ToolHandler } from '../../types/index.js';
import { handler } from './handler.js';

export const updateSkillSheetProjectEpisodesTool: ToolHandler = {
  definition: {
    name: 'paput_update_skill_sheet_project_episodes',
    description:
      'Full-replace the AI-generated design-and-judgment episodes for a PaPut skill sheet project. Episodes may appear on the public profile when backed by public memos. Use only after the user explicitly approves the episode draft.',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: {
          type: 'number',
          description: 'Project ID',
        },
        episodes: {
          type: 'array',
          description:
            'Episodes to save. Pass an empty array to clear all project episodes. Maximum 5 episodes.',
          maxItems: 5,
          items: {
            type: 'object',
            properties: {
              claim: {
                type: 'string',
                maxLength: 200,
                description:
                  'Required one-line claim for the episode, grounded in public linked memos.',
              },
              situation: {
                type: 'string',
                maxLength: 1000,
                description: 'Optional situation context, 1-2 sentences.',
              },
              decision: {
                type: 'string',
                maxLength: 1000,
                description: 'Optional decision description, 1-2 sentences.',
              },
              reason: {
                type: 'string',
                maxLength: 1000,
                description: 'Optional reason, 1-2 sentences.',
              },
              supporting_memo_ids: {
                type: 'array',
                minItems: 1,
                description:
                  'Public memo IDs returned by the project episodes context tool that support this episode.',
                items: {
                  type: 'number',
                },
              },
            },
            required: ['claim', 'supporting_memo_ids'],
          },
        },
      },
      required: ['project_id', 'episodes'],
    },
  },
  handler,
};
