import { ApiClient } from '../../services/api/client.js';
import { createMemo, searchMemos } from '../../services/api/memo.js';
import {
  createFingerprint,
  readCache,
  updatePendingCandidate,
} from '../../services/local-cache/index.js';
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

  const candidate = readCache().pending.find(
    (item) => item.id === args.candidate_id && item.status === 'pending',
  );
  if (!candidate) {
    return {
      content: [
        { type: 'text', text: 'Pending candidate to save was not found' },
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
  const result = await createMemo(apiClient, params);

  if (!result.success) {
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

  const savedMemo = await findSavedMemo(apiClient, title, body);

  const updated = updatePendingCandidate(candidate.id, (item) => ({
    ...item,
    title,
    body,
    categories,
    memo_type_keys: memoTypeKeys,
    projects,
    is_public: params.is_public,
    status: 'saved',
    fingerprint: createFingerprint(title, body),
    saved_memo_id: savedMemo?.id,
    updated_at: new Date().toISOString(),
  }));

  const response = {
    success: true,
    action: 'saved',
    candidate_id: updated?.id,
    memo_id: savedMemo?.id || null,
    title,
    created_at: createdAt,
    created_at_source: createdAtSource,
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

async function findSavedMemo(
  apiClient: ApiClient,
  title: string,
  body: string,
) {
  const result = await searchMemos(apiClient, { word: title, limit: 10 });
  if (!result.success || !result.memos) return undefined;
  const fingerprint = createFingerprint(title, body);
  return result.memos.find(
    (memo) => createFingerprint(memo.title, memo.body) === fingerprint,
  );
}
