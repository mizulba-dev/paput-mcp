---
name: paput-public-profile-summary
description: Use this to generate and save the user's PaPut public profile summary (headline, profile summary, strength labels, and representative project highlights) shown on the AI Summary tab to recruiters. Build it only from public materials such as the skill sheet, public memos and notes, and category and growth aggregates. Never use private dashboard analysis or goals.
---

# PaPut Public Profile Summary

Generate the public profile shown on the AI Summary tab: headline, profile_summary, strength_labels, and project_highlights. Use this skill when the user wants to create or refresh their public profile summary for recruiters or hiring managers.

## Workflow

1. Call `paput_get_public_profile_context`. It returns the skill sheet, `knowledge_map`, `growing_areas`, and `public_summary_memos` — an index (id, title, memo_types, updated_at; no bodies) of ALL the person's PUBLIC `decision` / `operation` / `principle` memos. This index is the primary material for "how the person thinks and works".
2. Read the `public_summary_memos` index, pick the memos most relevant to the headline and strengths, and fetch their bodies with `paput_get_memo`.
   - The index is already public-only and already filtered to the summary-material types, so do NOT use `paput_search_memo` here.
   - There is no fixed limit; the index is the full set. Fetch as many bodies as you need for a grounded summary.
   - If the index is empty, base the summary on the skill sheet, `knowledge_map`, and `growing_areas` alone, and note that judgment/operation/principle material is thin.
3. Generate the summary from the context plus the fetched memo bodies.
4. Present the draft in the user's language and tone, including `headline`, `profile_summary`, `strength_labels`, and `project_highlights`. Explain what each field will become.
5. Do not save unless the user explicitly asks to save it.
6. If the user asks to save, call `paput_update_skill_sheet_public_profile`.
7. Verify the saved result with `paput_get_skill_sheet`.

## Output

- headline: concise one-line catchphrase for the AI Summary hero. In Japanese, aim for 45-65 chars and keep it under 80 chars. In other languages, keep it similarly compact.
- profile_summary: 3-4 sentence overall summary written for a recruiter. Convey strengths and continuity in prose.
- strength_labels: top 3-5 strengths. Each has a label, an optional short description, and evidence via `category_names` and `project_ids`.
- project_highlights: required when the context contains at least one project with enough material. Include up to 2-3 representative public-profile project highlights. Each has `project_id`, `title`, `summary` (120-200 Japanese chars or similarly concise in the user's language), optional `strength_labels`, and up to 3 `achievement_bullets`.

## Materials

Use only public materials:

- Skill sheet (years_of_experience, skills, projects, self_pr) from the context tool
- The `public_summary_memos` index (all public `decision` / `operation` / `principle` memos) from the context tool, with bodies fetched via `paput_get_memo` (the primary material for judgment, operating practices, and principles)
- Category distribution (`knowledge_map`) and recently growing areas (`growing_areas`) from the context tool
- Representative projects and their AI summaries from the context tool

## Rules

- Do not claim that paput-mcp generated the summary. The MCP client AI performs the generation.
- Use public materials only. Never use dashboard analysis or goals; they are private and for the user only.
- Do not present memo counts as skill proficiency. Activity volume is not mastery.
- Tie strengths to concrete memos or projects, and do not exaggerate.
- Keep `headline` focused on the role and core value proposition. Do not pack every major technology, domain, lifecycle phase, and AI/MCP detail into it.
- Prefer a readable headline such as `Go・TypeScript・AWSを軸に、AI/MCPまで設計・実装するフルスタックエンジニア` over a long comma-separated inventory.
- Move supporting details from an overlong `headline` into `profile_summary`, `strength_labels`, and `project_highlights`.
- Generate the `headline`, `profile_summary`, and `strength_labels` first, then select `project_highlights` as evidence that supports that headline and those strengths.
- If project material exists, always include `project_highlights` in the draft. Do not ask the user whether to add them.
- Do not list every project. Choose only the 2-3 projects that most strongly justify the generated headline and `strength_labels`.
- If no project has enough material, set `project_highlights` to an empty array and briefly explain why.
- Rewrite project highlights for the public AI Summary tab. Do not copy detailed project AI summaries verbatim.
- Treat project_highlights as evidence for the headline/profile strengths, not as a full skill sheet project history.
- Keep the tone factual and suitable for a recruiter reading it in a short time.
- When saving, map the generated result to `headline`, `profile_summary`, `strength_labels`, and `project_highlights`.
