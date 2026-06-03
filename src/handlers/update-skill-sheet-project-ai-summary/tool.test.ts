import { describe, it } from 'vitest';
import { expectToolDefinition } from '../test-utils.js';
import { updateSkillSheetProjectAiSummaryTool } from './tool.js';

describe('updateSkillSheetProjectAiSummaryTool', () => {
  it('defines paput_update_skill_sheet_project_ai_summary', () => {
    expectToolDefinition(
      updateSkillSheetProjectAiSummaryTool,
      'paput_update_skill_sheet_project_ai_summary',
    );
  });
});
