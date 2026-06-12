import { ToolHandler } from '../../types/index.js';
import { handleBackfillMemoEmbeddings } from './handler.js';

export const backfillMemoEmbeddingsTool: ToolHandler = {
  definition: {
    name: 'paput_backfill_memo_embeddings',
    description:
      'Generate embeddings for existing PaPut memos that do not have one yet, so they become searchable with paput_find_similar_memos. Processes up to 100 memos per call; call repeatedly while has_more is true. New and updated memos get embeddings automatically, so this is mainly needed once after enabling semantic search.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  handler: handleBackfillMemoEmbeddings,
};
