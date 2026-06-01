import { describe, it } from 'vitest';
import { expectToolDefinition } from '../test-utils.js';
import { discardPendingCandidateTool } from './tool.js';

describe('discardPendingCandidateTool', () => {
  it('defines paput_discard_pending_candidate', () => {
    expectToolDefinition(
      discardPendingCandidateTool,
      'paput_discard_pending_candidate',
    );
  });
});
