import { ToolHandler } from '../../types/index.js';
import { handleAddKnowledgeCandidates } from './handler.js';

export const addKnowledgeCandidatesTool: ToolHandler = {
  definition: {
    name: 'paput_add_knowledge_candidates',
    description:
      'Add reusable knowledge candidates extracted from a Claude or Codex session to the local pending queue. Use this before saving knowledge to PaPut when candidates still need review or deduplication.',
    inputSchema: {
      type: 'object',
      properties: {
        session_id: { type: 'string', description: 'Source session ID' },
        source: {
          type: 'string',
          enum: ['claude', 'codex'],
          description: 'Source session provider',
        },
        candidates: {
          type: 'array',
          description: 'Knowledge candidates to add',
          items: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              body: { type: 'string' },
              categories: { type: 'array', items: { type: 'string' } },
              memo_type_keys: {
                type: 'array',
                items: {
                  type: 'string',
                  enum: ['knowledge', 'decision', 'operation', 'principle'],
                },
                description:
                  'Memo type classification keys (a memo can have multiple). decision/operation/principle are the primary material for the public AI summary.',
              },
              confidence: { type: 'number' },
              is_public: { type: 'boolean', default: false },
            },
            required: ['title', 'body'],
          },
        },
      },
      required: ['session_id', 'source', 'candidates'],
    },
  },
  handler: handleAddKnowledgeCandidates,
};
