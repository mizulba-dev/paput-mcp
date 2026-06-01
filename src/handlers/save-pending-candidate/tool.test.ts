import { describe, it } from 'vitest';
import { expectToolDefinition } from '../test-utils.js';
import { savePendingCandidateTool } from './tool.js';

describe('savePendingCandidateTool', () => {
  it('defines paput_save_pending_candidate', () => {
    expectToolDefinition(
      savePendingCandidateTool,
      'paput_save_pending_candidate',
    );
  });
});
