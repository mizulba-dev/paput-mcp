import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import type { ToolDefinition } from '../types/index.js';

const emptySchema = z.object({});

const memoCategorySchema = z.object({
  id: z.number().describe('既存カテゴリーのID（新規の場合は省略）').optional(),
  name: z.string().describe('カテゴリー名'),
});

const projectReferenceSchema = z.object({
  id: z.number(),
  title: z.string().optional(),
});

const skillCategorySchema = z.object({
  id: z.number().describe('カテゴリID'),
  name: z.string().describe('カテゴリ名'),
});

const skillSchema = z.object({
  category: skillCategorySchema,
  category_type: z
    .number()
    .describe(
      'カテゴリタイプ（1: 言語, 2: フレームワーク, 3: データベース, 4: インフラ）',
    ),
  level: z.string().describe('スキルレベル（A, B, C, D, E）'),
  years: z.number().describe('経験年数'),
});

const technologySchema = z.object({
  id: z.number().describe('技術ID（既存の場合）').optional(),
  name: z.string().describe('技術名'),
});

const skillSheetMemoSchema = z.object({
  id: z.number().describe('メモID'),
  title: z.string().describe('メモタイトル'),
});

const skillSheetProjectSchema = z.object({
  id: z
    .number()
    .describe('更新対象のプロジェクトID。新規追加時は省略します')
    .optional(),
  type: z.number().describe('プロジェクトタイプ（1: 業務, 2: 個人）'),
  title: z.string().describe('プロジェクトタイトル'),
  start_period: z.string().describe('開始期間（YYYY-MM形式）'),
  end_period: z.string().describe('終了期間（YYYY-MM形式）').optional(),
  description: z.string().describe('プロジェクトの説明'),
  role: z.string().describe('役割'),
  scale: z.string().describe('規模'),
  technologies: z.array(technologySchema).describe('使用技術'),
  processes: z
    .array(z.number())
    .describe(
      '開発工程のID配列 (1: 要件定義, 2: 基本設計, 3: 詳細設計, 4: 実装, 5: テスト, 6: 保守)',
    ),
  memos: z.array(skillSheetMemoSchema).describe('関連メモ'),
});

const knowledgeCandidateSchema = z.object({
  title: z.string(),
  body: z.string(),
  categories: z.array(z.string()).optional(),
  confidence: z.number().optional(),
  is_public: z.boolean().default(false).optional(),
});

const toolInputSchemas = {
  paput_create_memo: z.object({
    title: z.string().describe('メモのタイトル'),
    body: z.string().describe('メモの内容'),
    is_public: z.boolean().default(false).describe('メモを公開するかどうか'),
    created_at: z
      .string()
      .describe(
        'メモの作成日時。ISO 8601 形式で指定します（例: 2026-05-30T12:34:56Z）',
      )
      .optional(),
    categories: z.array(z.string()).describe('メモのカテゴリ').optional(),
  }),
  paput_search_memo: z.object({
    word: z.string().describe('検索キーワード').optional(),
    category_id: z.number().describe('カテゴリーID').optional(),
    ids: z.array(z.number()).describe('メモIDの配列').optional(),
    date: z.string().describe('日付（YYYY-MM-DD形式）').optional(),
    is_public: z.boolean().describe('公開/非公開フィルタ').optional(),
    page: z.number().describe('ページ番号').optional(),
    limit: z.number().describe('取得件数').optional(),
  }),
  paput_get_memo: z.object({
    id: z.number().describe('メモID'),
  }),
  paput_update_memo: z.object({
    id: z.number().describe('メモID'),
    title: z.string().describe('メモのタイトル'),
    body: z.string().describe('メモの本文'),
    is_public: z.boolean().describe('メモを公開するかどうか'),
    categories: z
      .array(memoCategorySchema)
      .describe('カテゴリーの配列')
      .optional(),
  }),
  paput_delete_memo: z.object({
    id: z.number().describe('メモID'),
  }),
  paput_get_categories: emptySchema,
  paput_create_note: z.object({
    title: z.string().describe('ノートのタイトル'),
    is_public: z.boolean().default(false).describe('ノートを公開するかどうか'),
    memo_ids: z
      .array(z.number())
      .describe('ノートに含めるメモのIDリスト')
      .optional(),
  }),
  paput_search_notes: z.object({
    word: z.string().describe('検索キーワード').optional(),
    is_public: z
      .boolean()
      .describe('公開ノートのみを検索するかどうか')
      .optional(),
    page: z.number().min(1).describe('ページ番号 (1以上)').optional(),
    limit: z
      .number()
      .min(1)
      .max(100)
      .describe('1ページあたりの表示件数')
      .optional(),
  }),
  paput_get_note: z.object({
    id: z.number().describe('ノートのID'),
  }),
  paput_update_note: z.object({
    id: z.number().describe('ノートのID'),
    title: z.string().describe('ノートの新しいタイトル').optional(),
    is_public: z.boolean().describe('ノートを公開するかどうか').optional(),
    memo_ids: z
      .array(z.number())
      .describe('ノートに含めるメモのIDリスト')
      .optional(),
  }),
  paput_delete_note: z.object({
    id: z.number().describe('ノートのID'),
  }),
  paput_list_ideas: emptySchema,
  paput_create_idea: z.object({
    title: z.string().describe('アイデアのタイトル'),
    sort: z.number().describe('表示順序').optional(),
  }),
  paput_update_idea: z.object({
    id: z.number().describe('アイデアのID'),
    title: z.string().describe('アイデアの新しいタイトル'),
  }),
  paput_delete_idea: z.object({
    id: z.number().describe('アイデアのID'),
  }),
  paput_get_skill_sheet: emptySchema,
  paput_update_skill_sheet_basic_info: z.object({
    nearest_station: z.string().describe('最寄駅').optional(),
    gender: z.number().describe('性別（1: 男性, 2: 女性）').optional(),
    birth_date: z.string().describe('生年月日（YYYY-MM-DD形式）').optional(),
    years_of_experience: z.number().describe('経験年数').optional(),
  }),
  paput_update_skill_sheet_self_pr: z.object({
    self_pr: z.string().describe('自己PR').optional(),
  }),
  paput_set_skill_sheet_skills: z.object({
    skills: z.array(skillSchema).describe('スキルリスト'),
  }),
  paput_upsert_skill_sheet_project: skillSheetProjectSchema,
  paput_delete_skill_sheet_project: z.object({
    project_id: z.number().describe('削除するプロジェクトのID'),
  }),
  paput_cache_status: emptySchema,
  paput_sync_remote_memos: z.object({
    limit: z
      .number()
      .describe('1ページあたりの取得件数。最大100です')
      .optional(),
    max_pages: z
      .number()
      .describe('取得する最大ページ数。デフォルトは20です')
      .optional(),
  }),
  paput_scan_sessions: z.object({
    sources: z
      .array(z.enum(['claude', 'codex']))
      .describe('検出対象のセッションソース')
      .optional(),
    include_processed: z
      .boolean()
      .default(false)
      .describe('digest 済みセッションも含めるかどうか')
      .optional(),
  }),
  paput_get_session_transcript: z.object({
    session_id: z.string().describe('取得対象のセッションID'),
    source: z.enum(['claude', 'codex']).describe('セッションソース'),
    max_chars: z
      .number()
      .describe('返却する最大文字数。デフォルトは20000です')
      .optional(),
  }),
  paput_add_knowledge_candidates: z.object({
    session_id: z.string().describe('抽出元セッションID'),
    source: z.enum(['claude', 'codex']).describe('抽出元セッションソース'),
    candidates: z.array(knowledgeCandidateSchema).describe('保存する知見候補'),
  }),
  paput_list_pending_candidates: z.object({
    limit: z.number().describe('取得件数。デフォルトは20です').optional(),
  }),
  paput_save_pending_candidate: z.object({
    candidate_id: z.string().describe('保存する候補ID'),
    title: z.string().describe('保存時に上書きするタイトル').optional(),
    body: z.string().describe('保存時に上書きする本文').optional(),
    created_at: z
      .string()
      .describe(
        'PaPut メモとして保存する作成日時。未指定時はセッション更新日時を使用します',
      )
      .optional(),
    categories: z.array(z.string()).optional(),
    projects: z
      .array(projectReferenceSchema)
      .describe('保存時に紐付けるプロジェクト')
      .optional(),
    is_public: z.boolean().default(false).optional(),
  }),
  paput_discard_pending_candidate: z.object({
    candidate_id: z.string().describe('破棄する候補ID'),
    reason: z.string().describe('破棄理由').optional(),
  }),
} satisfies Record<string, z.ZodTypeAny>;

export function getGeneratedInputSchema(
  toolName: string,
): ToolDefinition['inputSchema'] | undefined {
  const schema = toolInputSchemas[toolName as keyof typeof toolInputSchemas];
  if (!schema) return undefined;

  const jsonSchema = zodToJsonSchema(schema, {
    $refStrategy: 'none',
    target: 'jsonSchema7',
  });

  delete jsonSchema.$schema;
  return jsonSchema as ToolDefinition['inputSchema'];
}
