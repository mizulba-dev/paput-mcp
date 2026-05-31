import { ToolHandler } from '../../types/index.js';
import { handleGetSessionTranscript } from './handler.js';

export const getSessionTranscriptTool: ToolHandler = {
  definition: {
    name: 'paput_get_session_transcript',
    description: '知見抽出用にローカルセッション本文を取得します',
    inputSchema: {
      type: 'object',
      properties: {
        session_id: {
          type: 'string',
          description: '取得対象のセッションID',
        },
        source: {
          type: 'string',
          enum: ['claude', 'codex'],
          description: 'セッションソース',
        },
        max_chars: {
          type: 'number',
          description: '返却する最大文字数。デフォルトは20000です',
        },
      },
      required: ['session_id', 'source'],
    },
  },
  handler: handleGetSessionTranscript,
};
