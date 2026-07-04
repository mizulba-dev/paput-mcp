import { ApiClient } from '../../services/api/client.js';
import { updateSkillSheetFaq } from '../../services/api/skill-sheet.js';
import type { SkillSheetFaqItemInput } from '../../types/index.js';

export async function handler(
  params: Record<string, unknown> | undefined,
  apiClient: ApiClient,
): Promise<Record<string, unknown>> {
  const parsed = parseParams(params);
  if (!parsed) {
    return {
      content: [
        {
          type: 'text',
          text: 'A valid faq array is required',
        },
      ],
      isError: true,
    };
  }

  const result = await updateSkillSheetFaq(apiClient, parsed.faq);

  const droppedIds = result.faq.flatMap((item) => item.dropped_ids ?? []);
  const warnings: string[] = [];

  if (droppedIds.length > 0) {
    warnings.push(
      `Dropped related memo IDs: ${Array.from(new Set(droppedIds)).join(', ')}`,
    );
  }

  return {
    structuredContent: {
      success: true,
      faq: result.faq,
      warnings,
    },
    content: [
      {
        type: 'text',
        text: [
          'FAQ was updated.',
          `Saved items: ${result.faq.length}`,
          ...warnings,
        ].join('\n'),
      },
    ],
  };
}

function parseParams(
  params: Record<string, unknown> | undefined,
): { faq: SkillSheetFaqItemInput[] } | undefined {
  if (!params || !Array.isArray(params.faq) || params.faq.length > 15) {
    return undefined;
  }

  const faq = params.faq.map(parseFaqItem);
  if (faq.some((item) => !item)) {
    return undefined;
  }

  return { faq: faq as SkillSheetFaqItemInput[] };
}

function parseFaqItem(value: unknown): SkillSheetFaqItemInput | undefined {
  if (typeof value !== 'object' || value === null) {
    return undefined;
  }

  const itemInput = value as Record<string, unknown>;
  if (
    typeof itemInput.question !== 'string' ||
    itemInput.question.trim().length === 0 ||
    itemInput.question.length > 200
  ) {
    return undefined;
  }

  if (
    typeof itemInput.answer !== 'string' ||
    itemInput.answer.trim().length === 0 ||
    itemInput.answer.length > 2000
  ) {
    return undefined;
  }

  const item: SkillSheetFaqItemInput = {
    question: itemInput.question.trim(),
    answer: itemInput.answer.trim(),
  };

  if (typeof itemInput.theme === 'string') {
    if (itemInput.theme.length > 40) {
      return undefined;
    }
    item.theme = itemInput.theme.trim();
  }

  if (itemInput.related_memo_ids !== undefined) {
    if (!Array.isArray(itemInput.related_memo_ids)) {
      return undefined;
    }

    const relatedMemoIds = itemInput.related_memo_ids.filter(
      (id): id is number =>
        typeof id === 'number' && Number.isInteger(id) && id > 0,
    );
    if (relatedMemoIds.length !== itemInput.related_memo_ids.length) {
      return undefined;
    }

    item.related_memo_ids = relatedMemoIds;
  }

  return item;
}
