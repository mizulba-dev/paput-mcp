import { ApiClient } from '../../services/api/client.js';
import { addRemoteKnowledgeCandidates } from '../../services/api/knowledge-candidate.js';
import { searchMemos } from '../../services/api/memo.js';
import {
  CandidateSource,
  KnowledgeCandidateInput,
  SimilarMemo,
} from '../../types/knowledge.js';
import type { ToolContext } from '../../types/index.js';

// 重複とみなす類似スコア閾値（この値以上は自動除外）
const NEAR_DUPLICATE_SCORE = 0.9;
// RRF 融合順の window からベクトル近傍が漏れないよう契約上限まで取る。
const SIMILAR_MEMO_LIMIT = 50;

const CANDIDATE_SOURCES: readonly CandidateSource[] = [
  'claude',
  'codex',
  'claude-ai',
  'chatgpt',
];
// harvest の再処理防止台帳に載せるのはローカルセッションのみ
const LOCAL_SESSION_SOURCES: readonly CandidateSource[] = ['claude', 'codex'];

export async function handleAddKnowledgeCandidates(
  args: Record<string, unknown> | undefined,
  apiClient: ApiClient,
  context?: ToolContext,
) {
  const source = args?.source;
  if (
    !args ||
    typeof source !== 'string' ||
    !CANDIDATE_SOURCES.includes(source as CandidateSource)
  ) {
    return {
      content: [
        {
          type: 'text',
          text: `source must be one of ${CANDIDATE_SOURCES.join(', ')}`,
        },
      ],
      isError: true,
    };
  }

  const sessionId =
    typeof args.session_id === 'string' && args.session_id !== ''
      ? args.session_id
      : undefined;
  if (
    LOCAL_SESSION_SOURCES.includes(source as CandidateSource) &&
    sessionId === undefined
  ) {
    return {
      content: [
        {
          type: 'text',
          text: 'session_id is required when source is claude or codex',
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
      const projects = Array.isArray(rawCandidate.projects)
        ? rawCandidate.projects.filter(
            (project): project is { id: number; title?: string } =>
              typeof project === 'object' &&
              project !== null &&
              'id' in project &&
              typeof (project as { id: unknown }).id === 'number',
          )
        : undefined;

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
          projects,
        },
      ];
    },
  );

  return await addRemoteCandidates(
    args,
    apiClient,
    context,
    source as CandidateSource,
    sessionId,
    candidates,
  );
}

async function addRemoteCandidates(
  args: Record<string, unknown>,
  apiClient: ApiClient,
  context: ToolContext = {},
  source: CandidateSource,
  sessionId: string | undefined,
  candidates: KnowledgeCandidateInput[],
) {
  const contextProjects = await getContextProjects(context);

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
      projects:
        candidate.projects !== undefined ? candidate.projects : contextProjects,
      similar_memos: similarMemos,
    });
  }

  if (candidatesToAdd.length === 0) {
    const response = {
      added: 0,
      duplicates: semanticDuplicates.length,
      candidates: [],
      duplicate_details: semanticDuplicates,
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

  const result = await addRemoteKnowledgeCandidates(apiClient, {
    source,
    session_id: sessionId,
    source_session_updated_at:
      typeof args.source_session_updated_at === 'string'
        ? args.source_session_updated_at
        : undefined,
    candidates: candidatesToAdd,
  });

  const duplicateDetails = [
    ...semanticDuplicates,
    ...(result.duplicate_details ?? []),
  ];
  const response = {
    added: result.candidates.length,
    duplicates: duplicateDetails.length,
    candidates: result.candidates,
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

async function getContextProjects(
  context: ToolContext,
): Promise<Array<{ id: number; title?: string }>> {
  if (context.projectId) {
    return [{ id: context.projectId, title: context.projectTitle }];
  }

  if (!context.resolveProject) return [];

  // alias が解決できなくても候補追加自体は続行する（project 紐付けだけ落とす）。
  try {
    const resolved = await context.resolveProject();
    if (!resolved) return [];
    return [{ id: resolved.projectId, title: resolved.projectTitle }];
  } catch (error) {
    console.error('Failed to resolve project_alias for candidates:', error);
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
    const result = await searchMemos(apiClient, {
      query,
      limit: SIMILAR_MEMO_LIMIT,
    });
    if (!result.success || !result.memos) return [];

    return result.memos
      .filter(
        (memo): memo is typeof memo & { score: number } =>
          typeof memo.score === 'number',
      )
      .map((memo) => ({
        id: memo.id,
        title: memo.title,
        score: memo.score,
      }))
      .sort((a, b) => b.score - a.score);
  } catch (error) {
    console.error('Failed to find similar memos for candidate:', error);
    return [];
  }
}
