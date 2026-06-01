import { describe, it } from 'vitest';
import { expectToolDefinition } from '../test-utils.js';
import { deleteSkillSheetProjectTool } from './tool.js';

describe('deleteSkillSheetProjectTool', () => {
  it('defines paput_delete_skill_sheet_project', () => {
    expectToolDefinition(
      deleteSkillSheetProjectTool,
      'paput_delete_skill_sheet_project',
    );
  });
});
