import { ApiClient } from '../../services/api/client.js';
import { updateSkillSheetPublicProfile } from '../../services/api/skill-sheet.js';
import type {
  UpdatePublicProfileParams,
  StrengthLabel,
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

        return label;
      })
      .filter((item) => item.label.length > 0);
  }

  return result;
}
