import { describe, it } from 'vitest';
import { expectToolDefinition } from '../test-utils.js';
import { backfillMemoEmbeddingsTool } from './tool.js';

describe('backfillMemoEmbeddingsTool', () => {
  it('defines paput_backfill_memo_embeddings', () => {
    expectToolDefinition(
      backfillMemoEmbeddingsTool,
      'paput_backfill_memo_embeddings',
    );
  });
});
