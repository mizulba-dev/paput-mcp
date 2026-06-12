import { describe, it } from 'vitest';
import { expectToolDefinition } from '../test-utils.js';
import { discardProjectProposalTool } from './tool.js';

describe('discardProjectProposalTool', () => {
  it('defines paput_discard_project_proposal', () => {
    expectToolDefinition(
      discardProjectProposalTool,
      'paput_discard_project_proposal',
    );
  });
});
