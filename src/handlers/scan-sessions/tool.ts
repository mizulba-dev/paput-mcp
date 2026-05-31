import { ToolHandler } from '../../types/index.js';
import { handleScanSessions } from './handler.js';

export const scanSessionsTool: ToolHandler = {
  definition: {
    name: 'paput_scan_sessions',
    description: 'Claude/Codex のローカルセッションログを検出します',
    inputSchema: {
      type: 'object',
      properties: {
        sources: {
          type: 'array',
          items: {
            type: 'string',
            enum: ['claude', 'codex'],
          },
          description: '検出対象のセッションソース',
        },
        include_processed: {
          type: 'boolean',
          description: 'digest 済みセッションも含めるかどうか',
          default: false,
        },
      },
    },
  },
  handler: handleScanSessions,
};
