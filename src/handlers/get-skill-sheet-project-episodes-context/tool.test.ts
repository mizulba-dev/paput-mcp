import { describe, it } from 'vitest';
import { expectToolDefinition } from '../test-utils.js';
import { getSkillSheetProjectEpisodesContextTool } from './tool.js';

describe('getSkillSheetProjectEpisodesContextTool', () => {
  it('defines paput_get_skill_sheet_project_episodes_context', () => {
    expectToolDefinition(
      getSkillSheetProjectEpisodesContextTool,
      'paput_get_skill_sheet_project_episodes_context',
    );
  });
});
