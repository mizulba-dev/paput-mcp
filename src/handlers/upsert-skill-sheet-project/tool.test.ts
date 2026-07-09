import { describe, expect, it } from 'vitest';
import { expectToolDefinition } from '../test-utils.js';
import { upsertSkillSheetProjectTool } from './tool.js';

describe('upsertSkillSheetProjectTool', () => {
  it('defines paput_upsert_skill_sheet_project', () => {
    expectToolDefinition(
      upsertSkillSheetProjectTool,
      'paput_upsert_skill_sheet_project',
    );
  });

  it('describes type 3 as a private project option', () => {
    expect(
      upsertSkillSheetProjectTool.definition.inputSchema.properties?.type,
    ).toMatchObject({
      type: 'number',
      description:
        'Project type: 1 business, 2 personal, 3 private (hidden from public profile)',
    });
  });
});
