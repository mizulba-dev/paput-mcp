import { describe, it } from 'vitest';
import { expectToolDefinition } from '../test-utils.js';
import { promoteProjectDocumentsTool } from './tool.js';

describe('promoteProjectDocumentsTool', () => {
  it('defines paput_promote_project_documents', () => {
    expectToolDefinition(
      promoteProjectDocumentsTool,
      'paput_promote_project_documents',
    );
  });
});
