import { ToolHandler } from '../../types/index.js';
import { handleCreateMemo } from './handler.js';

export const createMemoTool: ToolHandler = {
  definition: {
    name: 'paput_create_memo',
    description: 'PaPut にメモを作成します',
    inputSchema: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'メモのタイトル',
        },
        body: {
          type: 'string',
          description: 'メモの内容',
        },
        is_public: {
          type: 'boolean',
          description: 'メモを公開するかどうか',
          default: false,
        },
        created_at: {
          type: 'string',
          description:
            'メモの作成日時。ISO 8601 形式で指定します（例: 2026-05-30T12:34:56Z）',
        },
        categories: {
          type: 'array',
          items: {
            type: 'string',
          },
          description: 'メモのカテゴリ',
        },
      },
      required: ['title', 'body'],
    },
  },
  handler: handleCreateMemo,
};
