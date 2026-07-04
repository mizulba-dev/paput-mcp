import { describe, it } from 'vitest';
import { expectToolDefinition } from '../test-utils.js';
import { updateSkillSheetProjectEpisodesTool } from './tool.js';

describe('updateSkillSheetProjectEpisodesTool', () => {
  it('defines paput_update_skill_sheet_project_episodes', () => {
    expectToolDefinition(
      updateSkillSheetProjectEpisodesTool,
      'paput_update_skill_sheet_project_episodes',
    );
  });
});
