import { describe, it } from 'vitest';
import { expectToolDefinition } from '../test-utils.js';
import { searchNotesTool } from './tool.js';

describe('searchNotesTool', () => {
  it('defines paput_search_notes', () => {
    expectToolDefinition(searchNotesTool, 'paput_search_notes');
  });
});
