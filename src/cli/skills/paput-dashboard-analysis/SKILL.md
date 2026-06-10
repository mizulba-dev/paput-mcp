---
name: paput-dashboard-analysis
description: Use this to analyze the user's PaPut dashboard, goals, skill sheet, memos, notes, and categories; identify current position, strengths, growing areas, thin areas, missing knowledge, next knowledge to learn, and career-history phrasing; optionally save the generated dashboard analysis when the user asks to save it.
---

# PaPut Dashboard Analysis

Analyze the user's PaPut dashboard and goals. Use this skill when the user asks about dashboard analysis, goals, progress, strengths, weak areas, next learning topics, or career-history phrasing.

## Workflow

1. Call `paput_get_dashboard_analysis_context`.
2. Analyze the returned `structuredContent`.
3. Present the analysis in the user's language and tone.
4. Do not save the result unless the user explicitly asks to save it.
5. If the user asks to save, call `paput_update_dashboard_analysis`.

## Analysis Points

Include these points when relevant:

- Current position
- Areas that can be presented as strengths
- Areas that have been growing recently
- Thin or underdeveloped areas
- Knowledge missing against active goals
- Knowledge to learn next
- Phrasing suitable for a skill sheet or career history

## Rules

- Do not claim that paput-mcp generated the analysis. The MCP client AI performs the analysis.
- Use active goals as the main analysis basis.
- Treat archived goals as historical context.
- Do not recalculate dashboard continuity from activities. Use the dashboard summary values returned by the API.
- Do not assume the user should write memos next.
- Focus on how knowledge naturally accumulated through daily development can grow toward the user's goals.
- When saving, map the generated result to:
  - `current_summary`
  - `strengths`
  - `growing_areas`
  - `weak_areas`
  - `next_knowledge_suggestions`
  - `analyzed_at`
