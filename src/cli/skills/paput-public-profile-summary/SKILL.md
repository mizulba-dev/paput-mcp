---
name: paput-public-profile-summary
description: Use this to generate and save the user's PaPut public profile summary shown on the AI Summary tab to recruiters. The lead is stances (the judgment-and-operating-practices ◆ lines synthesized from public decision/operation memos), backed by drill-down evidence memos; headline, profile summary, strength labels, and project highlights are the supporting layers. Build it only from public materials such as the skill sheet, public memos and notes, and category and growth aggregates. Never use private dashboard analysis or goals.
---

# PaPut Public Profile Summary

Generate the public profile shown on the AI Summary tab. The lead of the page is `stances` — short ◆ lines that express how the person judges and operates, synthesized from their public `decision` / `operation` memos and backed by evidence memos a recruiter can open. `headline`, `profile_summary`, `strength_labels`, and `project_highlights` are the supporting layers around that lead. Use this skill when the user wants to create or refresh their public profile summary for recruiters or hiring managers.

## Workflow

1. Call `paput_get_public_profile_context`. It returns the skill sheet, `knowledge_map`, `growing_areas`, and `public_summary_memos` — an index (id, title, memo_types, updated_at; no bodies) of ALL the person's PUBLIC `decision` / `operation` / `principle` memos. This index is the primary material for "how the person thinks and works".
2. Read the `public_summary_memos` index and fetch the bodies of the relevant memos with `paput_get_memo`.
   - The index is already public-only and already filtered to the summary-material types, so do NOT use `paput_search_memo` here.
   - There is no fixed limit; the index is the full set. Fetch as many bodies as you need for a grounded summary.
   - If the index is empty, base the summary on the skill sheet, `knowledge_map`, and `growing_areas` alone, set `stances` to an empty array, and note that judgment/operation/principle material is thin.
3. Synthesize `stances` (the lead of the page):
   - Cluster the fetched `decision` / `operation` memos by theme. Turn each cluster into one `stance` whose `statement` is a SINGLE recruiter-altitude line at the level of a posture, not an implementation note.
   - Write the `statement` as ONE clause: the posture plus what it chooses over what it rejects. Aim for roughly 40-70 Japanese chars. Do NOT pack two or three concrete techniques into the line. Example — good: `セキュリティは fail-closed と多層防御を既定にし、表層的な対症対応は却下する`. Too low / too dense (avoid): `url ではなく http_url で javascript: を弾き、削除も所有者条件をクエリに残し、レート制限は TOCTOU を原子化…`. The concrete techniques belong in the drill-down evidence memos, NOT in the statement.
   - Keep about **3 decision and 3 operation stances (6 total, hard cap ~8)**. If clusters overlap, MERGE them into one stance rather than emitting near-duplicate lines. Pick the strongest, most distinctive postures.
   - Stances are the JUDGMENT/PRACTICE axis. Keep them distinct from `strength_labels` (the skill/what-they-can-do axis). Do not restate a strength as a stance, and avoid leaning a stance and a strength on the same memos — give each its own best evidence.
   - Dissolve `principle` into the wording of the stances; do not emit a separate principle section.
   - For each stance, set `supporting_memo_ids` to the public memo IDs from the index that back it (these become the drill-down judgment cards, where the concrete techniques live). Drop any stance you cannot back with at least one public memo ID.
4. Generate the supporting layers (`headline`, `profile_summary`, `strength_labels`, `project_highlights`) from the context plus the fetched memo bodies. For each `strength_label`, set `supporting_memo_ids` to the public memo IDs that back it where available.
5. Present the draft in the user's language and tone. Lead with the `stances`, then the supporting layers. Explain what each field will become.
6. Do not save unless the user explicitly asks to save it.
7. If the user asks to save, call `paput_update_skill_sheet_public_profile`.
8. Verify the saved result with `paput_get_skill_sheet`.

## Output

- stances (the lead): about 3 `decision` and 3 `operation` stances (6 total, hard cap ~8). Each has `type`, a single-clause `statement` (~40-70 Japanese chars) stating the posture and what it chooses over what it rejects — principle dissolved into the wording, concrete techniques left to the drill-down — and `supporting_memo_ids` (public memo IDs backing it). This is the main material the AI Summary tab leads with.
- headline: concise one-line catchphrase for the AI Summary hero, demoted to a thin intro. In Japanese, aim for 45-65 chars and keep it under 80 chars. In other languages, keep it similarly compact.
- profile_summary: a thin 2-3 sentence intro layer for a recruiter. Convey the role and overall posture in prose; do not enumerate techniques here — the stances carry the detail. Keep it lighter than the stances, not denser.
- strength_labels: top 3-5 strengths. Each has a label, an optional short description, evidence via `category_names` and `project_ids`, and `supporting_memo_ids` (public memo IDs backing the strength) where available.
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
- Drop any claim you cannot back with public material. Every stance must have at least one public memo ID in `supporting_memo_ids`; if a stance or strength has no public-memo backing, do not emit it.
- `knowledge`-type memos are commodity. Do not build stances from them; stances come from `decision` / `operation` (with `principle` dissolved in).
- Use only public memo IDs from the `public_summary_memos` index for `supporting_memo_ids`. The server drops any ID that is not the user's own public memo, so do not pad with guesses.
- Keep each `statement` to one clause at recruiter altitude (the posture and what it chooses over what it rejects). Never pack two or three concrete techniques or specific identifiers into a statement — those belong in the drill-down evidence memos. A recruiter must grasp the line in one read.
- Cap stances at about 6 (hard cap ~8). Merge overlapping clusters instead of emitting near-duplicate lines. Fewer, sharper stances beat many dense ones.
- Keep `stances` (judgment/practice) and `strength_labels` (skill axis) distinct: do not restate the same theme in both, and avoid backing a stance and a strength with the same memos. If a theme appears in both, keep it as a stance and let the strength cover a different angle.
- Keep `profile_summary` lighter than the stances. It is a thin intro, not a second, denser pass of the same detail.
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
- When saving, map the generated result to `stances`, `headline`, `profile_summary`, `strength_labels`, and `project_highlights`. `stances` is the lead; the others are supporting layers.
