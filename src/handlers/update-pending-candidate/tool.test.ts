import { describe, it } from 'vitest';
import { expectToolDefinition } from '../test-utils.js';
import { updatePendingCandidateTool } from './tool.js';

describe('updatePendingCandidateTool', () => {
  it('defines paput_update_pending_candidate', () => {
    expectToolDefinition(
      updatePendingCandidateTool,
      'paput_update_pending_candidate',
    );
  });
});
