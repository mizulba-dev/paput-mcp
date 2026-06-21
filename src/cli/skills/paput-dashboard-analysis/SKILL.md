---
name: paput-dashboard-analysis
description: Use this to analyze the user's PaPut dashboard, goals, skill sheet, memos, notes, and categories. Read the user through the judgment axis — the thickness of their decision / operation / principle memos — not raw volume or category counts; identify current position, strengths, thin axes, what to learn next, and career-history phrasing; optionally save the generated dashboard analysis when the user asks to save it.
---

# PaPut Dashboard Analysis

Analyze the user's PaPut dashboard and goals. Use this skill when the user asks about dashboard analysis, goals, progress, strengths, weak areas, next learning topics, or career-history phrasing.

Read the user through the JUDGMENT axis, not raw volume. The durable, hard-to-commoditize part of what they accumulate is their judgment and practice — captured as `memo_type`: `decision` (judgment criteria), `operation` (operating practices), `principle` (stated stances). `knowledge` is commodity. `structuredContent.dashboard_summary.memo_type_counts` holds the per-type accumulation; assess the user by how thick those three durable axes are, with categories as a secondary lens for the domains they work in.

## Workflow

1. Call `paput_get_dashboard_analysis_context`.
2. Analyze the returned `structuredContent`.
3. Present the analysis in the user's language and tone.
4. Do not save the result unless the user explicitly asks to save it.
5. If the user asks to save, call `paput_update_dashboard_analysis`.

## Analysis Points

Include these points when relevant, read through the decision / operation / principle axes:

- Current position — which judgment axes are thick, which are thin (from `memo_type_counts`).
- Strengths — the judgment criteria and operating practices the user has accumulated (decision / operation / principle), with the domains (categories) they show up in as supporting context. knowledge alone is not a strength.
- Areas that have been growing recently.
- Thin or underdeveloped axes — name the thin memo_type (e.g. principle is thin) and what that means, not just thin categories.
- Knowledge missing against active goals.
- What to do next to thicken the thin durable axis (e.g. distill recurring decisions into principles, capture operating practices / eval / review as operation), rather than just "learn more".
- Phrasing suitable for a skill sheet or career history.

## Rules

- Do not claim that paput-mcp generated the analysis. The MCP client AI performs the analysis.
- Use active goals as the main analysis basis.
- Treat archived goals as historical context.
- Do not recalculate dashboard continuity from activities. Use the dashboard summary values returned by the API.
- Frame current position, strengths, and thin areas by decision / operation / principle thickness — not by how many memos or categories accumulated. Use categories as a secondary lens for the domains, not the main axis.
- `knowledge`-type memos are commodity. Do not present knowledge volume as a strength on its own.
- When the thin axis is `principle` or `operation`, say so plainly and make the next step about thickening it (distilling decisions into principles, capturing eval / observability / review as operation).
- In each saved item's `description`, speak in the judgment/practice/principle axis (which memo_type backs the strength, which type is thin). The output fields are unchanged; the axis is carried in the wording.
- `category_names` must be EXACT names the user actually uses — take them from `structuredContent.dashboard_summary.category_item_counts` (the user's own categories), falling back to `structuredContent.categories` (the global list) only for exact spelling. Do not invent, translate, or paraphrase category names (e.g. do not write "可観測性" or "CI/開発基盤" if they are not in those lists). If no listed category matches the item, leave `category_names` empty — categories are a secondary lens, so an empty list is fine and better than an approximate name.
- When saving, map the generated result to:
  - `current_summary`
  - `strengths`
  - `growing_areas`
  - `weak_areas`
  - `next_knowledge_suggestions`
  - `analyzed_at`
