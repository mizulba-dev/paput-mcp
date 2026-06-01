import { describe, it } from 'vitest';
import { expectToolDefinition } from '../test-utils.js';
import { listPendingCandidatesTool } from './tool.js';

describe('listPendingCandidatesTool', () => {
  it('defines paput_list_pending_candidates', () => {
    expectToolDefinition(
      listPendingCandidatesTool,
      'paput_list_pending_candidates',
    );
  });
});
