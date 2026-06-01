import { ToolHandler } from '../../types/index.js';
import { handleGetSessionTranscript } from './handler.js';

export const getSessionTranscriptTool: ToolHandler = {
  definition: {
    name: 'paput_get_session_transcript',
    description:
      'Read a local Claude or Codex session transcript for knowledge extraction. Use this after scanning sessions when you need the conversation text.',
    inputSchema: {
      type: 'object',
      properties: {
        session_id: {
          type: 'string',
          description: 'Session ID to read',
        },
        source: {
          type: 'string',
          enum: ['claude', 'codex'],
          description: 'Session source',
        },
        max_chars: {
          type: 'number',
          description:
            'Maximum number of characters to return. Defaults to 20000.',
        },
      },
      required: ['session_id', 'source'],
    },
  },
  handler: handleGetSessionTranscript,
};
