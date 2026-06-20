import { ToolHandler } from '../../types/index.js';
import { handleMarkProcessedSession } from './handler.js';

export const markProcessedSessionTool: ToolHandler = {
  definition: {
    name: 'paput_mark_processed_session',
    description:
      'Mark a Claude or Codex session as processed for knowledge capture. Use this after reviewing a local session even when no pending candidates are added.',
    inputSchema: {
      type: 'object',
      properties: {
        source: {
          type: 'string',
          enum: ['claude', 'codex'],
          description: 'Session source',
        },
        session_id: {
          type: 'string',
          description: 'Session ID that was reviewed',
        },
        source_session_updated_at: {
          type: 'string',
          description: 'Source session updated timestamp in ISO 8601 format',
        },
      },
      required: ['source', 'session_id'],
    },
  },
  handler: handleMarkProcessedSession,
};
