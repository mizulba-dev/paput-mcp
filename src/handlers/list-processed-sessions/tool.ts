import { ToolHandler } from '../../types/index.js';
import { handleListProcessedSessions } from './handler.js';

export const listProcessedSessionsTool: ToolHandler = {
  definition: {
    name: 'paput_list_processed_sessions',
    description:
      'List AI sessions that have already been processed for knowledge capture. Use this before client-side local session import to skip sessions already reviewed.',
    inputSchema: {
      type: 'object',
      properties: {
        source: {
          type: 'string',
          enum: ['claude', 'codex'],
          description: 'Optional session source to filter by',
        },
      },
    },
  },
  handler: handleListProcessedSessions,
};
