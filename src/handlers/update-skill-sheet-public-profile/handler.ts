import { ApiClient } from '../../services/api/client.js';
import { updateSkillSheetPublicProfile } from '../../services/api/skill-sheet.js';
import type {
  ProjectHighlight,
  UpdatePublicProfileParams,
  StrengthLabel,
  Stance,
} from '../../types/index.js';

export async function handler(
  params: Record<string, unknown> | undefined,
  apiClient: ApiClient,
): Promise<Record<string, unknown>> {
  const publicProfile = parsePublicProfileParams(params);
  await updateSkillSheetPublicProfile(apiClient, publicProfile);

  return {
    structuredContent: {
      success: true,
      action: 'updated',
      headline: publicProfile.headline ?? null,
      profile_summary: publicProfile.profile_summary ?? null,
      strength_labels: publicProfile.strength_labels ?? null,
      project_highlights: publicProfile.project_highlights ?? null,
      stances: publicProfile.stances ?? null,
    },
    content: [
      {
        type: 'text',
        text: 'Public profile was updated',
      },
    ],
  };
}

function parsePublicProfileParams(
  params: Record<string, unknown> | undefined,
): UpdatePublicProfileParams {
  if (!params) {
    return {};
  }

  const result: UpdatePublicProfileParams = {};

  if (typeof params.headline === 'string') {
    result.headline = params.headline;
  }

  if (typeof params.profile_summary === 'string') {
    result.profile_summary = params.profile_summary;
  }

  if (Array.isArray(params.strength_labels)) {
    result.strength_labels = params.strength_labels
      .filter(
        (item): item is Record<string, unknown> =>
          typeof item === 'object' && item !== null,
      )
      .map((item): StrengthLabel => {
        const label: StrengthLabel = {
          label: typeof item.label === 'string' ? item.label : '',
        };

        if (typeof item.description === 'string') {
          label.description = item.description;
        }

        if (
          Array.isArray(item.category_names) &&
          item.category_names.every((n) => typeof n === 'string')
        ) {
          label.category_names = item.category_names as string[];
        }

        if (
          Array.isArray(item.project_ids) &&
          item.project_ids.every((id) => typeof id === 'string')
        ) {
          label.project_ids = item.project_ids as string[];
        }

        const supportingMemoIds = parseMemoIds(item.supporting_memo_ids);
        if (supportingMemoIds.length > 0) {
          label.supporting_memo_ids = supportingMemoIds;
        }

        return label;
      })
      .filter((item) => item.label.length > 0);
  }

  if (Array.isArray(params.stances)) {
    result.stances = params.stances
      .filter(
        (item): item is Record<string, unknown> =>
          typeof item === 'object' && item !== null,
      )
      .map((item): Stance => {
        const stance: Stance = {
          type: item.type === 'operation' ? 'operation' : 'decision',
          statement: typeof item.statement === 'string' ? item.statement : '',
        };

        const supportingMemoIds = parseMemoIds(item.supporting_memo_ids);
        if (supportingMemoIds.length > 0) {
          stance.supporting_memo_ids = supportingMemoIds;
        }

        return stance;
      })
      .filter(
        (item) =>
          item.statement.length > 0 &&
          (item.type === 'decision' || item.type === 'operation'),
      );
  }

  if (Array.isArray(params.project_highlights)) {
    result.project_highlights = params.project_highlights
      .filter(
        (item): item is Record<string, unknown> =>
          typeof item === 'object' && item !== null,
      )
      .map((item): ProjectHighlight => {
        const highlight: ProjectHighlight = {
          project_id:
            typeof item.project_id === 'string' ? item.project_id : '',
          title: typeof item.title === 'string' ? item.title : '',
          summary: typeof item.summary === 'string' ? item.summary : '',
        };

        if (
          Array.isArray(item.strength_labels) &&
          item.strength_labels.every((label) => typeof label === 'string')
        ) {
          highlight.strength_labels = item.strength_labels as string[];
        }

        if (
          Array.isArray(item.achievement_bullets) &&
          item.achievement_bullets.every((bullet) => typeof bullet === 'string')
        ) {
          highlight.achievement_bullets = item.achievement_bullets as string[];
        }

        return highlight;
      })
      .filter(
        (item) =>
          item.project_id.length > 0 &&
          item.title.length > 0 &&
          item.summary.length > 0,
      );
  }

  return result;
}

function parseMemoIds(value: unknown): number[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter(
    (id): id is number =>
      typeof id === 'number' && Number.isInteger(id) && id > 0,
  );
}
