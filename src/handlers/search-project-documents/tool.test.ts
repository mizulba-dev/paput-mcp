import { describe, it } from 'vitest';
import { expectToolDefinition } from '../test-utils.js';
import { searchProjectDocumentsTool } from './tool.js';

describe('searchProjectDocumentsTool', () => {
  it('defines paput_search_project_documents', () => {
    expectToolDefinition(
      searchProjectDocumentsTool,
      'paput_search_project_documents',
    );
  });
});
