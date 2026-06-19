import { describe, it } from 'vitest';
import { expectToolDefinition } from '../test-utils.js';
import { updateProjectDocumentTool } from './tool.js';

describe('updateProjectDocumentTool', () => {
  it('defines paput_update_project_document', () => {
    expectToolDefinition(
      updateProjectDocumentTool,
      'paput_update_project_document',
    );
  });
});
