import { describe, it } from 'vitest';
import { expectToolDefinition } from '../test-utils.js';
import { upsertSkillSheetProjectTool } from './tool.js';

describe('upsertSkillSheetProjectTool', () => {
  it('defines paput_upsert_skill_sheet_project', () => {
    expectToolDefinition(
      upsertSkillSheetProjectTool,
      'paput_upsert_skill_sheet_project',
    );
  });
});
