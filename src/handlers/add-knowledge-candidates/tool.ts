import { ToolHandler } from '../../types/index.js';
import { handleAddKnowledgeCandidates } from './handler.js';

export const addKnowledgeCandidatesTool: ToolHandler = {
  definition: {
    name: 'paput_add_knowledge_candidates',
    description: 'AI が抽出した知見候補を pending に保存します',
    inputSchema: {
      type: 'object',
      properties: {
        session_id: { type: 'string', description: '抽出元セッションID' },
        source: {
          type: 'string',
          enum: ['claude', 'codex'],
          description: '抽出元セッションソース',
        },
        candidates: {
          type: 'array',
          description: '保存する知見候補',
          items: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              body: { type: 'string' },
              categories: { type: 'array', items: { type: 'string' } },
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
