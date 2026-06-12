import { describe, it } from 'vitest';
import { expectToolDefinition } from '../test-utils.js';
import { updateProjectInstructionsTool } from './tool.js';

describe('updateProjectInstructionsTool', () => {
  it('defines paput_update_project_instructions', () => {
    expectToolDefinition(
      updateProjectInstructionsTool,
      'paput_update_project_instructions',
    );
  });
});
