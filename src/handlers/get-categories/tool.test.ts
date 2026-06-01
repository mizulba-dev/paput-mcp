import { describe, it } from 'vitest';
import { expectToolDefinition } from '../test-utils.js';
import { getCategoriesTool } from './tool.js';

describe('getCategoriesTool', () => {
  it('defines paput_get_categories', () => {
    expectToolDefinition(getCategoriesTool, 'paput_get_categories');
  });
});
