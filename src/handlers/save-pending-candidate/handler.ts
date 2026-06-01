import { ApiClient } from '../../services/api/client.js';
import { createMemo, searchMemos } from '../../services/api/memo.js';
import {
  createFingerprint,
  readCache,
  toCachedMemo,
  updatePendingCandidate,
  upsertCachedMemos,
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
  const createdAt =
    typeof args.created_at === 'string'
      ? args.created_at
      : candidate.source_session_updated_at;
  const projects = Array.isArray(args.projects)
    ? args.projects.filter(
        (project): project is { id: number; title?: string } =>
          typeof project === 'object' &&
          project !== null &&
          'id' in project &&
          typeof project.id === 'number',
      )
    : candidate.projects || [];

  const params: CreateMemoParams = {
    title,
    body,
    is_public:
      typeof args.is_public === 'boolean'
        ? args.is_public
        : (candidate.is_public ?? false),
    created_at: createdAt,
    categories: categories.map((name) => ({ name })),
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
  if (savedMemo) {
    upsertCachedMemos([toCachedMemo(savedMemo)]);
  }

  const updated = updatePendingCandidate(candidate.id, (item) => ({
    ...item,
    title,
    body,
    categories,
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
