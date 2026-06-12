import { describe, it } from 'vitest';
import { expectToolDefinition } from '../test-utils.js';
import { createMemosTool } from './tool.js';

describe('createMemosTool', () => {
  it('defines paput_create_memos', () => {
    expectToolDefinition(createMemosTool, 'paput_create_memos');
  });
});
