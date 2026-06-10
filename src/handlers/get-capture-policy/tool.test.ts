import { describe, it } from 'vitest';
import { expectToolDefinition } from '../test-utils.js';
import { getCapturePolicyTool } from './tool.js';

describe('getCapturePolicyTool', () => {
  it('defines paput_get_capture_policy', () => {
    expectToolDefinition(getCapturePolicyTool, 'paput_get_capture_policy');
  });
});
