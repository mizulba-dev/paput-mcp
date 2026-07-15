import { ToolHandler } from '../../types/index.js';
import { handleAddKnowledgeCandidates } from './handler.js';

export const addKnowledgeCandidatesTool: ToolHandler = {
  definition: {
    name: 'paput_add_knowledge_candidates',
    description:
      'Add reusable knowledge candidates extracted from an AI session or conversation to the pending queue. Use this before saving knowledge to PaPut when candidates still need review or deduplication.',
    inputSchema: {
      type: 'object',
      properties: {
        session_id: {
          type: 'string',
          description:
            'Source session ID. Required when source is claude or codex (local sessions tracked for harvest); omit for conversation clients without a local session file.',
        },
        source: {
          type: 'string',
          enum: ['claude', 'codex', 'claude-ai', 'chatgpt'],
          description:
            'Source client. Use claude (Claude Code CLI) or codex (Codex CLI) for local sessions; use claude-ai for Claude web/desktop/mobile; use chatgpt for ChatGPT clients.',
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
                  'Array of memo type classification keys (each one of: knowledge, decision, operation, principle) for this candidate. A memo can have multiple keys at once. decision/operation/principle are the primary material for durable judgment and working-practice summaries.',
              },
              confidence: {
                type: 'number',
                minimum: 0,
                maximum: 1,
                description:
                  'Confidence score from 0 (low) to 1 (high) that this candidate is reusable and worth saving.',
              },
              is_public: { type: 'boolean', default: false },
            },
            required: ['title', 'body'],
          },
        },
      },
      required: ['source', 'candidates'],
    },
  },
  handler: handleAddKnowledgeCandidates,
};
