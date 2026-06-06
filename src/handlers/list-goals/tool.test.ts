import { describe, it } from 'vitest';
import { expectToolDefinition } from '../test-utils.js';
import { listGoalsTool } from './tool.js';

describe('listGoalsTool', () => {
  it('defines paput_list_goals', () => {
    expectToolDefinition(listGoalsTool, 'paput_list_goals');
  });
});
