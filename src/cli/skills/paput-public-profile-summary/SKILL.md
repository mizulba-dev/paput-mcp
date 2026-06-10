---
name: paput-public-profile-summary
description: Use this to generate and save the user's PaPut public profile summary (headline, profile summary, strength labels) shown on the AI Summary tab to recruiters. Build it only from public materials such as the skill sheet, public memos and notes, and category and growth aggregates. Never use private dashboard analysis or goals.
---

# PaPut Public Profile Summary

Generate the public profile shown on the AI Summary tab: headline, profile_summary, and strength_labels. Use this skill when the user wants to create or refresh their public profile summary for recruiters or hiring managers.

## Workflow

1. Call `paput_get_public_profile_context`.
2. Generate the summary from the returned `structuredContent`.
3. Present the draft in the user's language and tone, and explain what each field will become.
4. Do not save unless the user explicitly asks to save it.
5. If the user asks to save, call `paput_update_skill_sheet_public_profile`.
6. Verify the saved result with `paput_get_skill_sheet`.

## Output

- headline: one-line catchphrase of what the person can do (~100 chars).
- profile_summary: 3-4 sentence overall summary written for a recruiter. Convey strengths and continuity in prose.
- strength_labels: top 3-5 strengths. Each has a label, an optional short description, and evidence via `category_names` and `project_ids`.

## Materials

Use only public materials returned by the context tool:

- Skill sheet (years_of_experience, skills, projects, self_pr)
- Public memos and notes
- Category distribution (`knowledge_map`) and recently growing areas (`growing_areas`)
- Representative projects and their AI summaries

## Rules

- Do not claim that paput-mcp generated the summary. The MCP client AI performs the generation.
- Use public materials only. Never use dashboard analysis or goals; they are private and for the user only.
- Do not present memo counts as skill proficiency. Activity volume is not mastery.
- Tie strengths to concrete memos or projects, and do not exaggerate.
- Keep the tone factual and suitable for a recruiter reading it in a short time.
- When saving, map the generated result to `headline`, `profile_summary`, and `strength_labels`.
