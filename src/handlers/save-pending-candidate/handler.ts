import { ApiClient } from '../../services/api/client.js';
import {
  getRemoteKnowledgeCandidate,
  saveRemoteKnowledgeCandidate,
} from '../../services/api/knowledge-candidate.js';
import { createMemo } from '../../services/api/memo.js';
import { CreateMemoParams } from '../../types/index.js';

export async function handleSavePendingCandidate(
  args: Record<string, unknown> | undefined,
  apiClient: ApiClient,
) {
  if (!args || typeof args.candidate_id !== 'string') {
    return {
      content: [{ type: 'text', text: 'candidate_id is required' }],
      isError: true,
    };
  }

  return await saveRemoteCandidate(args, apiClient);
}

async function saveRemoteCandidate(
  args: Record<string, unknown>,
  apiClient: ApiClient,
) {
  const candidate = await getRemoteKnowledgeCandidate(
    apiClient,
    args.candidate_id as string,
  );
  const suppliedMemoId =
    typeof args.saved_memo_id === 'number' ? args.saved_memo_id : undefined;
  if (candidate.status !== 'pending') {
    if (
      candidate.status === 'saved' &&
      suppliedMemoId !== undefined &&
      candidate.saved_memo_id === suppliedMemoId
    ) {
      const response = {
        success: true,
        action: 'saved',
        candidate_id: candidate.id,
        memo_id: suppliedMemoId,
        title: candidate.title,
        created_at: candidate.created_at,
        created_at_source: 'saved_candidate',
        used_existing_memo: true,
        warnings: [],
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

    return {
      content: [
        {
          type: 'text',
          text: `Only pending candidates can be saved (current status: ${candidate.status})`,
        },
      ],
      isError: true,
    };
  }

  const title = typeof args.title === 'string' ? args.title : candidate.title;
  const body = typeof args.body === 'string' ? args.body : candidate.body;
  const categories = Array.isArray(args.categories)
    ? args.categories.filter(
        (category): category is string => typeof category === 'string',
      )
    : candidate.categories || [];
  const explicitCreatedAt =
    typeof args.created_at === 'string' ? args.created_at : undefined;
  const sourceSessionUpdatedAt =
    typeof candidate.source_session_updated_at === 'string'
      ? candidate.source_session_updated_at
      : undefined;
  const createdAt =
    explicitCreatedAt ?? sourceSessionUpdatedAt ?? candidate.created_at;
  const createdAtSource = explicitCreatedAt
    ? 'argument'
    : sourceSessionUpdatedAt
      ? 'source_session_updated_at'
      : 'pending_created_at';
  const projects = Array.isArray(args.projects)
    ? args.projects.filter(
        (project): project is { id: number; title?: string } =>
          typeof project === 'object' &&
          project !== null &&
          'id' in project &&
          typeof project.id === 'number',
      )
    : candidate.projects || [];
  const memoTypeKeys = Array.isArray(args.memo_type_keys)
    ? args.memo_type_keys.filter(
        (key): key is string => typeof key === 'string',
      )
    : candidate.memo_type_keys || [];

  const params: CreateMemoParams = {
    title,
    body,
    is_public:
      typeof args.is_public === 'boolean'
        ? args.is_public
        : (candidate.is_public ?? false),
    created_at: createdAt,
    categories: categories.map((name) => ({ name })),
    memo_type_keys: memoTypeKeys,
    projects,
  };
  let memoId = suppliedMemoId;

  if (memoId === undefined) {
    const result = await createMemo(apiClient, params);

    if (!result.success || result.id === undefined) {
      return {
        content: [
          {
            type: 'text',
            text: `Failed to save knowledge candidate: ${result.error || 'Unknown error'}`,
          },
        ],
        isError: true,
      };
    }

    memoId = result.id;
  }

  let updated: Awaited<ReturnType<typeof saveRemoteKnowledgeCandidate>>;
  try {
    updated = await saveRemoteKnowledgeCandidate(apiClient, {
      candidate_id: candidate.id,
      title,
      body,
      categories,
      memo_type_keys: memoTypeKeys,
      projects,
      is_public: params.is_public,
      saved_memo_id: memoId,
      created_at: createdAt,
    });
  } catch (error) {
    const response = {
      success: false,
      action: 'save_candidate_failed_after_memo_created',
      candidate_id: candidate.id,
      memo_id: memoId,
      title,
      error: error instanceof Error ? error.message : 'Unknown error',
      retry_args: {
        candidate_id: candidate.id,
        saved_memo_id: memoId,
      },
    };

    return {
      structuredContent: response,
      content: [
        {
          type: 'text',
          text: JSON.stringify(response, null, 2),
        },
      ],
      isError: true,
    };
  }

  const response = {
    success: true,
    action: 'saved',
    candidate_id: updated.candidate_id,
    memo_id: memoId ?? updated.memo_id ?? null,
    title,
    created_at: createdAt,
    created_at_source: createdAtSource,
    used_existing_memo: suppliedMemoId !== undefined,
    warnings:
      createdAtSource === 'pending_created_at'
        ? [
            'source_session_updated_at was not available; used pending candidate created_at',
          ]
        : [],
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
