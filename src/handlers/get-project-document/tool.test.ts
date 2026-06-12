import { describe, it } from 'vitest';
import { expectToolDefinition } from '../test-utils.js';
import { getProjectDocumentTool } from './tool.js';

describe('getProjectDocumentTool', () => {
  it('defines paput_get_project_document', () => {
    expectToolDefinition(getProjectDocumentTool, 'paput_get_project_document');
  });
});
