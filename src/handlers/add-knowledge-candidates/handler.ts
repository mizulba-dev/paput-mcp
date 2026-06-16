import { ApiClient } from '../../services/api/client.js';
import { findSimilarMemos } from '../../services/api/memo.js';
import { addKnowledgeCandidates } from '../../services/local-cache/index.js';
import { resolveProjectsForCwd } from '../../services/project-match/index.js';
import { scanSessions } from '../../services/session/index.js';
import {
  KnowledgeCandidateInput,
  SessionSource,
  SimilarMemo,
} from '../../types/knowledge.js';

// 重複とみなす類似スコア閾値（この値以上は自動除外）
const NEAR_DUPLICATE_SCORE = 0.9;
const SIMILAR_MEMO_LIMIT = 5;

export async function handleAddKnowledgeCandidates(
  args: Record<string, unknown> | undefined,
  apiClient: ApiClient,
) {
  if (!args || typeof args.session_id !== 'string') {
    return {
      content: [{ type: 'text', text: 'session_id is required' }],
      isError: true,
    };
  }

  if (args.source !== 'claude' && args.source !== 'codex') {
    return {
      content: [
        {
          type: 'text',
          text: 'source must be claude or codex',
        },
      ],
      isError: true,
    };
  }

  if (!Array.isArray(args.candidates)) {
    return {
      content: [{ type: 'text', text: 'candidates must be an array' }],
      isError: true,
    };
  }

  const candidates = args.candidates.flatMap(
    (candidate): KnowledgeCandidateInput[] => {
      if (
        typeof candidate !== 'object' ||
        candidate === null ||
        !('title' in candidate) ||
        !('body' in candidate) ||
        typeof candidate.title !== 'string' ||
        typeof candidate.body !== 'string'
      ) {
        return [];
      }

      const rawCandidate = candidate as Record<string, unknown>;
      const categories = Array.isArray(rawCandidate.categories)
        ? rawCandidate.categories.filter(
            (category): category is string => typeof category === 'string',
          )
        : [];
      const memoTypeKeys = Array.isArray(rawCandidate.memo_type_keys)
        ? rawCandidate.memo_type_keys.filter(
            (key): key is string => typeof key === 'string',
          )
        : [];

      return [
        {
          title: candidate.title,
          body: candidate.body,
          categories,
          memo_type_keys: memoTypeKeys,
          confidence:
            typeof rawCandidate.confidence === 'number'
              ? rawCandidate.confidence
              : undefined,
          is_public:
            typeof rawCandidate.is_public === 'boolean'
              ? rawCandidate.is_public
              : false,
        },
      ];
    },
  );

  const source = args.source as SessionSource;
  const sourceSession = scanSessions([source], true).find(
    (session) => session.session_id === args.session_id,
  );
  const sourceSessionUpdatedAt = sourceSession?.updated_at;
  const projects = await resolveProjects(apiClient, sourceSession?.cwd);

  const semanticDuplicates: Array<{
    title: string;
    reason: string;
    similar_memos: SimilarMemo[];
  }> = [];
  const candidatesToAdd: Array<
    KnowledgeCandidateInput & { similar_memos: SimilarMemo[] }
  > = [];

  for (const candidate of candidates) {
    const similarMemos = await findSimilarMemosForCandidate(
      apiClient,
      candidate.title,
      candidate.body,
    );

    if (
      similarMemos.length > 0 &&
      similarMemos[0].score >= NEAR_DUPLICATE_SCORE
    ) {
      semanticDuplicates.push({
        title: candidate.title,
        reason: 'Semantically near-duplicate of an existing memo',
        similar_memos: similarMemos,
      });
      continue;
    }

    candidatesToAdd.push({
      ...candidate,
      projects,
      similar_memos: similarMemos,
    });
  }

  const result = addKnowledgeCandidates(
    source,
    args.session_id,
    candidatesToAdd,
    sourceSessionUpdatedAt,
  );

  const duplicateDetails = [...semanticDuplicates, ...result.duplicates];
  const response = {
    added: result.added.length,
    duplicates: duplicateDetails.length,
    candidates: result.added,
    duplicate_details: duplicateDetails,
  };

  return {
    structuredContent: response,
    content: [
      {
        type: 'text',
        text: JSON.stringify(response, null, 2),
      },
    ],
  };
}

async function resolveProjects(
  apiClient: ApiClient,
  cwd: string | undefined,
): Promise<Array<{ id: number; title?: string }>> {
  try {
    return await resolveProjectsForCwd(apiClient, cwd);
  } catch (error) {
    console.error('Failed to resolve projects for pending candidate:', error);
    return [];
  }
}

async function findSimilarMemosForCandidate(
  apiClient: ApiClient,
  title: string,
  body: string,
): Promise<SimilarMemo[]> {
  const query = `${title}\n${body.slice(0, 200)}`;
  try {
    const result = await findSimilarMemos(apiClient, {
      query,
      limit: SIMILAR_MEMO_LIMIT,
    });
    if (!result.success || !result.memos) return [];

    return result.memos.map((memo) => ({
      id: memo.id,
      title: memo.title,
      score: memo.score,
    }));
  } catch (error) {
    console.error('Failed to find similar memos for candidate:', error);
    return [];
  }
}
