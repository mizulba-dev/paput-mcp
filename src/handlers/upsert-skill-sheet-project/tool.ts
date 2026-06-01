import { ToolHandler } from '../../types/index.js';
import { handler } from './handler.js';

export const upsertSkillSheetProjectTool: ToolHandler = {
  definition: {
    name: 'paput_upsert_skill_sheet_project',
    description:
      'PaPut のスキルシートプロジェクトを追加または更新します。id が指定された場合は更新し、id がない場合は同名プロジェクトを更新、なければ追加します',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'number',
          description: '更新対象のプロジェクトID。新規追加時は省略します',
        },
        type: {
          type: 'number',
          description: 'プロジェクトタイプ（1: 業務, 2: 個人）',
        },
        title: {
          type: 'string',
          description: 'プロジェクトタイトル',
        },
        start_period: {
          type: 'string',
          description: '開始期間（YYYY-MM形式）',
        },
        end_period: {
          type: 'string',
          description: '終了期間（YYYY-MM形式）',
        },
        description: {
          type: 'string',
          description: 'プロジェクトの説明',
        },
        role: {
          type: 'string',
          description: '役割',
        },
        scale: {
          type: 'string',
          description: '規模',
        },
        technologies: {
          type: 'array',
          description: '使用技術',
          items: {
            type: 'object',
            properties: {
              id: {
                type: 'number',
                description: '技術ID（既存の場合）',
              },
              name: {
                type: 'string',
                description: '技術名',
              },
            },
            required: ['name'],
          },
        },
        processes: {
          type: 'array',
          description:
            '開発工程のID配列 (1: 要件定義, 2: 基本設計, 3: 詳細設計, 4: 実装, 5: テスト, 6: 保守)',
          items: {
            type: 'number',
          },
        },
        memos: {
          type: 'array',
          description: '関連メモ',
          items: {
            type: 'object',
            properties: {
              id: {
                type: 'number',
                description: 'メモID',
              },
              title: {
                type: 'string',
                description: 'メモタイトル',
              },
            },
            required: ['id', 'title'],
          },
        },
      },
      required: [
        'type',
        'title',
        'start_period',
        'description',
        'role',
        'scale',
        'technologies',
        'processes',
        'memos',
      ],
    },
  },
  handler,
};
