import { ToolHandler } from '../../types/index.js';
import { handleSavePendingCandidate } from './handler.js';

export const savePendingCandidateTool: ToolHandler = {
  definition: {
    name: 'paput_save_pending_candidate',
    description: 'pending の知見候補を PaPut メモとして保存します',
    inputSchema: {
      type: 'object',
      properties: {
        candidate_id: { type: 'string', description: '保存する候補ID' },
        title: { type: 'string', description: '保存時に上書きするタイトル' },
        body: { type: 'string', description: '保存時に上書きする本文' },
        created_at: {
          type: 'string',
          description:
            'PaPut メモとして保存する作成日時。未指定時はセッション更新日時を使用します',
        },
        categories: { type: 'array', items: { type: 'string' } },
        is_public: { type: 'boolean', default: false },
      },
      required: ['candidate_id'],
    },
  },
  handler: handleSavePendingCandidate,
};
