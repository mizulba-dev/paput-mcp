import { describe, it } from 'vitest';
import { expectToolDefinition } from '../test-utils.js';
import { getDiscardPolicyContextTool } from './tool.js';

describe('getDiscardPolicyContextTool', () => {
  it('defines paput_get_discard_policy_context', () => {
    expectToolDefinition(
      getDiscardPolicyContextTool,
      'paput_get_discard_policy_context',
    );
  });
});
