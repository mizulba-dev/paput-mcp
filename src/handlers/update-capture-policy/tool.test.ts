import { describe, it } from 'vitest';
import { expectToolDefinition } from '../test-utils.js';
import { updateCapturePolicyTool } from './tool.js';

describe('updateCapturePolicyTool', () => {
  it('defines paput_update_capture_policy', () => {
    expectToolDefinition(
      updateCapturePolicyTool,
      'paput_update_capture_policy',
    );
  });
});
