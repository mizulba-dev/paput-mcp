import { ToolHandler } from '../../types/index.js';
import { handleCreateMemos } from './handler.js';

const memoInputSchema = {
  type: 'object',
  properties: {
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
      default: false,
    },
    created_at: {
      type: 'string',
      format: 'date-time',
      description:
        'Memo creation timestamp in ISO 8601 date-time format, for example 2026-05-30T12:34:56Z',
    },
    categories: {
      type: 'array',
      items: {
        type: 'string',
      },
      description: 'Memo categories',
    },
    memo_type_keys: {
      type: 'array',
      items: {
        type: 'string',
        enum: ['knowledge', 'decision', 'operation', 'principle'],
      },
      description:
        'Array of memo type classification keys (each one of: knowledge, decision, operation, principle). A memo can have multiple keys at once. knowledge: technical know-how (commodity); decision: reusable judgment criteria; operation: observability/eval/test/review practices; principle: explicitly stated principles. decision/operation/principle are the primary material for durable judgment and working-practice summaries.',
    },
    projects: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'number' },
          title: { type: 'string' },
        },
        required: ['id'],
      },
      description:
        'Explicit project references to link (each needs an existing project id). If provided, project_match is ignored.',
    },
    project_match: {
      type: 'string',
      description:
        'Project title fragment to search and link, used only when projects is not provided. Ignored if projects is provided.',
    },
  },
  required: ['title', 'body'],
};

export const createMemosTool: ToolHandler = {
  definition: {
    name: 'paput_create_memos',
    description:
      'Create multiple private or public PaPut memos in one tool call and return created memo IDs. A memo is published only when its is_public input is true. Use this when the user explicitly wants to save multiple memos directly.',
    inputSchema: {
      type: 'object',
      properties: {
        memos: {
          type: 'array',
          items: memoInputSchema,
          description: 'Memos to create',
        },
      },
      required: ['memos'],
    },
  },
  handler: handleCreateMemos,
};
