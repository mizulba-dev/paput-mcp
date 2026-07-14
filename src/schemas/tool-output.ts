import type { ToolDefinition } from '../types/index.js';

type OutputSchema = NonNullable<ToolDefinition['outputSchema']>;
type PropertySchema = Record<string, unknown>;

const booleanSchema = { type: 'boolean' } as const;
const numberSchema = { type: 'number' } as const;
const stringSchema = { type: 'string' } as const;
const nullableStringSchema = {
  anyOf: [stringSchema, { type: 'null' }],
} as const;
const nullableNumberSchema = {
  anyOf: [numberSchema, { type: 'null' }],
} as const;
const objectSchema = {
  type: 'object',
  additionalProperties: true,
} as const;
const nullableObjectSchema = {
  anyOf: [objectSchema, { type: 'null' }],
} as const;
const objectArraySchema = {
  type: 'array',
  items: objectSchema,
} as const;
const numberArraySchema = {
  type: 'array',
  items: numberSchema,
} as const;
const stringArraySchema = {
  type: 'array',
  items: stringSchema,
} as const;

function outputSchema(
  properties: Record<string, PropertySchema>,
  required: string[] = Object.keys(properties),
): OutputSchema {
  return {
    type: 'object',
    properties,
    required,
    additionalProperties: true,
  };
}

const capturePolicySchema = outputSchema({
  path: nullableStringSchema,
  markdown: stringSchema,
  exists: booleanSchema,
  updated_at: nullableStringSchema,
});

const projectDocumentSchema = outputSchema({
  id: numberSchema,
  skill_sheet_project_id: numberSchema,
  kind: stringSchema,
  status: stringSchema,
  title: stringSchema,
  summary: stringSchema,
  body: stringSchema,
  promoted_to: nullableStringSchema,
  decided_at: nullableStringSchema,
  created_at: stringSchema,
  updated_at: stringSchema,
});

const toolOutputSchemas: Record<string, OutputSchema> = {
  paput_create_memos: outputSchema({
    success: booleanSchema,
    action: stringSchema,
    created_count: numberSchema,
    failed_count: numberSchema,
    created: objectArraySchema,
    failed: objectArraySchema,
  }),
  paput_search_memo: outputSchema({
    total: numberSchema,
    memos: objectArraySchema,
  }),
  paput_find_similar_memos: outputSchema({
    memos: objectArraySchema,
  }),
  paput_backfill_memo_embeddings: outputSchema({
    processed: numberSchema,
    failed: numberSchema,
    has_more: booleanSchema,
  }),
  paput_get_memo: outputSchema({
    memo: objectSchema,
  }),
  paput_update_memo: outputSchema({
    success: booleanSchema,
    action: stringSchema,
    memo: objectSchema,
  }),
  paput_get_categories: outputSchema({
    categories: objectArraySchema,
  }),
  paput_create_note: outputSchema({
    success: booleanSchema,
    action: stringSchema,
    note: objectSchema,
  }),
  paput_search_notes: outputSchema({
    total: numberSchema,
    notes: objectArraySchema,
  }),
  paput_get_note: outputSchema({
    note: objectSchema,
  }),
  paput_update_note: outputSchema({
    success: booleanSchema,
    action: stringSchema,
    note: objectSchema,
  }),
  paput_get_skill_sheet: outputSchema({
    skill_sheet: objectSchema,
  }),
  paput_update_skill_sheet_basic_info: outputSchema({
    success: booleanSchema,
    action: stringSchema,
    basic_info: objectSchema,
  }),
  paput_update_skill_sheet_self_pr: outputSchema({
    success: booleanSchema,
    action: stringSchema,
    self_pr: nullableStringSchema,
  }),
  paput_set_skill_sheet_skills: outputSchema({
    success: booleanSchema,
    action: stringSchema,
    skills: objectArraySchema,
  }),
  paput_upsert_skill_sheet_project: outputSchema(
    {
      success: booleanSchema,
      action: stringSchema,
      id: numberSchema,
      project: objectSchema,
    },
    ['success', 'action', 'project'],
  ),
  paput_delete_skill_sheet_project: outputSchema({
    success: booleanSchema,
    action: stringSchema,
    project_id: numberSchema,
  }),
  paput_get_skill_sheet_project_episodes_context: outputSchema({
    project: objectSchema,
    public_memos: objectArraySchema,
    private_memo_count: numberSchema,
    prompt: stringSchema,
  }),
  paput_update_skill_sheet_project_episodes: outputSchema({
    success: booleanSchema,
    project_id: numberSchema,
    episodes: objectArraySchema,
    episodes_updated_at: nullableStringSchema,
    warnings: stringArraySchema,
  }),
  paput_update_skill_sheet_faq: outputSchema({
    success: booleanSchema,
    faq: objectArraySchema,
    warnings: stringArraySchema,
  }),
  paput_list_goals: outputSchema({
    goals: objectArraySchema,
  }),
  paput_create_goal: outputSchema({
    success: booleanSchema,
    goal: objectSchema,
  }),
  paput_update_goal: outputSchema({
    success: booleanSchema,
    goal: objectSchema,
  }),
  paput_delete_goal: outputSchema({
    success: booleanSchema,
    deleted_goal_id: numberSchema,
  }),
  paput_get_dashboard_analysis: outputSchema({
    dashboard_analysis: nullableObjectSchema,
  }),
  paput_update_dashboard_analysis: outputSchema({
    success: booleanSchema,
    dashboard_analysis: objectSchema,
  }),
  paput_get_dashboard_analysis_context: outputSchema({
    dashboard_summary: objectSchema,
    goals: objectArraySchema,
    skill_sheet: objectSchema,
    recent_memos: objectArraySchema,
    notes: objectArraySchema,
    categories: objectArraySchema,
    saved_dashboard_analysis: nullableObjectSchema,
    prompt: stringSchema,
  }),
  paput_get_project_context: outputSchema(
    {
      project: objectSchema,
      instructions: nullableStringSchema,
      document_counts: objectSchema,
      proposals: objectArraySchema,
      matched_projects: objectArraySchema,
    },
    ['project', 'instructions', 'document_counts', 'proposals'],
  ),
  paput_get_project_document: projectDocumentSchema,
  paput_search_project_documents: outputSchema({
    documents: objectArraySchema,
  }),
  paput_add_project_document: outputSchema(
    {
      document: nullableObjectSchema,
      duplicate: booleanSchema,
      promoted_to: nullableStringSchema,
      similar_documents: objectArraySchema,
      skill_proposal: nullableObjectSchema,
    },
    ['document', 'duplicate', 'similar_documents'],
  ),
  paput_update_project_document: projectDocumentSchema,
  paput_update_project_instructions: outputSchema({
    skill_sheet_project_id: numberSchema,
    body: stringSchema,
    updated_at: stringSchema,
  }),
  paput_discard_project_proposal: outputSchema({
    success: booleanSchema,
    id: numberSchema,
  }),
  paput_promote_project_documents: outputSchema({
    success: booleanSchema,
    ids: numberArraySchema,
    promoted_to: stringSchema,
  }),
  paput_add_knowledge_candidates: outputSchema({
    added: numberSchema,
    duplicates: numberSchema,
    candidates: objectArraySchema,
    duplicate_details: objectArraySchema,
  }),
  paput_list_processed_sessions: outputSchema({
    sessions: objectArraySchema,
  }),
  paput_mark_processed_session: outputSchema(
    {
      session_id: stringSchema,
      source: stringSchema,
      path: stringSchema,
      processed_at: stringSchema,
      source_session_updated_at: stringSchema,
    },
    ['session_id', 'source', 'processed_at'],
  ),
  paput_list_pending_candidates: outputSchema({
    count: numberSchema,
    candidates: objectArraySchema,
  }),
  paput_update_pending_candidate: outputSchema({
    updated: booleanSchema,
    candidate: objectSchema,
  }),
  paput_save_pending_candidate: outputSchema({
    success: booleanSchema,
    action: stringSchema,
    candidate_id: stringSchema,
    memo_id: nullableNumberSchema,
    title: stringSchema,
    created_at: stringSchema,
    created_at_source: stringSchema,
    used_existing_memo: booleanSchema,
    warnings: stringArraySchema,
  }),
  paput_discard_pending_candidate: outputSchema({
    discarded: booleanSchema,
    candidate_id: stringSchema,
    title: stringSchema,
    candidate: objectSchema,
  }),
  paput_get_capture_policy: capturePolicySchema,
  paput_get_discard_policy_context: outputSchema({
    policy: objectSchema,
    total_discarded_count: numberSchema,
    returned_discarded_count: numberSchema,
    discarded_candidates: objectArraySchema,
  }),
  paput_update_capture_policy: capturePolicySchema,
};

export function getToolOutputSchema(name: string): OutputSchema | undefined {
  return toolOutputSchemas[name];
}
