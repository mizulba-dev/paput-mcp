export type SessionSource = 'claude' | 'codex';

export interface CachedMemo {
  id: number;
  title: string;
  body: string;
  categories: string[];
  is_public: boolean;
  created_at?: string;
  updated_at?: string;
  fingerprint: string;
}

export interface KnowledgeCandidateInput {
  title: string;
  body: string;
  categories?: string[];
  confidence?: number;
  is_public?: boolean;
}

export interface PendingKnowledgeCandidate extends KnowledgeCandidateInput {
  id: string;
  session_id: string;
  source: SessionSource;
  source_session_updated_at?: string;
  status: 'pending' | 'saved' | 'discarded';
  fingerprint: string;
  similar_memos: SimilarMemo[];
  created_at: string;
  updated_at: string;
  saved_memo_id?: number;
  discarded_reason?: string;
}

export interface SimilarMemo {
  id: number;
  title: string;
  score: number;
}

export interface ProcessedSession {
  session_id: string;
  source: SessionSource;
  path: string;
  processed_at: string;
}

export interface SessionSummary {
  session_id: string;
  source: SessionSource;
  path: string;
  updated_at: string;
  message_count: number;
  processed: boolean;
}
