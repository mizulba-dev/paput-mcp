import { describe, it } from 'vitest';
import { expectToolDefinition } from '../test-utils.js';
import { updateSkillSheetFaqTool } from './tool.js';

describe('updateSkillSheetFaqTool', () => {
  it('defines paput_update_skill_sheet_faq', () => {
    expectToolDefinition(
      updateSkillSheetFaqTool,
      'paput_update_skill_sheet_faq',
    );
  });
});
