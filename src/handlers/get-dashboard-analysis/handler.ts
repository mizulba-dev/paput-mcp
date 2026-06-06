import { ApiClient } from '../../services/api/client.js';
import { getDashboardAnalysis } from '../../services/api/dashboard-analysis.js';

export async function handleGetDashboardAnalysis(
  _args: Record<string, unknown> | undefined,
  apiClient: ApiClient,
) {
  try {
    const analysis = await getDashboardAnalysis(apiClient);

    if (!analysis) {
      return {
        structuredContent: {
          dashboard_analysis: null,
        },
        content: [
          {
            type: 'text',
            text: 'Dashboard analysis has not been saved yet.',
          },
        ],
      };
    }

    return {
      structuredContent: {
        dashboard_analysis: analysis,
      },
      content: [
        {
          type: 'text',
          text: `Dashboard analysis:
Analyzed at: ${analysis.analyzed_at}
Current summary:
${analysis.current_summary}

Strengths: ${analysis.strengths.length}
Growing areas: ${analysis.growing_areas.length}
Weak areas: ${analysis.weak_areas.length}
Next knowledge suggestions: ${analysis.next_knowledge_suggestions.length}`,
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
          text: `Error while fetching dashboard analysis: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
}
