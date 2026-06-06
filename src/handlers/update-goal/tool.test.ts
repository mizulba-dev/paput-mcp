import { describe, it } from 'vitest';
import { expectToolDefinition } from '../test-utils.js';
import { updateGoalTool } from './tool.js';

describe('updateGoalTool', () => {
  it('defines paput_update_goal', () => {
    expectToolDefinition(updateGoalTool, 'paput_update_goal');
  });
});
