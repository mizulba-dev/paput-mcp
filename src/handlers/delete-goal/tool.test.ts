import { describe, it } from 'vitest';
import { expectToolDefinition } from '../test-utils.js';
import { deleteGoalTool } from './tool.js';

describe('deleteGoalTool', () => {
  it('defines paput_delete_goal', () => {
    expectToolDefinition(deleteGoalTool, 'paput_delete_goal');
  });
});
