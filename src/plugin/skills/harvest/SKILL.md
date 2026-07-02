---
description: Use this to harvest reusable knowledge from past local Claude/Codex sessions when the AI client can read local files. Safe to run repeatedly — it skips already-processed sessions and only reviews new ones — so use it both for first-time onboarding and for periodic catch-up. Pay special attention to AI-collaboration practices and stances (operation / principle), the scarce, durable axis.
---

# PaPut Harvest

Harvest reusable knowledge from past local AI sessions into pending candidates.

This skill is for local-file-capable AI clients such as Claude Code or Codex.
PaPut MCP does not read local session files. The AI client reads the session
files directly, then uses PaPut MCP only to check processed-session markers and
add or mark reviewed sessions.

Run it whenever you want — it is idempotent. It checks which sessions are already
processed and reviews only the new ones, so the first run doubles as onboarding
(nothing is processed yet, so it surveys your history) and later runs are
periodic catch-up. There is no separate "init" step.

## Steps

1. Get processed sessions with `paput_list_processed_sessions`.
2. Find local session files the AI client can access:
   - Claude: `~/.claude/projects/**/*.jsonl`
   - Codex: `~/.codex/sessions/**/*.jsonl`
3. For each file, derive:
   - `source`: `claude` or `codex`
   - `session_id`: file basename without `.jsonl`
   - `source_session_updated_at`: file modified time in ISO 8601 format
4. Skip sessions already returned by `paput_list_processed_sessions`.
5. Report the count and a short summary of unprocessed sessions to the user.
6. Only when the user wants it, read the relevant session transcript directly
   from the JSONL file and create candidates that meet the extraction criteria.
   While reading, actively look for the AI-collaboration axis and the
   user-prompt axis (see Extraction Criteria) in addition to ordinary technical
   knowledge — they are easy to miss because they show up as how the work was
   directed, not as the work itself.
7. Before adding candidates with `paput_add_knowledge_candidates`, check that
   they do not contain project-specific specifications, implementation details,
   operational rules, code, customer data, or secrets. Duplicate checks against
   existing memos run automatically inside `paput_add_knowledge_candidates`
   using semantic search.
8. If reusable candidates exist, call `paput_add_knowledge_candidates` with
   `source`, `session_id`, `source_session_updated_at`, and the candidates.
   Set `memo_type_keys` on each candidate (see Memo Type below); classify
   AI-collaboration practices as `operation` and stances as `principle`.
9. If the session was reviewed but no candidates should be added, call
   `paput_mark_processed_session` with `source`, `session_id`, and
   `source_session_updated_at`.
10. Briefly report added candidates, duplicates, rejected candidates, and
    sessions marked as processed.

## JSONL Parsing Guide

When reading session files, extract user and assistant messages only.

Claude session lines commonly have:

- `type`: `user` or `assistant`
- `message.role`: `user` or `assistant`
- `message.content`: string or content blocks such as `{ "type": "text", "text": "..." }`
- `cwd`, `message.cwd`, or `payload.cwd` may exist as local context, but do not
  save local paths or project-specific details as knowledge.

Codex session lines commonly have:

- `type`: `response_item`
- `payload.type`: `message`
- `payload.role`: `user` or `assistant`
- `payload.content`: content blocks such as `input_text`, `output_text`, or `text`
- `payload.cwd` may exist as local context, but do not save local paths or
  project-specific details as knowledge.

Read only what is needed. If the session is large, inspect metadata and relevant
tail sections first, then ask before reading more.

## Extraction Criteria

Only add technical knowledge, decision criteria, and procedures that can be reused in other projects.

### Capture the AI-collaboration axis

Reusable AI-collaboration practices and stances are first-class material here —
they are the scarcest, most durable axis and are easy to discard by mistake.
Capture them as `operation` (practice) or `principle` (stance). Examples:

- How you structure a task or spec so an AI implements it correctly.
- Your review discipline for AI-generated changes — where you always verify
  versus where you trust the output.
- When you delegate to an AI versus do it yourself.
- How you decompose work for parallel agents, or recover when an AI goes wrong.

The test: would this still hold with a different AI tool, on a different
project, for someone else to learn? If yes, capture it as `operation` or
`principle`, generalized one level above the specific session. If it is only
about this tool's mechanics or this one session's events, exclude it.

### Capture the eval / observability axis

Eval, observability, and measurement practices are another scarce, durable
`operation` sub-axis that is easy to lose — they show up as how the work was
measured and watched, not as the work itself. When a session touched
measurement, evaluation, monitoring, alerting, test strategy, SLO / SLI,
threshold or pass-fail tuning, or incident review, capture the reusable practice
as `operation` (or `principle` for a stance, `decision` for an adopt/reject
criterion). Look for:

- What was measured and why that signal; how signal was separated from noise.
- How a threshold or pass-fail was decided — by feel or by offline evaluation.
- What is watched in production and where alerts sit, and why there.
- What a failure or false positive changed in the judgment.

Generalize above the project (drop service / metric / dashboard names, keep the
criterion and verification). A bare "added monitoring" or "wrote tests" with no
rationale or verification is a work log — exclude it. This is a lens for
capturing methodology, not a reason to log routine test/monitoring chores.

### Capture the user-prompt axis

The user's own prompts are first-party evidence of judgment. They often expose
how the user corrected the AI, declared constraints, repeated a desired
procedure, or chose among options before the final artifact exists. When reading
sessions, inspect user prompts as a scarce signal, not just as task input. Look
for:

- Correction / course-correction: where the user rejected or corrected the AI's
  output and gave a reason. This is the strongest material for `operation` or
  `principle`.
- Declared constraint / prohibition: "do not ..." or "always ..." style
  instructions. When the same constraint recurs across projects, treat it as
  `principle` material.
- Repeated boilerplate instruction: nearly the same request appearing again and
  again. If it is project-specific, try to save it as a `procedure` with
  `paput_add_project_document` so that repeated registrations are counted toward
  a server-side skill proposal; in a single harvest run, it is fine to try each
  repeated occurrence as it appears.
  If it is cross-project, capture the practice as `operation` in pending.
- Choice among AI-presented options: the user accepted, rejected, or combined
  options the AI presented and explained why. This is `decision` material.

Generalize above the prompt: keep the judgment, constraint, or repeatable
procedure; drop local paths, project names, customer details, and exact task
facts. Short verbatim phrasing from the user may be preserved for authenticity,
but pending candidates must not include sensitive or project-specific content. A
one-off "fix this" or "run tests" instruction is a work log — exclude it unless
the prompt reveals a reusable judgment criterion, operating practice, or
procedure. Route project-specific repeated instructions to project documents
(`procedure`, Check 1); route cross-project practices and stances to pending
candidates (Check 2).

### Do not add these to pending

- Project-specific specifications, screen names, button names, business workflows, operational rules, or local context.
- One-off tool mechanics or configuration: editor / OS / CLI settings, keybindings, which button was clicked, model- or version-specific quirks, project-specific CI wiring, or anecdotes about a single session (for example, "the AI got confused here"). These are commodity even when they mention AI tools — capture the reusable practice or stance instead, not the mechanics.
- Content that third parties cannot understand from the title and body alone.
- Rejected designs, anecdotes, work logs, impressions, or decision histories without reusable guidance.
- Content semantically close to existing memos or pending candidates.
- Generic security, authorization, or tenant-isolation notes when similar knowledge already exists.
- Code fragments or project-specific naming that has not been generalized.

When unsure, do not add the candidate. Report that there is no knowledge to save or that the candidate was rejected.

## Memo Type

Classify each candidate with one or more memo types via `memo_type_keys`:

- `decision`: reusable judgment criteria independent of any project.
- `operation`: operating practices — observability, eval, testing, review, and how you direct and verify AI collaboration.
- `principle`: a stance you have explicitly stated, generalized above individual decisions, including stances on how to work with AI.
- `knowledge`: commodity technical know-how, usage, or implementation knowledge.

`decision` / `operation` / `principle` are the primary material for the public
AI summary and the principle synthesizer; `knowledge` usually is not. Prefer the
durable types when they fit, and do not force a type when none does.

Tagging review — do not under-label. The default failure mode is dropping a
judgment memo into `knowledge` and missing `decision` / `operation` /
`principle`; this is a main reason the `principle` axis stays thin. Consider the
durable three FIRST and use `knowledge` only when none genuinely fit. Quick
catches: a stated reason for choosing or avoiding an option → `decision`; an
operating practice (how you measure, review, run, or verify) → `operation`; a
generalized stance one level above a single decision → `principle`. Before
finalizing `memo_type_keys`, re-read the candidate once and ask whether there is
a judgment you labeled as mere knowledge. Do not over-correct: `principle` needs
an explicitly generalized stance, not a one-off opinion.

## Notes

- Do not save directly to PaPut.
- Add candidates to the API-backed pending queue first.
- `paput_add_knowledge_candidates` marks the source session as processed when candidates are submitted.
- Use `paput_mark_processed_session` after reviewing a session that produces no candidates.
- Report duplicates or similar memos when found.
- Prefer high-quality pending candidates over increasing the pending count.
