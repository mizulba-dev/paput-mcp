import { ToolHandler } from '../../types/index.js';
import { handleListPendingCandidates } from './handler.js';

export const listPendingCandidatesTool: ToolHandler = {
  definition: {
    name: 'paput_list_pending_candidates',
    description: '未保存の知見候補を一覧表示します',
    inputSchema: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: '取得件数。デフォルトは20です',
        },
      },
    },
  },
  handler: handleListPendingCandidates,
};
