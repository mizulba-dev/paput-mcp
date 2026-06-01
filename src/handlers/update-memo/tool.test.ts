import { describe, it } from 'vitest';
import { expectToolDefinition } from '../test-utils.js';
import { updateMemoTool } from './tool.js';

describe('updateMemoTool', () => {
  it('defines paput_update_memo', () => {
    expectToolDefinition(updateMemoTool, 'paput_update_memo');
  });
});
