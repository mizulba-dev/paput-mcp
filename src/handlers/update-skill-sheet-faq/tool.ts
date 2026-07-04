import { ToolHandler } from '../../types/index.js';
import { handler } from './handler.js';

export const updateSkillSheetFaqTool: ToolHandler = {
  definition: {
    name: 'paput_update_skill_sheet_faq',
    description:
      "Full-replace the Q&A (FAQ) section of the PaPut skill sheet. Question and answer are user-authored originals, not AI-generated. Pass an empty array to clear all items. related_memo_ids are optional evidence, filtered server-side to the user's own public memos.",
    inputSchema: {
      type: 'object',
      properties: {
        faq: {
          type: 'array',
          description:
            'FAQ items to save. Pass an empty array to clear all FAQ items. Maximum 15 items.',
          maxItems: 15,
          items: {
            type: 'object',
            properties: {
              question: {
                type: 'string',
                maxLength: 200,
                description: "Required question text, in the user's own words.",
              },
              answer: {
                type: 'string',
                maxLength: 2000,
                description: "Required answer text, in the user's own words.",
              },
              theme: {
                type: 'string',
                maxLength: 40,
                description:
                  'Optional theme label used to group items for display.',
              },
              related_memo_ids: {
                type: 'array',
                description:
                  'Optional public memo IDs backing this answer. Non-public or non-owned IDs are dropped silently; check dropped_ids in the response.',
                items: {
                  type: 'integer',
                  minimum: 1,
                },
              },
            },
            required: ['question', 'answer'],
          },
        },
      },
      required: ['faq'],
    },
  },
  handler,
};
