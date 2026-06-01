import { ToolHandler } from '../../types/index.js';
import { handleScanSessions } from './handler.js';

export const scanSessionsTool: ToolHandler = {
  definition: {
    name: 'paput_scan_sessions',
    description:
      'Scan local Claude and Codex session logs. Use this to find sessions that may contain reusable knowledge before reading transcripts.',
    inputSchema: {
      type: 'object',
      properties: {
        sources: {
          type: 'array',
          items: {
            type: 'string',
            enum: ['claude', 'codex'],
          },
          description: 'Session sources to scan',
        },
        include_processed: {
          type: 'boolean',
          description: 'Whether to include already processed sessions',
          default: false,
        },
      },
    },
  },
  handler: handleScanSessions,
};
