---
description: Use this to draft and optionally save design-and-judgment episodes for a PaPut skill sheet project from the project's public linked memos. Trigger when the user asks to generate, refresh, or save project episodes, project judgment episodes, or the "design and judgment" section for a skill sheet project.
---

# PaPut Project Episodes

Draft project episodes for the skill sheet project detail page. Episodes explain what the user chose, what they rejected, and why, backed by public linked memos.

## Workflow

1. Identify the target project ID.
   - If the user gives a project ID, use it.
   - If the user gives a project name, call `paput_get_skill_sheet` and choose the matching project.
   - If the user does not specify a project, call `paput_get_skill_sheet`, show concise project candidates, and ask the user to choose one.
   - Ask a concise clarification only when no project is specified or the match is ambiguous.
2. Call `paput_get_skill_sheet_project_episodes_context` with `project_id`.
3. Read `structuredContent.public_memos` and cluster the public linked memos by decision or operating-practice theme.
4. Draft 2-3 episodes when the material supports them. Generate fewer, or none, when the public memos are thin.
5. Present the draft in the user's language and tone, together with the achievements draft (see "Achievements Draft" below). Explain that each episode will become the project's "design and judgment" section.
6. Do not save unless the user explicitly asks to save, update, or apply the episodes.
7. If the user asks to save, call `paput_update_skill_sheet_project_episodes` with the approved `project_id` and `episodes`.
8. Report any `dropped_ids` from the save response. If a saved episode has no resolved public supporting memos, tell the user it may be hidden on the public profile.
9. Verify the saved result with `paput_get_skill_sheet`.

## Episode Shape

Each episode has:

- `claim`: one visible lead line. Use recruiter/interviewer-level vocabulary and preserve the meaningful contrast when the source supports it: what was chosen over what was rejected.
- `situation`: 1-2 sentences describing the context.
- `decision`: 1-2 sentences describing the choice.
- `reason`: 1-2 sentences explaining why that choice was made.
- `supporting_memo_ids`: one or more public linked memo IDs returned by the context tool.

## Material Rules

- Use only `structuredContent.public_memos` from `paput_get_skill_sheet_project_episodes_context` as episode evidence.
- Private linked memos are returned only as `private_memo_count`. Do not infer claims from private memo bodies.
- Prefer `decision` and `operation` memos. Use `knowledge` memos only as background.
- Do not use unrelated memos, goals, private dashboard analysis, or project documents as episode evidence.
- Do not invent memo IDs, technologies, responsibilities, impact, dates, or team scale.
- Do not treat memo count as proof of ability.
- If public linked memos do not support a claim, drop the claim.
- If the material is thin, say what is missing and suggest capturing or publishing better project-linked decision/operation memos.

## Achievements Draft (always propose)

Always propose an `achievements` draft alongside the episodes draft: 3-5 factual bullets (max 100 characters each, max 10 total) describing what was built and is running, grounded in the project description and public linked memos.

- Achievements are user-owned source material, not generated evidence. Present them as a draft for the user to edit and approve, and keep them factual: no judgment narrative (that belongs to episodes) and no invented metrics.
- Use `paput_upsert_skill_sheet_project` to save achievements only after explicit approval. Saving episodes and saving achievements are separate tool calls; the user may approve one and not the other.
- Omit `achievements` when calling `paput_upsert_skill_sheet_project` if the user wants to keep existing bullets. Pass `achievements: []` only when the user explicitly wants to clear them.

## Rules

- Do not claim that paput-mcp generated the episodes. The MCP client AI performs the drafting.
- Do not save a draft automatically.
- Every saved episode must have at least one `supporting_memo_id`.
- The public API filters supporting memo IDs to the user's own public memos. Dropped IDs mean the evidence was not public, not owned, or unavailable.
- Keep the tone factual and suitable for a skill sheet or career history.
