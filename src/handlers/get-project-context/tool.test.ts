import { describe, it } from 'vitest';
import { expectToolDefinition } from '../test-utils.js';
import { getProjectContextTool } from './tool.js';

describe('getProjectContextTool', () => {
  it('defines paput_get_project_context', () => {
    expectToolDefinition(getProjectContextTool, 'paput_get_project_context');
  });
});
