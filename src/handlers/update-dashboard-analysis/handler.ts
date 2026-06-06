import { ApiClient } from '../../services/api/client.js';
import { updateDashboardAnalysis } from '../../services/api/dashboard-analysis.js';
import type {
  DashboardAnalysisItem,
  DashboardAnalysisSuggestion,
  UpdateDashboardAnalysisParams,
} from '../../types/index.js';

export async function handleUpdateDashboardAnalysis(
  args: Record<string, unknown> | undefined,
  apiClient: ApiClient,
) {
  const params = parseParams(args);
  if (!params) {
    return {
      content: [
        {
          type: 'text',
          text: 'Current summary and analyzed_at are required.',
        },
      ],
      isError: true,
    };
  }

  try {
    const analysis = await updateDashboardAnalysis(apiClient, params);

    return {
      structuredContent: {
        success: true,
        dashboard_analysis: analysis,
      },
      content: [
        {
          type: 'text',
          text: `Dashboard analysis was updated. ID: ${analysis.id}`,
        },
      ],
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';

    return {
      content: [
        {
          type: 'text',
          text: `Error while updating dashboard analysis: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
}

function parseParams(
  args: Record<string, unknown> | undefined,
): UpdateDashboardAnalysisParams | null {
  if (
    !args ||
    typeof args.current_summary !== 'string' ||
    typeof args.analyzed_at !== 'string'
  ) {
    return null;
  }

  return {
    current_summary: args.current_summary,
    strengths: parseItems(args.strengths),
    growing_areas: parseItems(args.growing_areas),
    weak_areas: parseItems(args.weak_areas),
    next_knowledge_suggestions: parseSuggestions(
      args.next_knowledge_suggestions,
    ),
    analyzed_at: args.analyzed_at,
  };
}

function parseItems(value: unknown): DashboardAnalysisItem[] {
  if (!Array.isArray(value)) return [];

  return value.filter(isRecord).map((item) => ({
    title: typeof item.title === 'string' ? item.title : '',
    description: typeof item.description === 'string' ? item.description : '',
    category_names: parseStringArray(item.category_names),
    memo_count: typeof item.memo_count === 'number' ? item.memo_count : null,
    goal_ids: parseNumberArray(item.goal_ids),
  }));
}

function parseSuggestions(value: unknown): DashboardAnalysisSuggestion[] {
  if (!Array.isArray(value)) return [];

  return value.filter(isRecord).map((suggestion) => ({
    title: typeof suggestion.title === 'string' ? suggestion.title : '',
    reason: typeof suggestion.reason === 'string' ? suggestion.reason : '',
    priority: typeof suggestion.priority === 'number' ? suggestion.priority : 1,
    category_names: parseStringArray(suggestion.category_names),
    goal_ids: parseNumberArray(suggestion.goal_ids),
  }));
}

function parseStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
}

function parseNumberArray(value: unknown): number[] {
  return Array.isArray(value)
    ? value.filter((item): item is number => typeof item === 'number')
    : [];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
