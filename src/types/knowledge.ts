export type SessionSource = 'claude' | 'codex';

// claude/codex はローカルセッション（harvest 対象）、claude-ai/chatgpt は会話クライアント
export type CandidateSource = SessionSource | 'claude-ai' | 'chatgpt';

export interface KnowledgeCandidateInput {
  title: string;
  body: string;
  categories?: string[];
  memo_type_keys?: string[];
  confidence?: number;
  is_public?: boolean;
  projects?: Array<{ id: number; title?: string }>;
}

export interface PendingKnowledgeCandidate extends KnowledgeCandidateInput {
  id: string;
  session_id: string;
  source: CandidateSource;
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
  path?: string;
  processed_at: string;
  source_session_updated_at?: string;
}

export interface CapturePolicy {
  path: string | null;
  markdown: string;
  exists: boolean;
  updated_at: string | null;
}

export interface SessionSummary {
  session_id: string;
  source: SessionSource;
  path: string;
  cwd?: string;
  updated_at: string;
  message_count: number;
  processed: boolean;
}
