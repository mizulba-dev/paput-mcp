import { describe, expect, it } from 'vitest';
import {
  getGeneratedInputSchema,
  getToolInputZodSchema,
} from './tool-input.js';

describe('getGeneratedInputSchema', () => {
  it('generates required fields for upserting skill sheet projects', () => {
    const schema = getGeneratedInputSchema('paput_upsert_skill_sheet_project');

    expect(schema).toMatchObject({
      type: 'object',
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
    });
    expect(schema?.properties.title).toMatchObject({
      type: 'string',
      description: 'Project title',
    });
    expect(schema?.properties.id).toMatchObject({
      type: 'number',
      description: 'Project ID to update. Omit when creating a new project.',
    });
    expect(schema?.properties.achievements).toMatchObject({
      type: 'array',
      description: expect.stringContaining('Omit to keep existing values'),
    });
  });

  it('generates required fields for updating project episodes', () => {
    const schema = getGeneratedInputSchema(
      'paput_update_skill_sheet_project_episodes',
    );

    expect(schema).toMatchObject({
      type: 'object',
      required: ['project_id', 'episodes'],
    });
    expect(schema?.properties.episodes).toMatchObject({
      type: 'array',
      items: {
        required: ['claim', 'supporting_memo_ids'],
      },
    });
  });

  it('returns undefined for unknown tools', () => {
    expect(getGeneratedInputSchema('paput_unknown')).toBeUndefined();
  });

  it('requires id in the goal update schema', () => {
    const schema = getGeneratedInputSchema('paput_update_goal');

    expect(schema?.required).toEqual([
      'title',
      'category',
      'status',
      'priority',
      'id',
    ]);
    expect(schema?.properties.id).toMatchObject({
      type: 'number',
      description: 'Goal ID. Required in the update request body.',
    });
  });

  it('generates dashboard analysis update schema', () => {
    const schema = getGeneratedInputSchema('paput_update_dashboard_analysis');

    expect(schema?.required).toEqual(['current_summary', 'analyzed_at']);
    expect(schema?.properties.next_knowledge_suggestions).toMatchObject({
      type: 'array',
      description: 'Knowledge suggestions to learn next',
    });
  });
});

describe('paput_upsert_skill_sheet_project schema', () => {
  const schema = getToolInputZodSchema('paput_upsert_skill_sheet_project')!;

  it('describes type 3 as a private project option', () => {
    const generated = getGeneratedInputSchema(
      'paput_upsert_skill_sheet_project',
    );

    expect(generated?.properties.type).toMatchObject({
      type: 'number',
      description:
        'Project type: 1 business, 2 personal, 3 private (hidden from public profile)',
    });
  });

  const base = {
    title: 'Project title',
    start_period: '2026-01',
    description: 'Description',
    role: 'Role',
    scale: 'Scale',
    technologies: [],
    processes: [],
    memos: [],
  };

  it('accepts type 3 (private)', () => {
    expect(schema.safeParse({ ...base, type: 3 }).success).toBe(true);
  });

  it('still accepts type 1 (business) and 2 (personal)', () => {
    expect(schema.safeParse({ ...base, type: 1 }).success).toBe(true);
    expect(schema.safeParse({ ...base, type: 2 }).success).toBe(true);
  });
});

describe('paput_search_project_documents schema', () => {
  const schema = getToolInputZodSchema('paput_search_project_documents')!;

  it('requires a non-empty query', () => {
    expect(schema.safeParse({}).success).toBe(false);
    expect(schema.safeParse({ query: '' }).success).toBe(false);
    expect(schema.safeParse({ query: 'render plan' }).success).toBe(true);
  });

  it('allows omitting limit and include_archived', () => {
    const result = schema.safeParse({ query: 'render plan' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limit).toBeUndefined();
      expect(result.data.include_archived).toBeUndefined();
    }
  });

  it('rejects a limit above the max of 20', () => {
    expect(schema.safeParse({ query: 'render plan', limit: 20 }).success).toBe(
      true,
    );
    expect(schema.safeParse({ query: 'render plan', limit: 21 }).success).toBe(
      false,
    );
    expect(schema.safeParse({ query: 'render plan', limit: 0 }).success).toBe(
      false,
    );
  });

  it('accepts include_archived as a boolean', () => {
    expect(
      schema.safeParse({ query: 'render plan', include_archived: true })
        .success,
    ).toBe(true);
    expect(
      schema.safeParse({ query: 'render plan', include_archived: 'true' })
        .success,
    ).toBe(false);
  });
});

describe('paput_update_project_document schema', () => {
  const schema = getToolInputZodSchema('paput_update_project_document')!;

  const base = { id: 1, title: 'Title', body: 'Body' };

  it('allows omitting status', () => {
    expect(schema.safeParse(base).success).toBe(true);
  });

  it('allows only active or archived for status', () => {
    expect(schema.safeParse({ ...base, status: 'active' }).success).toBe(true);
    expect(schema.safeParse({ ...base, status: 'archived' }).success).toBe(
      true,
    );
    expect(schema.safeParse({ ...base, status: 'retired' }).success).toBe(
      false,
    );
    expect(schema.safeParse({ ...base, status: '' }).success).toBe(false);
  });
});
