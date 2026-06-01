import { describe, it } from 'vitest';
import { expectToolDefinition } from '../test-utils.js';
import { setSkillSheetSkillsTool } from './tool.js';

describe('setSkillSheetSkillsTool', () => {
  it('defines paput_set_skill_sheet_skills', () => {
    expectToolDefinition(
      setSkillSheetSkillsTool,
      'paput_set_skill_sheet_skills',
    );
  });
});
