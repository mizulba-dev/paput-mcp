import { ApiClient } from './client.js';
import type {
  CapturePolicy,
  KnowledgeCandidateInput,
  PendingKnowledgeCandidate,
  ProcessedSession,
  SessionSource,
} from '../../types/knowledge.js';

export interface AddKnowledgeCandidatesRemoteParams {
  source: SessionSource;
  session_id: string;
  source_session_updated_at?: string;
  candidates: Array<
    KnowledgeCandidateInput & {
      similar_memos?: Array<{ id: number; title: string; score: number }>;
    }
  >;
}

export interface AddKnowledgeCandidatesRemoteResponse {
  added: number;
  duplicates: number;
  candidates: PendingKnowledgeCandidate[];
  duplicate_details: Array<{
    title: string;
    reason: string;
    candidate_id?: string;
    similar_memos?: Array<{ id: number; title: string; score: number }>;
  }>;
}

export interface ListKnowledgeCandidatesRemoteResponse {
  count: number;
  candidates: PendingKnowledgeCandidate[];
}

export interface DiscardPolicyContextRemoteResponse {
  policy: CapturePolicy;
  total_discarded_count: number;
  returned_discarded_count: number;
  discarded_candidates: PendingKnowledgeCandidate[];
}

export interface ProcessedSessionsRemoteResponse {
  sessions: ProcessedSession[];
}

export async function addRemoteKnowledgeCandidates(
  client: ApiClient,
  params: AddKnowledgeCandidatesRemoteParams,
): Promise<AddKnowledgeCandidatesRemoteResponse> {
  return client.post<AddKnowledgeCandidatesRemoteResponse>(
    '/api/v1/mcp/knowledge-candidates',
    params,
  );
}

export async function listRemoteKnowledgeCandidates(
  client: ApiClient,
  params: { status?: string; limit?: number } = {},
): Promise<ListKnowledgeCandidatesRemoteResponse> {
  const queryParams = new URLSearchParams();
  if (params.status) queryParams.append('status', params.status);
  if (params.limit) queryParams.append('limit', String(params.limit));
  const suffix = queryParams.toString() ? `?${queryParams.toString()}` : '';
  return client.get<ListKnowledgeCandidatesRemoteResponse>(
    `/api/v1/mcp/knowledge-candidates${suffix}`,
  );
}

export async function getRemoteKnowledgeCandidate(
  client: ApiClient,
  candidateId: string,
): Promise<PendingKnowledgeCandidate> {
  return client.get<PendingKnowledgeCandidate>(
    `/api/v1/mcp/knowledge-candidate/${encodeURIComponent(candidateId)}`,
  );
}

export async function updateRemoteKnowledgeCandidate(
  client: ApiClient,
  params: Record<string, unknown>,
): Promise<{ updated: boolean; candidate: PendingKnowledgeCandidate }> {
  return client.put<{ updated: boolean; candidate: PendingKnowledgeCandidate }>(
    '/api/v1/mcp/knowledge-candidate',
    params,
  );
}

export async function saveRemoteKnowledgeCandidate(
  client: ApiClient,
  params: Record<string, unknown>,
): Promise<{
  success: boolean;
  action: 'saved';
  candidate_id: string;
  memo_id: number | null;
  title: string;
  candidate: PendingKnowledgeCandidate;
}> {
  return client.put(
    '/api/v1/mcp/knowledge-candidate/save',
    params,
  );
}

export async function discardRemoteKnowledgeCandidate(
  client: ApiClient,
  params: { candidate_id: string; reason?: string },
): Promise<{
  discarded: boolean;
  candidate_id: string;
  title: string;
  candidate: PendingKnowledgeCandidate;
}> {
  return client.put(
    '/api/v1/mcp/knowledge-candidate/discard',
    params,
  );
}

export async function getRemoteCapturePolicy(
  client: ApiClient,
): Promise<CapturePolicy> {
  return client.get<CapturePolicy>('/api/v1/mcp/capture-policy');
}

export async function updateRemoteCapturePolicy(
  client: ApiClient,
  markdown: string,
): Promise<CapturePolicy> {
  return client.put<CapturePolicy>('/api/v1/mcp/capture-policy', {
    markdown,
  });
}

export async function getRemoteDiscardPolicyContext(
  client: ApiClient,
  limit?: number,
): Promise<DiscardPolicyContextRemoteResponse> {
  const suffix = limit ? `?limit=${encodeURIComponent(String(limit))}` : '';
  return client.get<DiscardPolicyContextRemoteResponse>(
    `/api/v1/mcp/discard-policy-context${suffix}`,
  );
}

export async function listRemoteProcessedSessions(
  client: ApiClient,
  source?: SessionSource,
): Promise<ProcessedSessionsRemoteResponse> {
  const suffix = source ? `?source=${encodeURIComponent(source)}` : '';
  return client.get<ProcessedSessionsRemoteResponse>(
    `/api/v1/mcp/processed-sessions${suffix}`,
  );
}

export async function markRemoteProcessedSession(
  client: ApiClient,
  params: {
    source: SessionSource;
    session_id: string;
    source_session_updated_at?: string;
  },
): Promise<ProcessedSession> {
  return client.post<ProcessedSession>('/api/v1/mcp/processed-sessions', params);
}
