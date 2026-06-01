import { describe, it } from 'vitest';
import { expectToolDefinition } from '../test-utils.js';
import { addKnowledgeCandidatesTool } from './tool.js';

describe('addKnowledgeCandidatesTool', () => {
  it('defines paput_add_knowledge_candidates', () => {
    expectToolDefinition(
      addKnowledgeCandidatesTool,
      'paput_add_knowledge_candidates',
    );
  });
});
