---
description: Use this to analyze the user's PaPut dashboard, goals, skill sheet, memos, notes, and categories. Read the user through the judgment axis — the thickness of their decision / operation / principle memos — not raw volume or category counts; identify current position, strengths, thin axes, what to learn next, and career-history phrasing; optionally save the generated dashboard analysis when the user asks to save it.
---

# PaPut Dashboard Analysis

Analyze the user's PaPut dashboard and goals. Use this skill when the user asks about dashboard analysis, goals, progress, strengths, weak areas, next learning topics, or career-history phrasing.

Read the user through the JUDGMENT axis, not raw volume. The durable, hard-to-commoditize part of what they accumulate is their judgment and practice — captured as `memo_type`: `decision` (judgment criteria), `operation` (operating practices), `principle` (stated principles). `knowledge` is commodity. `structuredContent.dashboard_summary.memo_type_counts` holds the per-type accumulation; assess the user by how thick those three durable axes are, with categories as a secondary lens for the domains they work in.

The judgment axis is the LENS, not a replacement for goal analysis. The dashboard's core job is "where am I against my goals", so keep goals first-class: read each active goal THROUGH the axis — which judgment/practice/principle axis that goal requires, and whether that axis is currently thick or thin. Do not drop the goal overview in favor of axis-only talk.

## Workflow

1. Call `paput_get_dashboard_analysis_context`.
2. Analyze the returned `structuredContent`.
3. Present the analysis in the user's language and tone.
4. Do not save the result unless the user explicitly asks to save it.
5. If the user asks to save, call `paput_update_dashboard_analysis`.

## Analysis Points

Include these points when relevant, read through the decision / operation / principle axes:

- Current position — which judgment axes are thick, which are thin (from `memo_type_counts`), AND a goal overview: name the active goals and, for each, the judgment/practice/principle axis it requires and whether that axis is currently thick or thin. The `current_summary` must keep this goal overview, not just axis talk.
- Strengths — the judgment criteria and operating practices the user has accumulated (decision / operation / principle), with the domains (categories) they show up in as supporting context. knowledge alone is not a strength.
- Areas that have been growing recently.
- Thin or underdeveloped axes — name the thin memo_type (e.g. principle is thin) and what that means, not just thin categories.
- Gaps against active goals — for each active goal, the judgment axis it needs that is still thin (e.g. "G2 needs principle, which is the thinnest axis"). This is the goal-alignment view; tie it to `goal_ids`.
- What to do next to thicken the thin durable axis the goals require (e.g. distill recurring decisions into principles, capture operating practices / eval / review as operation), rather than just "learn more". Link each suggestion to the goal it serves via `goal_ids`.
- Phrasing suitable for a skill sheet or career history.

## Rules

- Do not claim that paput-mcp generated the analysis. The MCP client AI performs the analysis.
- Use active goals as the main analysis basis.
- Treat archived goals as historical context.
- Do not recalculate dashboard continuity from activities. Use the dashboard summary values returned by the API.
- Frame current position, strengths, and thin areas by decision / operation / principle thickness — not by how many memos or categories accumulated. Use categories as a secondary lens for the domains, not the main axis.
- Keep goals first-class. The `current_summary` must include a goal overview (the active goals, and for each the judgment axis it requires and whether it is thick or thin). At least one `weak_areas` item and the `next_knowledge_suggestions` must connect a thin axis to the goal it blocks, via `goal_ids`. The axis is the lens for goal alignment, not a replacement for it.
- `knowledge`-type memos are commodity. Do not present knowledge volume as a strength on its own.
- When the thin axis is `principle` or `operation`, say so plainly and make the next step about thickening it (distilling decisions into principles, capturing eval / observability / review as operation).
- In each saved item's `description`, speak in the judgment/practice/principle axis (which memo_type backs the strength, which type is thin). The output fields are unchanged; the axis is carried in the wording.
- `category_names` must be EXACT names the user actually uses — take them from `structuredContent.dashboard_summary.category_item_counts` (the user's own categories), falling back to `structuredContent.categories` (the global list) only for exact spelling. DO populate them with the real categories that genuinely apply to the item (e.g. a deployment/observability strength should list the user's actual categories like Datadog / OpenSearch / ECS when present) — do not default to empty when real matches exist. Only leave `category_names` empty when none of the user's categories match. Never invent, translate, or paraphrase a category name (e.g. do not write a translated or made-up label like "Observability" or "CI/Build Infrastructure" when that exact string is not in those lists); an empty list is better than an approximate name.
- When saving, map the generated result to:
  - `current_summary`
  - `strengths`
  - `growing_areas`
  - `weak_areas`
  - `next_knowledge_suggestions`
  - `analyzed_at`
