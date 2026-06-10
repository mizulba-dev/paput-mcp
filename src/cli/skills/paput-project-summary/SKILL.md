---
name: paput-project-summary
description: Use this to generate and optionally save an AI summary for a PaPut skill sheet project from the project information and memos linked to that project. Trigger when the user asks to summarize project-linked memos, create a project summary, refresh a skill sheet project AI summary, or save a project summary.
---

# PaPut Project Summary

Generate an AI summary for a skill sheet project from the project information and the memos linked to that project.

## Workflow

1. Identify the target project ID.
   - If the user gives a project ID, use it.
   - If the user gives a project name, call `paput_get_skill_sheet` and choose the matching project.
   - If the user does not specify a project, call `paput_get_skill_sheet`, show concise project candidates, and ask the user to choose one.
   - Ask a concise clarification only when no project is specified or the match is ambiguous.
2. Call `paput_get_skill_sheet_project_summary_context` with `project_id`.
3. Generate a concise project summary from the returned `structuredContent`.
4. Present the draft in the user's language and tone.
5. Do not save unless the user explicitly asks to save, update, or apply the summary.
6. If the user asks to save, call `paput_update_skill_sheet_project_ai_summary`.
7. Verify the saved result with `paput_get_skill_sheet`.

## Summary Focus

Include these points when the source material supports them:

- Project purpose and domain
- User role and responsibilities
- Main technologies and processes
- Notable implementation, design, or problem-solving work
- Reusable strengths shown by linked memos
- Outcome or impact, without inventing metrics

## Rules

- Do not claim that paput-mcp generated the summary. The MCP client AI performs the generation.
- Base the summary only on the project context and linked memo bodies returned by the context tool.
- Do not use unrelated memos, private goals, or dashboard analysis.
- Do not treat memo count as proof of proficiency.
- Do not invent technologies, responsibilities, impact, dates, or team scale.
- If the linked memos are thin, say what is missing instead of overstating the project.
- Keep the summary suitable for a skill sheet or career history.
- This summary is for the skill sheet project detail. It is different from the shorter `project_highlights` used on the public AI Summary tab.
