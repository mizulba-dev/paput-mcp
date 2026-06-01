import { describe, it } from 'vitest';
import { expectToolDefinition } from '../test-utils.js';
import { searchMemoTool } from './tool.js';

describe('searchMemoTool', () => {
  it('defines paput_search_memo', () => {
    expectToolDefinition(searchMemoTool, 'paput_search_memo');
  });
});
