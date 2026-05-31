import { ApiClient } from '../../services/api/client.js';
import { updatePendingCandidate } from '../../services/local-cache/index.js';

export async function handleDiscardPendingCandidate(
  args: Record<string, unknown> | undefined,
  _apiClient: ApiClient,
) {
  if (!args || typeof args.candidate_id !== 'string') {
    return {
      content: [{ type: 'text', text: 'candidate_id は必須です' }],
      isError: true,
    };
  }

  const updated = updatePendingCandidate(args.candidate_id, (candidate) => ({
    ...candidate,
    status: 'discarded',
    discarded_reason: typeof args.reason === 'string' ? args.reason : undefined,
    updated_at: new Date().toISOString(),
  }));

  if (!updated) {
    return {
      content: [
        { type: 'text', text: '破棄対象の pending 候補が見つかりません' },
      ],
      isError: true,
    };
  }

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(
          {
            discarded: true,
            candidate_id: updated.id,
            title: updated.title,
          },
          null,
          2,
        ),
      },
    ],
  };
}
