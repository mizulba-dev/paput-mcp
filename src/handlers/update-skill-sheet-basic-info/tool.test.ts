import { describe, it } from 'vitest';
import { expectToolDefinition } from '../test-utils.js';
import { updateSkillSheetBasicInfoTool } from './tool.js';

describe('updateSkillSheetBasicInfoTool', () => {
  it('defines paput_update_skill_sheet_basic_info', () => {
    expectToolDefinition(
      updateSkillSheetBasicInfoTool,
      'paput_update_skill_sheet_basic_info',
    );
  });
});
