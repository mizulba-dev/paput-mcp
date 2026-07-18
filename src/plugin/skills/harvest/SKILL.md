---
name: paput-harvest
description: Use this to harvest reusable knowledge from past local Claude/Codex sessions when the AI client can read local files. Safe to run repeatedly — it skips already-processed sessions and only reviews new ones — so use it both for first-time onboarding and for periodic catch-up. Pay special attention to AI-collaboration practices and postures (operation / principle), the scarce, durable axis. Also covers the backfill sweep for repeated user instructions (invoke with the `backfill` argument, or ask "同じ指示を拾い直して" / "backfill repeated instructions"), which re-reads already-processed sessions.
argument-hint: [backfill]
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
   Draft each body first, structured to fit the content itself — do not shape
   it around memo types. Then set `memo_type_keys` from the finalized body
   (see Memo Type below); classify AI-collaboration practices as `operation`
   and postures as `principle`.
9. If the session was reviewed but no candidates should be added, call
   `paput_mark_processed_session` with `source`, `session_id`, and
   `source_session_updated_at`.
10. Briefly report added candidates, duplicates, rejected candidates,
    persistent-instruction-file additions proposed, and sessions marked as
    processed.

When a run delegates session reading to subagents (batch processing), follow
Delegated Batch Reading below — every duty in these steps travels with the
reader, not with the coordinator.

## Delegated Batch Reading

Large backlogs are best processed by delegating session reading to parallel
subagents. This applies to the normal steps and equally to a delegated backfill
sweep. Keep the division of labor explicit — the default failure mode is the
coordinator absorbing duties it cannot fulfill or suppressing registrations it
should not gate:

- The flow is two-phase (readers report → coordinator cross-checks → readers
  register), so readers must be spawned in a resumable form that can receive a
  second message from the coordinator; a one-shot task that terminates after
  returning its result cannot execute the registration phase.
- Every extraction duty of this skill travels with the reader: the extraction
  criteria, the AI-collaboration and user-prompt axes, exclusion rules, and the
  project-document routing. Do not reduce readers to text extractors.
- Readers report candidate titles, memo types, and one-to-two-line gists to the
  coordinator — not full bodies. The coordinator's role is what only the
  cross-reader view enables: merging same-shape candidates that different
  readers extracted from related sessions, and rejecting duplicates of already
  pending (check with `paput_list_pending_candidates`) or recently added
  candidates.
- To merge same-shape candidates, the coordinator designates one reader as the
  absorbing side and relays the other candidates' key points as text; the
  absorbing reader folds them into its own draft and registers the merged
  candidate under its own session. The coordinator never regenerates candidate
  bodies — that doubles generation cost.
- After the coordinator's cross-check, each reader registers its approved
  candidates with `paput_add_knowledge_candidates`, and marks with
  `paput_mark_processed_session` every reviewed session that ends up with no
  registration — both sessions that produced no candidates and sessions whose
  candidates were all rejected or absorbed in the cross-check. The coordinator
  distributes the real session identity (the Step 3 fields `source`,
  `session_id`, `source_session_updated_at`) to each reader up front —
  reconstructing identifiers from truncated listings is an error source.
- Project-specific repeated instructions and procedures are NOT subject to
  coordinator approval. Each reader registers every occurrence directly with
  `paput_add_project_document` (kind `procedure`) as it appears, resolving the
  project with `paput_get_project_context` when needed. The server deduplicates
  and counts repetitions via duplicate hits; collapsing or filtering repeats
  client-side — including "the coordinator decided it was already documented" —
  starves the repetition counter and skill proposals never fire. Only the
  secrets/customer-data exclusion applies. Surface any skill proposal returned
  by the server to the user.

## Backfill: repeated-instruction sweep

Run this mode when the skill is invoked with the `backfill` argument, or when
the user explicitly asks for it (for example "backfill repeated instructions"
or "同じ指示を拾い直して"). Unlike the normal run it re-reads sessions that are
already marked processed, so it is opt-in, not part of the idempotent catch-up.

Why it exists: sessions processed before the user-prompt axis lens was added
were marked processed and are never re-reviewed, so the repeated instructions
they contain never reach the server-side repetition counter and no skill
proposal can fire. This sweep recovers that history.

1. Discover session files as in Steps 2–3, but do NOT skip processed sessions.
2. Read user messages only (see JSONL Parsing Guide; `role: user`). Skip
   assistant output and tool results — this keeps the sweep cheap. With a large
   history, start from the most recent sessions or the projects the user names,
   report progress per batch, and ask before expanding further back.
3. Collect recurring same-shape user instructions: declared constraints,
   requested procedures, and corrections that appear across sessions.
4. Separate standing norms from task procedures. A recurring instruction that
   is a standing behavioral norm — one meant to apply to every turn or session
   rather than to a triggerable task (respond in a given language, keep
   comments minimal, always declare X before Y) — does not belong in a
   procedure document or a skill: a skill would never fire for it. Instead,
   propose a one-line addition to the client's persistent instruction file
   (CLAUDE.md / AGENTS.md or the client's equivalent), showing the exact line
   and where it would go. Pick the target by the norm's scope: a norm tied to
   one project goes to that project's file, a norm the user restates across
   projects goes to the user-global file. Propose only — never edit that file
   without the user's approval. If the norm also generalizes across projects as a stance,
   it may additionally become a `principle` pending candidate under step 6's
   session-state rule.
5. Route task-shaped repeats by the user-prompt axis rules. Project-specific
   repeated instructions go to `paput_add_project_document` (kind `procedure`) — register
   each recurrence as it appears, without collapsing repeats on the client side;
   the server deduplicates, counts the repetition via duplicate hits, and
   includes a skill proposal in the response once the threshold is reached.
   Surface any returned proposal to the user instead of silently continuing.
   `paput_add_project_document` never touches processed-session markers, so
   this is safe for processed and unprocessed sessions alike.
6. Handle cross-project practices and postures by session state, because
   `paput_add_knowledge_candidates` marks the source session as processed (see
   Notes) and cannot be separated from that side effect:
   - From already-processed sessions, add them to pending as usual; the
     resulting re-mark only refreshes the marker timestamp and is acceptable.
   - From unprocessed sessions, do NOT add pending candidates during the
     sweep — the backfill has read only the user messages, and marking the
     session processed now would hide the unreviewed assistant side from the
     normal harvest forever. Note the finding and leave the session to the
     normal harvest flow (or review it fully now if the user asks).
7. Report what was found: the recurring instruction groups, procedures
   registered, duplicates counted toward repetition, skill proposals surfaced,
   persistent-instruction-file additions proposed, and any unprocessed sessions
   deferred to the normal flow.

All exclusion rules below still apply. Secrets and customer data are excluded
on every path — procedure documents included; the additional pending-only
rules (no local paths or project-specific content) apply to pending candidates.

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

Structure each candidate body to fit its content. Do not impose a judgment-memo skeleton (criteria / why / pitfalls / verification headings) on knowledge-centered candidates; let the content decide the structure.

### Capture the AI-collaboration axis

Reusable AI-collaboration practices and postures are first-class material here —
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
  `principle` material. When it is a standing norm the user keeps re-stating
  in prompts — one meant to apply to every turn, not to a triggerable task —
  also propose a one-line addition to the client's persistent instruction file
  (CLAUDE.md / AGENTS.md or equivalent); propose only, never edit that file
  without approval.
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
(`procedure`, Check 1); route cross-project practices and postures to pending
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
- `principle`: a stance you have explicitly stated, generalized above individual decisions, including postures on how to work with AI.
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

Typing is a reading step, not a writing step. Classify only after the body is
final, and only from what the body already says — never add headings, criteria
sections, or choice wording to a body to justify a type. Do not over-label
`decision` either: it requires a judgment that actually happened in the source
session, recorded in the body — an option taken, an alternative rejected, or a
tradeoff resolved. A criteria-style heading, or a list of options with no record
of what was chosen, does not make a candidate a `decision`; plain library, API,
or service behavior stays `knowledge` even when written as guidance.

## Notes

- Do not save directly to PaPut.
- Add candidates to the API-backed pending queue first.
- `paput_add_knowledge_candidates` marks the source session as processed when candidates are submitted.
- Use `paput_mark_processed_session` after reviewing a session that produces no candidates.
- Report duplicates or similar memos when found.
- Prefer high-quality pending candidates over increasing the pending count.
