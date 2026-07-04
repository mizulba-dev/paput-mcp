import { ApiClient } from '../../services/api/client.js';
import { updateSkillSheetProjectEpisodes } from '../../services/api/skill-sheet.js';
import type { SkillSheetProjectEpisode } from '../../types/index.js';

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
          text: 'Project ID and a valid episodes array are required',
        },
      ],
      isError: true,
    };
  }

  const result = await updateSkillSheetProjectEpisodes(
    apiClient,
    parsed.projectId,
    parsed.episodes,
  );

  const droppedIds = result.episodes.flatMap(
    (episode) => episode.dropped_ids ?? [],
  );
  const unresolvedCount = result.episodes.filter(
    (episode) => (episode.supporting_memos ?? []).length === 0,
  ).length;
  const warnings: string[] = [];

  if (droppedIds.length > 0) {
    warnings.push(
      `Dropped supporting memo IDs: ${Array.from(new Set(droppedIds)).join(', ')}`,
    );
  }
  if (unresolvedCount > 0) {
    warnings.push(
      `${unresolvedCount} episode(s) have no resolved public supporting memos and may be hidden on the public profile.`,
    );
  }

  return {
    structuredContent: {
      success: true,
      project_id: result.project_id,
      episodes: result.episodes,
      episodes_updated_at: result.episodes_updated_at,
      warnings,
    },
    content: [
      {
        type: 'text',
        text: [
          `Project episodes were updated for project ID ${result.project_id}.`,
          `Saved episodes: ${result.episodes.length}`,
          ...warnings,
        ].join('\n'),
      },
    ],
  };
}

function parseParams(
  params: Record<string, unknown> | undefined,
): { projectId: number; episodes: SkillSheetProjectEpisode[] } | undefined {
  if (
    !params ||
    typeof params.project_id !== 'number' ||
    !Number.isInteger(params.project_id) ||
    params.project_id <= 0 ||
    !Array.isArray(params.episodes) ||
    params.episodes.length > 5
  ) {
    return undefined;
  }

  const episodes = params.episodes.map(parseEpisode);
  if (episodes.some((episode) => !episode)) {
    return undefined;
  }

  return {
    projectId: params.project_id,
    episodes: episodes as SkillSheetProjectEpisode[],
  };
}

function parseEpisode(value: unknown): SkillSheetProjectEpisode | undefined {
  if (typeof value !== 'object' || value === null) {
    return undefined;
  }

  const episodeInput = value as Record<string, unknown>;
  if (
    typeof episodeInput.claim !== 'string' ||
    episodeInput.claim.trim().length === 0 ||
    episodeInput.claim.length > 200
  ) {
    return undefined;
  }

  const supportingMemoIds = parseSupportingMemoIds(
    episodeInput.supporting_memo_ids,
  );
  if (!supportingMemoIds) {
    return undefined;
  }

  const episode: SkillSheetProjectEpisode = {
    claim: episodeInput.claim.trim(),
    supporting_memo_ids: supportingMemoIds,
  };

  for (const key of ['situation', 'decision', 'reason'] as const) {
    const value = episodeInput[key];
    if (typeof value === 'string') {
      if (value.length > 1000) {
        return undefined;
      }
      episode[key] = value.trim();
    }
  }

  return episode;
}

function parseSupportingMemoIds(value: unknown): number[] | undefined {
  if (!Array.isArray(value) || value.length === 0) {
    return undefined;
  }

  const ids = value.filter(
    (id): id is number =>
      typeof id === 'number' && Number.isInteger(id) && id > 0,
  );

  return ids.length === value.length ? ids : undefined;
}
