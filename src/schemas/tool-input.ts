import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import type { ToolDefinition } from '../types/index.js';

const emptySchema = z.object({});

const memoCategorySchema = z.object({
  id: z
    .number()
    .describe('Existing category ID. Omit for a new category.')
    .optional(),
  name: z.string().describe('Category name'),
});

const projectReferenceSchema = z.object({
  id: z.number(),
  title: z.string().optional(),
});

const skillCategorySchema = z.object({
  id: z.number().describe('Category ID'),
  name: z.string().describe('Category name'),
});

const skillSchema = z.object({
  category: skillCategorySchema,
  category_type: z
    .number()
    .describe(
      'Category type: 1 language, 2 framework, 3 database, 4 infrastructure',
    ),
  level: z.string().describe('Skill level: A, B, C, D, or E'),
  years: z.number().describe('Years of experience'),
});

const technologySchema = z.object({
  id: z
    .number()
    .describe('Technology ID for an existing technology')
    .optional(),
  name: z.string().describe('Technology name'),
});

const skillSheetMemoSchema = z.object({
  id: z.number().describe('Memo ID'),
  title: z.string().describe('Memo title'),
});

const skillSheetProjectSchema = z.object({
  id: z
    .number()
    .describe('Project ID to update. Omit when creating a new project.')
    .optional(),
  type: z.number().describe('Project type: 1 business, 2 personal'),
  title: z.string().describe('Project title'),
  start_period: z.string().describe('Start period in YYYY-MM format'),
  end_period: z.string().describe('End period in YYYY-MM format').optional(),
  description: z.string().describe('Project description'),
  role: z.string().describe('Role'),
  scale: z.string().describe('Team or project scale'),
  technologies: z.array(technologySchema).describe('Technologies used'),
  processes: z
    .array(z.number())
    .describe(
      'Development process IDs: 1 requirements, 2 basic design, 3 detailed design, 4 implementation, 5 testing, 6 maintenance',
    ),
  memos: z.array(skillSheetMemoSchema).describe('Related memos'),
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
    title: z.string().describe('Memo title'),
    body: z.string().describe('Memo body'),
    is_public: z
      .boolean()
      .default(false)
      .describe('Whether to publish the memo'),
    created_at: z
      .string()
      .describe(
        'Memo creation timestamp in ISO 8601 format, for example 2026-05-30T12:34:56Z',
      )
      .optional(),
    categories: z.array(z.string()).describe('Memo categories').optional(),
  }),
  paput_search_memo: z.object({
    word: z.string().describe('Search keyword').optional(),
    category_id: z.number().describe('Category ID').optional(),
    ids: z.array(z.number()).describe('Memo IDs').optional(),
    date: z.string().describe('Date in YYYY-MM-DD format').optional(),
    is_public: z.boolean().describe('Visibility filter').optional(),
    page: z.number().describe('Page number').optional(),
    limit: z.number().describe('Number of items to return').optional(),
  }),
  paput_get_memo: z.object({
    id: z.number().describe('Memo ID'),
  }),
  paput_update_memo: z.object({
    id: z.number().describe('Memo ID'),
    title: z.string().describe('Memo title'),
    body: z.string().describe('Memo body'),
    is_public: z.boolean().describe('Whether to publish the memo'),
    categories: z.array(memoCategorySchema).describe('Categories').optional(),
  }),
  paput_get_categories: emptySchema,
  paput_create_note: z.object({
    title: z.string().describe('Note title'),
    is_public: z
      .boolean()
      .default(false)
      .describe('Whether to publish the note'),
    memo_ids: z
      .array(z.number())
      .describe('Memo IDs to include in the note')
      .optional(),
  }),
  paput_search_notes: z.object({
    word: z.string().describe('Search keyword').optional(),
    is_public: z
      .boolean()
      .describe('Whether to return only public notes')
      .optional(),
    page: z.number().min(1).describe('Page number, starting at 1').optional(),
    limit: z
      .number()
      .min(1)
      .max(100)
      .describe('Number of items per page')
      .optional(),
  }),
  paput_get_note: z.object({
    id: z.number().describe('Note ID'),
  }),
  paput_update_note: z.object({
    id: z.number().describe('Note ID'),
    title: z.string().describe('New note title').optional(),
    is_public: z.boolean().describe('Whether to publish the note').optional(),
    memo_ids: z
      .array(z.number())
      .describe('Memo IDs to include in the note')
      .optional(),
  }),
  paput_get_skill_sheet: emptySchema,
  paput_update_skill_sheet_basic_info: z.object({
    nearest_station: z.string().describe('Nearest station').optional(),
    gender: z.number().describe('Gender: 1 male, 2 female').optional(),
    birth_date: z
      .string()
      .describe('Birth date in YYYY-MM-DD format')
      .optional(),
    years_of_experience: z.number().describe('Years of experience').optional(),
  }),
  paput_update_skill_sheet_self_pr: z.object({
    self_pr: z.string().describe('Self PR text').optional(),
  }),
  paput_set_skill_sheet_skills: z.object({
    skills: z.array(skillSchema).describe('Skill list'),
  }),
  paput_upsert_skill_sheet_project: skillSheetProjectSchema,
  paput_delete_skill_sheet_project: z.object({
    project_id: z.number().describe('Project ID to delete'),
  }),
  paput_cache_status: emptySchema,
  paput_sync_remote_memos: z.object({
    limit: z
      .number()
      .describe('Number of items per page. Maximum 100.')
      .optional(),
    max_pages: z
      .number()
      .describe('Maximum number of pages to fetch. Defaults to 20.')
      .optional(),
  }),
  paput_scan_sessions: z.object({
    sources: z
      .array(z.enum(['claude', 'codex']))
      .describe('Session sources to scan')
      .optional(),
    include_processed: z
      .boolean()
      .default(false)
      .describe('Whether to include already processed sessions')
      .optional(),
  }),
  paput_get_session_transcript: z.object({
    session_id: z.string().describe('Session ID to read'),
    source: z.enum(['claude', 'codex']).describe('Session source'),
    max_chars: z
      .number()
      .describe('Maximum number of characters to return. Defaults to 20000.')
      .optional(),
  }),
  paput_add_knowledge_candidates: z.object({
    session_id: z.string().describe('Source session ID'),
    source: z.enum(['claude', 'codex']).describe('Source session provider'),
    candidates: z
      .array(knowledgeCandidateSchema)
      .describe('Knowledge candidates to add'),
  }),
  paput_list_pending_candidates: z.object({
    limit: z
      .number()
      .describe('Number of items to return. Defaults to 20.')
      .optional(),
  }),
  paput_save_pending_candidate: z.object({
    candidate_id: z.string().describe('Candidate ID to save'),
    title: z.string().describe('Title override when saving').optional(),
    body: z.string().describe('Body override when saving').optional(),
    created_at: z
      .string()
      .describe(
        'Creation timestamp to use for the PaPut memo. Defaults to the source session updated timestamp.',
      )
      .optional(),
    categories: z.array(z.string()).optional(),
    projects: z
      .array(projectReferenceSchema)
      .describe('Projects to link when saving')
      .optional(),
    is_public: z.boolean().default(false).optional(),
  }),
  paput_discard_pending_candidate: z.object({
    candidate_id: z.string().describe('Candidate ID to discard'),
    reason: z.string().describe('Reason for discarding').optional(),
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
