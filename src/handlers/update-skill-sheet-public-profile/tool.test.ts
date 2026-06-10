import { describe, it } from 'vitest';
import { expectToolDefinition } from '../test-utils.js';
import { updateSkillSheetPublicProfileTool } from './tool.js';

describe('updateSkillSheetPublicProfileTool', () => {
  it('defines paput_update_skill_sheet_public_profile', () => {
    expectToolDefinition(
      updateSkillSheetPublicProfileTool,
      'paput_update_skill_sheet_public_profile',
    );
  });
});
