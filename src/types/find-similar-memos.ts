import { Memo } from './search-memo.js';

export interface FindSimilarMemosParams {
  query: string;
  limit?: number;
}

export interface SimilarMemoResult extends Memo {
  score: number;
}

export interface FindSimilarMemosResponse {
  success: boolean;
  memos?: SimilarMemoResult[];
  error?: string;
}

export interface BackfillMemoEmbeddingsResponse {
  success: boolean;
  processed?: number;
  failed?: number;
  has_more?: boolean;
  error?: string;
}
