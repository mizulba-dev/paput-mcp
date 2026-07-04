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
  mcp_alias: z
    .string()
    .regex(/^[a-z0-9]{3,40}$/)
    .describe('Project alias used in remote MCP URLs, e.g. paput')
    .optional(),
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
  achievements: z
    .array(
      z.string().max(100).describe('Achievement bullet, max 100 characters'),
    )
    .max(10)
    .describe(
      'Achievement bullets owned by the user. Omit to keep existing values; pass an empty array to clear them.',
    )
    .optional(),
});

const skillSheetProjectEpisodeSchema = z.object({
  claim: z
    .string()
    .min(1)
    .max(200)
    .describe(
      'Required one-line claim for the episode, grounded in public linked memos',
    ),
  situation: z
    .string()
    .max(1000)
    .describe('Optional situation context, 1-2 sentences')
    .optional(),
  decision: z
    .string()
    .max(1000)
    .describe('Optional decision description, 1-2 sentences')
    .optional(),
  reason: z
    .string()
    .max(1000)
    .describe('Optional reason, 1-2 sentences')
    .optional(),
  supporting_memo_ids: z
    .array(z.number())
    .min(1)
    .describe(
      'Public memo IDs returned by the project episodes context tool that support this episode',
    ),
});

const skillSheetFaqItemSchema = z.object({
  question: z
    .string()
    .min(1)
    .max(200)
    .describe("Required question text, in the user's own words"),
  answer: z
    .string()
    .min(1)
    .max(2000)
    .describe("Required answer text, in the user's own words"),
  theme: z
    .string()
    .max(40)
    .describe('Optional theme label used to group items for display')
    .optional(),
  related_memo_ids: z
    .array(z.number().int().positive())
    .describe(
      'Optional public memo IDs backing this answer. Non-public or non-owned IDs are dropped silently and reported in dropped_ids.',
    )
    .optional(),
});

const knowledgeCandidateSchema = z.object({
  title: z.string(),
  body: z.string(),
  categories: z.array(z.string()).optional(),
  memo_type_keys: z.array(z.string()).optional(),
  projects: z.array(projectReferenceSchema).optional(),
  confidence: z.number().optional(),
  is_public: z.boolean().default(false).optional(),
});

const createMemoInputSchema = z.object({
  title: z.string().describe('Memo title'),
  body: z.string().describe('Memo body'),
  is_public: z.boolean().default(false).describe('Whether to publish the memo'),
  created_at: z
    .string()
    .describe(
      'Memo creation timestamp in ISO 8601 format, for example 2026-05-30T12:34:56Z',
    )
    .optional(),
  categories: z.array(z.string()).describe('Memo categories').optional(),
  projects: z
    .array(projectReferenceSchema)
    .describe('Projects to link when creating the memo')
    .optional(),
  project_match: z
    .string()
    .describe(
      'Project title fragment to search and link when projects are not provided',
    )
    .optional(),
});

const goalCategorySchema = z
  .enum(['career', 'learning', 'portfolio', 'project', 'other'])
  .describe('Goal category');

const goalStatusSchema = z
  .enum(['active', 'archived'])
  .describe(
    'Goal status. Active goals are current targets; archived goals are history.',
  );

const goalInputSchema = z.object({
  title: z.string().describe('Goal title'),
  description: z.string().describe('Goal description').nullable().optional(),
  category: goalCategorySchema,
  status: goalStatusSchema,
  priority: z
    .number()
    .min(1)
    .describe('Goal priority. Lower numbers are higher priority.'),
  target_date: z
    .string()
    .describe('Target date in YYYY-MM-DD format')
    .nullable()
    .optional(),
});

const dashboardAnalysisItemSchema = z.object({
  title: z.string().describe('Item title'),
  description: z.string().describe('Item description'),
  category_names: z
    .array(z.string())
    .describe('Related category names')
    .optional(),
  memo_count: z
    .number()
    .min(0)
    .describe('Related memo count')
    .nullable()
    .optional(),
  goal_ids: z.array(z.number()).describe('Related goal IDs').optional(),
});

const dashboardAnalysisSuggestionSchema = z.object({
  title: z.string().describe('Suggestion title'),
  reason: z.string().describe('Suggestion reason'),
  priority: z.number().min(1).describe('Suggestion priority'),
  category_names: z
    .array(z.string())
    .describe('Related category names')
    .optional(),
  goal_ids: z.array(z.number()).describe('Related goal IDs').optional(),
});

const toolInputSchemas = {
  paput_create_memos: z.object({
    memos: z.array(createMemoInputSchema).min(1).describe('Memos to create'),
  }),
  paput_search_memo: z.object({
    word: z.string().describe('Search keyword').optional(),
    category_id: z.number().describe('Category ID').optional(),
    memo_type: z
      .enum(['knowledge', 'decision', 'operation', 'principle'])
      .describe('Memo type filter')
      .optional(),
    ids: z.array(z.number()).describe('Memo IDs').optional(),
    date: z.string().describe('Date in YYYY-MM-DD format').optional(),
    is_public: z.boolean().describe('Visibility filter').optional(),
    project_id: z.number().describe('Project ID filter').optional(),
    page: z.number().min(1).describe('Page number, starting at 1').optional(),
    limit: z
      .number()
      .min(1)
      .max(100)
      .describe('Number of items to return per page (max 100)')
      .optional(),
  }),
  paput_find_similar_memos: z.object({
    query: z
      .string()
      .describe(
        'Natural-language query describing the topic or content to find',
      ),
    limit: z
      .number()
      .min(1)
      .max(50)
      .describe('Maximum number of memos to return (default 10, max 50)')
      .optional(),
  }),
  paput_backfill_memo_embeddings: emptySchema,
  paput_get_memo: z.object({
    id: z.number().describe('Memo ID'),
  }),
  paput_update_memo: z.object({
    id: z.number().describe('Memo ID'),
    title: z.string().describe('Memo title'),
    body: z.string().describe('Memo body'),
    is_public: z.boolean().describe('Whether to publish the memo'),
    categories: z.array(memoCategorySchema).describe('Categories').optional(),
    projects: z
      .array(projectReferenceSchema)
      .describe('Projects to link when updating the memo')
      .optional(),
    project_match: z
      .string()
      .describe(
        'Project title fragment to search and link when projects are not provided',
      )
      .optional(),
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
  paput_get_skill_sheet_project_episodes_context: z.object({
    project_id: z.number().describe('Project ID'),
  }),
  paput_update_skill_sheet_project_episodes: z.object({
    project_id: z.number().describe('Project ID'),
    episodes: z
      .array(skillSheetProjectEpisodeSchema)
      .max(5)
      .describe(
        'Episodes to save. Pass an empty array to clear all project episodes.',
      ),
  }),
  paput_update_skill_sheet_faq: z.object({
    faq: z
      .array(skillSheetFaqItemSchema)
      .max(15)
      .describe(
        'FAQ items to save as a full replace. Pass an empty array to clear all items.',
      ),
  }),
  paput_list_goals: emptySchema,
  paput_create_goal: goalInputSchema,
  paput_update_goal: goalInputSchema.extend({
    id: z.number().describe('Goal ID. Required in the update request body.'),
  }),
  paput_delete_goal: z.object({
    id: z.number().describe('Goal ID'),
  }),
  paput_get_dashboard_analysis: emptySchema,
  paput_update_dashboard_analysis: z.object({
    current_summary: z.string().describe('Current summary'),
    strengths: z
      .array(dashboardAnalysisItemSchema)
      .describe('Strengths')
      .optional(),
    growing_areas: z
      .array(dashboardAnalysisItemSchema)
      .describe('Recently growing areas')
      .optional(),
    weak_areas: z
      .array(dashboardAnalysisItemSchema)
      .describe('Thin or weak areas')
      .optional(),
    next_knowledge_suggestions: z
      .array(dashboardAnalysisSuggestionSchema)
      .describe('Knowledge suggestions to learn next')
      .optional(),
    analyzed_at: z.string().describe('Analysis timestamp in ISO 8601 format'),
  }),
  paput_get_dashboard_analysis_context: emptySchema,
  paput_get_project_context: z.object({
    project: z
      .string()
      .min(1)
      .describe(
        'Project name to resolve (partial match allowed). Required only when no MCP project_alias is configured.',
      )
      .optional(),
  }),
  paput_get_project_document: z.object({
    id: z.number().min(1).describe('Project document ID'),
  }),
  paput_add_project_document: z.object({
    skill_sheet_project_id: z
      .number()
      .min(1)
      .describe(
        'Skill sheet project ID (resolve via paput_get_project_context)',
      ),
    kind: z
      .enum(['design_doc', 'procedure', 'skill_candidate'])
      .describe(
        'design_doc: design decision with rationale and rejected alternatives; procedure: repeatable work steps; skill_candidate: a proposal to turn repeated procedures into a skill',
      ),
    title: z.string().min(1).max(255).describe('Concise, searchable title'),
    summary: z
      .string()
      .max(500)
      .describe('One-line summary shown in the document index (keep it short)')
      .optional(),
    body: z
      .string()
      .min(1)
      .describe(
        'Markdown body. For design decisions include the decision, reasons, and rejected alternatives.',
      ),
    decided_at: z
      .string()
      .describe('Decision date in YYYY-MM-DD format (design_doc only)')
      .optional(),
  }),
  paput_update_project_document: z.object({
    id: z.number().min(1).describe('Project document ID to update'),
    title: z.string().min(1).max(255).describe('Concise, searchable title'),
    summary: z
      .string()
      .max(500)
      .describe(
        'One-line summary shown in the document index (keep it short). Omitting it clears the summary.',
      )
      .optional(),
    body: z
      .string()
      .min(1)
      .describe(
        'Markdown body. For design decisions include the decision, reasons, and rejected alternatives.',
      ),
  }),
  paput_update_project_instructions: z.object({
    skill_sheet_project_id: z
      .number()
      .min(1)
      .describe(
        'Skill sheet project ID (resolve via paput_get_project_context)',
      ),
    body: z
      .string()
      .min(1)
      .max(8000)
      .describe(
        'Full instructions body in Markdown (overwrites the previous version, max 8000 characters)',
      ),
  }),
  paput_discard_project_proposal: z.object({
    id: z.number().min(1).describe('Proposal document ID'),
    reason: z
      .string()
      .min(1)
      .max(500)
      .describe('Why the user rejected the proposal'),
  }),
  paput_promote_project_documents: z.object({
    ids: z
      .array(z.number().min(1))
      .min(1)
      .describe(
        'Document IDs to promote (the skill proposal and its related procedure records)',
      ),
    promoted_to: z
      .string()
      .min(1)
      .max(255)
      .describe(
        'Promotion target, e.g. the skill name or file path (max 255 chars)',
      ),
  }),
  paput_add_knowledge_candidates: z.object({
    session_id: z.string().describe('Source session ID'),
    source: z.enum(['claude', 'codex']).describe('Source session provider'),
    source_session_updated_at: z
      .string()
      .describe('Source session updated timestamp in ISO 8601 format')
      .optional(),
    candidates: z
      .array(knowledgeCandidateSchema)
      .describe('Knowledge candidates to add'),
  }),
  paput_list_processed_sessions: z.object({
    source: z
      .enum(['claude', 'codex'])
      .describe('Optional session source to filter by')
      .optional(),
  }),
  paput_mark_processed_session: z.object({
    source: z.enum(['claude', 'codex']).describe('Session source'),
    session_id: z.string().describe('Session ID that was reviewed'),
    source_session_updated_at: z
      .string()
      .describe('Source session updated timestamp in ISO 8601 format')
      .optional(),
  }),
  paput_list_pending_candidates: z.object({
    limit: z
      .number()
      .describe('Number of items to return. Defaults to 20.')
      .optional(),
  }),
  paput_update_pending_candidate: z.object({
    candidate_id: z.string().describe('Pending candidate ID to update'),
    title: z.string().min(1).describe('Replacement title').optional(),
    body: z.string().min(1).describe('Replacement body').optional(),
    categories: z
      .array(z.string())
      .describe('Replacement category names')
      .optional(),
    memo_type_keys: z
      .array(z.enum(['knowledge', 'decision', 'operation', 'principle']))
      .describe(
        'Memo type classification keys (a memo can have multiple). decision/operation/principle are the primary material for durable judgment and working-practice summaries.',
      )
      .optional(),
    confidence: z.number().describe('Confidence score').optional(),
    is_public: z
      .boolean()
      .describe('Whether the saved memo will be public')
      .optional(),
    projects: z
      .array(projectReferenceSchema)
      .describe('Replacement linked projects')
      .optional(),
  }),
  paput_save_pending_candidate: z.object({
    candidate_id: z.string().describe('Candidate ID to save'),
    saved_memo_id: z
      .number()
      .describe(
        'Existing memo ID to attach when retrying after memo creation succeeded but candidate save failed. Omit for normal saves.',
      )
      .optional(),
    title: z.string().describe('Title override when saving').optional(),
    body: z.string().describe('Body override when saving').optional(),
    created_at: z
      .string()
      .describe(
        'Creation timestamp to use for the PaPut memo. Defaults to the source session updated timestamp, then the pending candidate created timestamp.',
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
  paput_get_capture_policy: emptySchema,
  paput_get_discard_policy_context: z.object({
    limit: z
      .number()
      .describe('Maximum number of discarded candidates to include.')
      .optional(),
  }),
  paput_update_capture_policy: z.object({
    markdown: z.string().describe('Capture policy markdown to save locally.'),
  }),
} satisfies Record<string, z.ZodTypeAny>;

export function getToolInputZodSchema(
  toolName: string,
): z.ZodTypeAny | undefined {
  return toolInputSchemas[toolName as keyof typeof toolInputSchemas];
}

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
