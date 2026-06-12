import { describe, it } from 'vitest';
import { expectToolDefinition } from '../test-utils.js';
import { addProjectDocumentTool } from './tool.js';

describe('addProjectDocumentTool', () => {
  it('defines paput_add_project_document', () => {
    expectToolDefinition(addProjectDocumentTool, 'paput_add_project_document');
  });
});
