import { describe, it } from 'vitest';
import { expectToolDefinition } from '../test-utils.js';
import { createMemoTool } from './tool.js';

describe('createMemoTool', () => {
  it('defines paput_create_memo', () => {
    expectToolDefinition(createMemoTool, 'paput_create_memo');
  });
});
