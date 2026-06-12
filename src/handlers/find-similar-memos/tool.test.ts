import { describe, it } from 'vitest';
import { expectToolDefinition } from '../test-utils.js';
import { findSimilarMemosTool } from './tool.js';

describe('findSimilarMemosTool', () => {
  it('defines paput_find_similar_memos', () => {
    expectToolDefinition(findSimilarMemosTool, 'paput_find_similar_memos');
  });
});
