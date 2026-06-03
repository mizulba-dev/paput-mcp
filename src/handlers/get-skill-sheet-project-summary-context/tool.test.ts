import { describe, it } from 'vitest';
import { expectToolDefinition } from '../test-utils.js';
import { getSkillSheetProjectSummaryContextTool } from './tool.js';

describe('getSkillSheetProjectSummaryContextTool', () => {
  it('defines paput_get_skill_sheet_project_summary_context', () => {
    expectToolDefinition(
      getSkillSheetProjectSummaryContextTool,
      'paput_get_skill_sheet_project_summary_context',
    );
  });
});
