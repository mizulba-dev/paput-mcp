import { describe, expect, it } from 'vitest';
import { getGeneratedInputSchema } from './tool-input.js';

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
