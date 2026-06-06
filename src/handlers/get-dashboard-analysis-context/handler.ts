import { ApiClient } from '../../services/api/client.js';
import { getCategories } from '../../services/api/category.js';
import { getDashboardSummary } from '../../services/api/dashboard.js';
import { getDashboardAnalysis } from '../../services/api/dashboard-analysis.js';
import { listGoals } from '../../services/api/goal.js';
import { searchMemos } from '../../services/api/memo.js';
import { searchNotes } from '../../services/api/note.js';
import { getSkillSheet } from '../../services/api/skill-sheet.js';

const RECENT_ITEM_LIMIT = 20;

export async function handleGetDashboardAnalysisContext(
  _args: Record<string, unknown> | undefined,
  apiClient: ApiClient,
) {
  try {
    const [dashboardSummary, goals] = await Promise.all([
      getDashboardSummary(apiClient),
      listGoals(apiClient),
    ]);

    const [
      skillSheet,
      recentMemosResult,
      notesResult,
      categories,
      savedAnalysis,
    ] = await Promise.all([
      safeFetch(() => getSkillSheet(apiClient)),
      safeFetch(() =>
        searchMemos(apiClient, {
          page: 1,
          limit: RECENT_ITEM_LIMIT,
        }),
      ),
      safeFetch(() =>
        searchNotes(apiClient, {
          page: 1,
          limit: RECENT_ITEM_LIMIT,
        }),
      ),
      safeFetch(() => getCategories(apiClient)),
      safeFetch(() => getDashboardAnalysis(apiClient)),
    ]);

    const recentMemos =
      recentMemosResult && recentMemosResult.success
        ? recentMemosResult.memos || []
        : [];
    const notes =
      notesResult && notesResult.success ? notesResult.notes || [] : [];
    const prompt = buildPrompt({
      dashboardSummary,
      goals,
      recentMemoCount: recentMemos.length,
      noteCount: notes.length,
      categoryCount: categories?.length || 0,
      hasSkillSheet: Boolean(skillSheet),
      hasSavedAnalysis: Boolean(savedAnalysis),
    });

    return {
      structuredContent: {
        dashboard_summary: dashboardSummary,
        goals,
        skill_sheet: skillSheet,
        recent_memos: recentMemos,
        notes,
        categories: categories || [],
        saved_dashboard_analysis: savedAnalysis,
        prompt,
      },
      content: [
        {
          type: 'text',
          text: `Dashboard analysis context:
Dashboard summary: total memos ${dashboardSummary.total_memo_count}, total notes ${dashboardSummary.total_note_count}, recent memos ${dashboardSummary.recent_memo_count}, active days in last 30 days ${dashboardSummary.active_days_in_last_30_days}
Goals: ${goals.length}
Skill sheet: ${skillSheet ? 'available' : 'not available'}
Recent memos: ${recentMemos.length}
Notes: ${notes.length}
Categories: ${categories?.length || 0}
Saved dashboard analysis: ${savedAnalysis ? 'available' : 'not available'}

${prompt}`,
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
          text: `Error while fetching dashboard analysis context: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
}

async function safeFetch<T>(fetcher: () => Promise<T>): Promise<T | null> {
  try {
    return await fetcher();
  } catch {
    return null;
  }
}

function buildPrompt(context: {
  dashboardSummary: {
    total_memo_count: number;
    total_note_count: number;
    recent_memo_count: number;
    active_days_in_last_30_days: number;
  };
  goals: Array<{ id: number; title: string; status: string }>;
  recentMemoCount: number;
  noteCount: number;
  categoryCount: number;
  hasSkillSheet: boolean;
  hasSavedAnalysis: boolean;
}): string {
  const activeGoals = context.goals.filter((goal) => goal.status === 'active');
  const archivedGoals = context.goals.filter(
    (goal) => goal.status === 'archived',
  );

  return `Create a dashboard analysis as the MCP client AI, using the PaPut data in structuredContent. paput-mcp does not contain analysis logic, so you should read the source data and adapt the analysis to the user's goals and context. Write the final output in the user's language and match the user's tone when possible.

Assumptions:
- Do not recalculate dashboard continuity from activities. Use the summary values returned by the API.
- Treat active goals as the current basis for analysis and archived goals as historical context.
- Do not assume that the user should write memos next. Analyze how knowledge that naturally accumulates through daily development can grow toward the goals.
- If existing skill sheet or project AI summaries are available, use them as references for career-history phrasing.

Context summary:
- Total memo count: ${context.dashboardSummary.total_memo_count}
- Total note count: ${context.dashboardSummary.total_note_count}
- Recent memo count: ${context.dashboardSummary.recent_memo_count}
- Active days in the last 30 days: ${context.dashboardSummary.active_days_in_last_30_days}
- Active goals: ${activeGoals.length}
- Archived goals: ${archivedGoals.length}
- Retrieved recent memos: ${context.recentMemoCount}
- Retrieved notes: ${context.noteCount}
- Retrieved categories: ${context.categoryCount}
- Skill sheet: ${context.hasSkillSheet ? 'available' : 'not available'}
- Saved analysis: ${context.hasSavedAnalysis ? 'available' : 'not available'}

Include these analysis points:
1. The user's current position
2. Areas that can be presented as strengths
3. Areas that have been growing recently
4. Thin or underdeveloped areas
5. Knowledge missing against the user's goals
6. Knowledge the user should learn next
7. Phrasing that can be used in a skill sheet or career history

If saving the result, build values suitable for paput_update_dashboard_analysis: current_summary, strengths, growing_areas, weak_areas, next_knowledge_suggestions, and analyzed_at. strengths, growing_areas, and weak_areas should include title, description, category_names, memo_count, and goal_ids. next_knowledge_suggestions should include title, reason, priority, category_names, and goal_ids.`;
}
