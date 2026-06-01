import { describe, it } from 'vitest';
import { expectToolDefinition } from '../test-utils.js';
import { getSkillSheetTool } from './tool.js';

describe('getSkillSheetTool', () => {
  it('defines paput_get_skill_sheet', () => {
    expectToolDefinition(getSkillSheetTool, 'paput_get_skill_sheet');
  });
});
