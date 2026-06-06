import { describe, it } from 'vitest';
import { expectToolDefinition } from '../test-utils.js';
import { createGoalTool } from './tool.js';

describe('createGoalTool', () => {
  it('defines paput_create_goal', () => {
    expectToolDefinition(createGoalTool, 'paput_create_goal');
  });
});
