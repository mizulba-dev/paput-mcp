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
      content: [{ type: 'text', text: 'candidate_id は必須です' }],
      isError: true,
    };
  }

  const candidate = readCache().pending.find(
    (item) => item.id === args.candidate_id && item.status === 'pending',
  );
  if (!candidate) {
    return {
      content: [
        { type: 'text', text: '保存対象の pending 候補が見つかりません' },
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

  const params: CreateMemoParams = {
    title,
    body,
    is_public:
      typeof args.is_public === 'boolean'
        ? args.is_public
        : (candidate.is_public ?? false),
    created_at: createdAt,
    categories: categories.map((name) => ({ name })),
  };
  const result = await createMemo(apiClient, params);

  if (!result.success) {
    return {
      content: [
        {
          type: 'text',
          text: `知見候補の保存に失敗しました: ${result.error || '不明なエラー'}`,
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
    is_public: params.is_public,
    status: 'saved',
    fingerprint: createFingerprint(title, body),
    saved_memo_id: savedMemo?.id,
    updated_at: new Date().toISOString(),
  }));

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(
          {
            saved: true,
            candidate_id: updated?.id,
            memo_id: savedMemo?.id || null,
            title,
          },
          null,
          2,
        ),
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
