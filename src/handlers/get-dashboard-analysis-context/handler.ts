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
      memoTypeCounts: dashboardSummary.memo_type_counts || [],
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
  memoTypeCounts: Array<{ key: string; count: number }>;
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

  const countOf = (key: string): number =>
    context.memoTypeCounts.find((entry) => entry.key === key)?.count ?? 0;
  const memoTypeLine = `decision ${countOf('decision')}, operation ${countOf('operation')}, principle ${countOf('principle')}, knowledge ${countOf('knowledge')}`;

  return `Create a dashboard analysis as the MCP client AI, using the PaPut data in structuredContent. paput-mcp does not contain analysis logic, so you should read the source data and adapt the analysis to the user's goals and context. Write the final output in the user's language and match the user's tone when possible.

Lead with the judgment axis, not raw volume. The durable, hard-to-commoditize part of what the user accumulates is their JUDGMENT and PRACTICE — captured as memo_type: decision (judgment criteria), operation (operating practices: observability, eval, testing, review), and principle (stated stances). knowledge is commodity. So assess the user by how thick those three axes are, not by how many memos or categories they have. structuredContent.dashboard_summary.memo_type_counts holds the per-type accumulation.

Assumptions:
- Do not recalculate dashboard continuity from activities. Use the summary values returned by the API.
- Treat active goals as the current basis for analysis and archived goals as historical context.
- Frame current position, strengths, and thin areas in terms of decision / operation / principle thickness — not "how much knowledge has accumulated". Categories describe the domains the user works in; use them as a secondary lens, not the main axis. knowledge is commodity and is not a strength on its own.
- If existing skill sheet or project AI summaries are available, use them as references for career-history phrasing.

Context summary:
- Memo type accumulation (the main axis): ${memoTypeLine}
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
1. The user's current position, read through the judgment/practice/principle axes (which axes are thick, which are thin).
2. Strengths — the judgment criteria and operating practices the user has accumulated (decision / operation / principle), with the domains (categories) they show up in as supporting context.
3. Areas that have been growing recently.
4. Thin or underdeveloped axes — name the memo_type that is thin (e.g. principle is thin) and what that means, not just thin categories.
5. Knowledge missing against the user's goals.
6. What to do next to thicken the thin durable axis (e.g. distill recurring decisions into principles, capture operating practices), rather than just "learn more".
7. Phrasing that can be used in a skill sheet or career history.

If saving the result, build values suitable for paput_update_dashboard_analysis: current_summary, strengths, growing_areas, weak_areas, next_knowledge_suggestions, and analyzed_at. strengths, growing_areas, and weak_areas should include title, description, category_names, memo_count, and goal_ids — and in each description speak in the judgment/practice/principle axis (e.g. which memo_type backs the strength, which type is thin). next_knowledge_suggestions should include title, reason, priority, category_names, and goal_ids.
category_names must be EXACT names the user actually uses — take them from structuredContent.dashboard_summary.category_item_counts (the user's own categories), falling back to structuredContent.categories (the global list) only for exact spelling. Do not invent, translate, or paraphrase category names. If no listed category matches the item, leave category_names empty; categories are a secondary lens, so an empty list is better than an approximate name.`;
}
