import { ApiClient } from '../../services/api/client.js';
import { getPublicProfileContext } from '../../services/api/skill-sheet.js';

export async function handleGetPublicProfileContext(
  _args: Record<string, unknown> | undefined,
  apiClient: ApiClient,
) {
  try {
    const context = await getPublicProfileContext(apiClient);
    const skillSheet = context.skill_sheet;
    const yearsOfExperience = skillSheet?.years_of_experience ?? 0;
    const projectCount = skillSheet?.projects?.length ?? 0;
    const strengthCount = skillSheet?.strength_labels?.length ?? 0;
    const growingCount = Array.isArray(context.growing_areas)
      ? context.growing_areas.length
      : 0;
    const summaryMemoCount = Array.isArray(context.public_summary_memos)
      ? context.public_summary_memos.length
      : 0;

    const prompt = buildPrompt({
      yearsOfExperience,
      projectCount,
      strengthCount,
      growingCount,
      summaryMemoCount,
      hasProfileSummary: Boolean(skillSheet?.profile_summary),
    });

    return {
      structuredContent: {
        ...context,
        prompt,
      },
      content: [
        {
          type: 'text',
          text: `Public profile context:
Years of experience: ${yearsOfExperience}
Projects: ${projectCount}
Existing strength labels: ${strengthCount}
Growing areas: ${growingCount}
Public summary memos (index): ${summaryMemoCount}
Existing profile summary: ${skillSheet?.profile_summary ? 'available' : 'not available'}

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
          text: `Error while fetching public profile context: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
}

function buildPrompt(context: {
  yearsOfExperience: number;
  projectCount: number;
  strengthCount: number;
  growingCount: number;
  summaryMemoCount: number;
  hasProfileSummary: boolean;
}): string {
  return `Generate a public AI summary as the MCP client AI, using the PaPut data in structuredContent plus the memo bodies you fetch on demand. This summary is shown on the AI Summary tab to recruiters and hiring managers. paput-mcp does not contain generation logic, so read the source data and write the summary yourself. Write the final output in the user's language and match the user's tone when possible.

Use public materials only. The structuredContent intentionally excludes private dashboard analysis and goals. Never infer or reference them.

structuredContent.public_summary_memos is an index of ALL the person's PUBLIC decision / operation / principle memos (id, title, memo_types, updated_at) — these are the primary material for "how the person thinks and works". The index has no bodies; fetch the bodies of the relevant ones with paput_get_memo.
- The index is already public-only and already filtered to the summary-material types, so you do not need paput_search_memo for this. Do not use paput_search_memo here.
- Read the index, pick the memos most relevant to the headline and strengths, and fetch their bodies with paput_get_memo. There is no fixed limit; the index is the full set.
- If the index is empty, say so and base the summary on the skill sheet, knowledge_map, and growing_areas alone, noting that judgment/operation/principle material is thin.

Produce these fields:
1. headline: a one-line catchphrase of what the person can do (around 100 characters).
2. profile_summary: a 3-4 sentence overall summary written for a recruiter. Ground it in the judgment, operating practices, and principles visible in the fetched decision/operation/principle memo bodies, not just a list of technologies.
3. strength_labels: the top 3-5 strengths. Each has a label, an optional short description, and evidence via category_names and project_ids drawn from the context and the fetched memos.

Guidance:
- Tie strengths to concrete projects and the fetched public memos. Do not exaggerate.
- Do not present memo counts as skill proficiency. Activity volume is not mastery.
- Use the category map (knowledge_map) and growing_areas to describe what the person works on, not as ability scores.
- Keep the tone factual and easy to read in a short time.

Context summary:
- Years of experience: ${context.yearsOfExperience}
- Projects: ${context.projectCount}
- Existing strength labels: ${context.strengthCount}
- Growing areas: ${context.growingCount}
- Public summary memos in index: ${context.summaryMemoCount}
- Existing profile summary: ${context.hasProfileSummary ? 'available' : 'not available'}

Present the draft to the user first. Only when the user asks to save, call paput_update_skill_sheet_public_profile with headline, profile_summary, and strength_labels, then verify with paput_get_skill_sheet.`;
}
