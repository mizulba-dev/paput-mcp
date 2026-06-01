import { describe, it } from 'vitest';
import { expectToolDefinition } from '../test-utils.js';
import { updateSkillSheetSelfPrTool } from './tool.js';

describe('updateSkillSheetSelfPrTool', () => {
  it('defines paput_update_skill_sheet_self_pr', () => {
    expectToolDefinition(
      updateSkillSheetSelfPrTool,
      'paput_update_skill_sheet_self_pr',
    );
  });
});
