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
     Decisively agent-driven transcripts are OUT OF SCOPE at discovery: Claude
     files whose basename starts with `agent-` or whose `entrypoint` is
     `sdk-cli` (equivalently, the first user prompt's `promptSource` is `sdk`) —
     a headless `claude -p` / SDK launch — and Codex files whose first-line
     `session_meta` carries `payload.source` of `exec` or a
     `{"subagent": ...}` value. Checking the basename, the `entrypoint`, or that
     first metadata line IS the filter and is always allowed; what out-of-scope
     prohibits is reading the transcript body, counting the file into the
     backlog, and marking it. (For Claude, `entrypoint` is not on the file's
     first line — the leading bookkeeping entries lack it — so scan to the first
     entry that carries it, normally the first user prompt; a first-line-only
     check like Codex's would miss it and leave the file wrongly in scope.) Their yield (reviewer/implementer-side practices)
     has proven to saturate, and the verdict is recomputable from the file
     itself on every run, so keeping processed markers for them would only add
     per-run write cost. Claude files whose `entrypoint` is `cli`, and any file
     with missing or unrecognized origin metadata, stay in scope (safe side); if
     a single file ever mixes `cli` and `sdk-cli`, keep it in scope. Reading
     agent-driven transcripts remains possible only as an explicit opt-in — the
     user names them, or a backfill run is asked to include them.
3. For each file, derive the following (the scanner in Running the discovery /
   triage scan emits all of these — `project_hint` is the Claude project
   directory name or the Codex `cwd`; resolve worktree paths to their parent
   repository when mapping to a PaPut project):
   - `source`: `claude` or `codex`
   - `session_id`: file basename without `.jsonl`
   - `source_session_updated_at`: file modified time in ISO 8601 format
   - the session's project hint: for Claude, the project directory name in the
     file path (`~/.claude/projects/<project-dir>/...`); for Codex, the `cwd`
     recorded near the top of the file. Worktree paths resolve to their parent
     repository.
4. Skip sessions already returned by `paput_list_processed_sessions` (pass them
   to the scanner via `--processed` so `summary` is already the backlog).
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
   Also set `projects: [{id, title}]` on every candidate from the session's
   project hint (Step 3): resolve the repository / directory name to a PaPut
   project with `paput_get_project_context`, once per distinct repository, not
   per candidate. The link records where the knowledge came from — the body
   still stays generalized and cross-project. If the hint does not resolve to
   a project, register with `projects` empty and say so in the report; never
   guess a project from the candidate's topic.
9. If the session was reviewed but no candidates should be added, call
   `paput_mark_processed_session` with `source`, `session_id`, and
   `source_session_updated_at`.
10. Briefly report added candidates, duplicates, rejected candidates,
    persistent-instruction-file additions proposed, and sessions marked as
    processed.

When a run delegates session reading to subagents (batch processing), follow
Delegated Batch Reading below — every duty in these steps travels with the
reader, not with the coordinator. When the backlog is large — delegated or
not — triage sessions first (see Session Triage) to spend reading effort where
the yield is, and run the scope decision through the user (see Large-Backlog
Funnel) instead of choosing a strategy yourself.

## Running the discovery / triage scan

Steps 2–4 and the Session Triage signals below are mechanical: they read every
session file once and derive fixed fields. Do not hand-assemble grep/jq for
them — run the bundled scanner and interpret its JSON:

```
node <this skill's references/harvest-scan.mjs absolute path> [--processed <file>] [--sessions] [--limit N] [--user-messages] [--min-sessions N] [--top N] [--digest-cache <file>]
```

- It walks `~/.claude/projects/**` and `~/.codex/sessions/**` (override with
  `--claude-root` / `--codex-root`), applies the Step 2 scope filter, and emits
  `{ summary, clusters?, sessions? }`. `--sessions` adds the per-session in-scope array;
  `--processed` takes the `paput_list_processed_sessions` JSON and drops
  already-processed sessions (Codex markers matched by both the rollout basename
  and the bare-UUID form) so `summary` is the real backlog.
- `--user-messages` adds `clusters`: recurring near-verbatim user instructions,
  grouped mechanically without reading any transcript yourself. The scanner
  collects every real user message (injected blocks, command echoes, and
  interrupt markers excluded), normalizes away numbers, paths, URLs, code
  blocks, and images, groups identical normalized texts, and merges near
  duplicates by 3-gram similarity. Each cluster carries `representative`,
  `variants`, `msg_count`, `session_count`, `projects`, `months`, and up to 10
  source `session_ids` for follow-up reading. Only in-scope sessions outside
  the `p3` delegation heuristic feed the table — agent-driven delegation
  templates repeat verbatim and must never look like user recurrence.
  Recurrence is counted across sessions, not within one (same-session repeats
  are retry noise); `--min-sessions` sets the floor (default 2). The emitted
  list is capped at `--top` clusters (default 100), best-recurring first;
  `summary.clusters_total` / `summary.clusters_truncated` report what the cap
  dropped — when truncated, raise `--top` or process in `--min-sessions`
  tiers rather than assuming the table is complete. Semantic paraphrase
  merging is intentionally out of scope — that judgment stays with you (and
  the server's semantic dedup when routing to project documents).
- `--digest-cache <file>` keeps a per-file scan cache keyed by mtime+size, so
  later runs re-read only changed session files (`summary.digest_cache`
  reports hits/misses). The cache is version-stamped and self-invalidates when
  the scanner's scan fields change; a corrupt cache file is discarded with a
  warning (fail-open). Reuse one cache path across runs — normal and backfill
  runs share it. Always place it OUTSIDE any repository (canonical:
  `~/.cache/paput-harvest-digest.json`): the cache holds plaintext excerpts of
  the user's session messages, so a cwd-relative path inside a repo would put
  transcript content on the commit path.
- Each in-scope session carries the Step 3 fields (`source`, `session_id`,
  `source_session_updated_at`, `project_hint`) plus the Session Triage signals (`origin`,
  `in_scope`, `triage`, `capture_signal`, `real_user_msgs`,
  `likely_agent_driven`, `first_user_message`), and `summary.buckets` gives the
  project × month × capture-signal breakdown the Large-Backlog Funnel needs.
- The script attaches signals only; it decides no reading. You still judge what
  to read, mark, and ask (Session Triage, Large-Backlog Funnel), resolve
  `project_hint` to a PaPut project, and read transcript bodies for extraction.
- The signal definitions are canonical in design_doc #216 and in the prose
  below; the script fixes them in executable form. If `node` is unavailable,
  fall back to the manual pass: apply the Step 2 scope filter and read each
  file's metadata line and first user entries yourself to reproduce the same
  signals.

## Session Triage

When the unprocessed backlog is too large to read in one pass, rank sessions
with cheap machine signals before reading. All are computable by scanning each
JSONL once, without reading the full transcript — this is exactly what
`harvest-scan.mjs` (see Running the discovery / triage scan) emits per session,
so read the signals from its JSON rather than recomputing them by hand. The
definitions below are the meaning of each signal. Check the origin metadata
first — when it yields a decisive verdict the delegation heuristic is
skipped:

- **Origin metadata (check first).** Session files usually record how the
  session was launched; read this before any content heuristic. (After the
  Step 2 scope filter, decisive agent-driven verdicts have normally already
  removed those files from scope — this bullet chiefly serves the filter
  itself, the pre-check of non-`agent-*` Claude files, and explicit opt-in
  reads.) Codex: the
  file's first line is a `session_meta` entry whose `payload.source` is `cli`
  (TUI) or `vscode` (IDE extension) for human-driven sessions, and `exec` (a
  `codex exec` one-shot, i.e. a spawned agent) or a `{"subagent": ...}` value
  for in-client subagents. All four are decisive: `exec` / `subagent` mean
  agent-driven unconditionally — no marker evidence needed — and `cli` /
  `vscode` record a human launch path. Do not use `payload.originator` as a
  substitute — it disagrees with `source` on subagent sessions (they can
  carry `codex-tui`). Claude: `agent-*.jsonl` files are subagent transcripts,
  and any session whose `entrypoint` is `sdk-cli` (equivalently, the first user
  prompt's `promptSource` is `sdk`) is a headless `claude -p` / SDK launch —
  both are decisively agent-driven. `entrypoint` sits on session entries
  (user / assistant); `promptSource` sits on the first user prompt. An
  `entrypoint` of `cli` records a human TUI launch; only files whose
  `entrypoint` is `cli`, missing, or unrecognized (older clients, other
  formats) still go through the delegation heuristic below.
- **Delegation heuristic (fallback when origin metadata is inconclusive).** A
  session is likely an agent-driven one-shot run (a reviewer or implementer
  spawned by another agent, not driven by the human — distinct from
  delegating the harvest reading itself, covered in the next section) when it
  has at most ~2 real user text messages AND its first user message contains
  delegation-template markers (review severity vocabulary such
  as must-fix/should-fix, static-verification constraints, plan-file
  references) inside a task-prompt-shaped message. Marker evidence is
  required: a long first prompt alone, with no markers, defaults to
  interactive — a human pasting one long request looks exactly the same, and
  misreading it as agent-driven would discard user-prompt-axis evidence. Count
  only real user text — skip tool results, command echoes, and injected
  instruction/environment blocks; on some clients global instruction files
  leak into user messages, so ignore marker hits inside injected boilerplate.
  Errors must fall on the safe side: an agent-driven session misread as
  interactive merely gets a full read; never let an interactive session be
  misread as agent-driven and downgraded.
- **Capture signal.** Whether the session already called
  `paput_add_knowledge_candidates` itself. Detect actual tool calls (tool_use /
  function_call entries), not string mentions — tool definitions and
  instruction files mention the tool name in nearly every session. On Codex
  transcripts the tool name also appears inside tools-listing execution
  metadata, so a plain string match over the file still false-positives:
  match the call entry shape itself (a `function_call` payload carrying the
  tool name), and confirm the signal on a spot-check before acting on it at
  scale (see Large-Backlog Funnel).

Then read in priority order:

1. **Interactive sessions with no capture call** — full extraction first. The
   user-prompt axis applies with full force; this is where unharvested human
   judgment concentrates.
2. **Interactive sessions that already captured** — read, but expect most
   candidates to duplicate what the session captured about itself in real time;
   the residual value is usually side topics the in-session capture skipped.
   (Such sessions still appear in the backlog when their capture ran with a
   session id that does not match the file basename — common before id
   normalization — so the processed marker never matched the file.) On a large
   backlog, the user may direct these to be marked processed without reading
   (see Large-Backlog Funnel) — that is the user's call, never the agent's.
3. **Agent-driven sessions** — with the Step 2 scope filter, decisively
   agent-driven transcripts normally never reach this list; this priority
   applies to sessions judged agent-driven by the delegation heuristic and to
   explicit opt-in reads. Their user messages were authored by the
   delegating agent, NOT the human user: never treat them as user-prompt-axis
   evidence. This applies to the backfill sweep too: never count an
   agent-driven session's user messages as recurring user instructions —
   delegation templates repeat verbatim across spawned sessions and would
   falsely feed the server-side repetition counter and trip skill proposals.
   Their unique value concentrates in reviewer/implementer-side practices,
   which saturates after a few batches. Group same-feature rounds (an R1/R2/R3
   review chain, an implement-then-review pair) and read one representative
   fully, skimming the rest for deltas. Once a group shape's yield has proven
   near-zero across batches, skimming down to mark-only is acceptable for that
   shape — never for interactive sessions.

## Large-Backlog Funnel (ask, don't decide)

When the unprocessed backlog is large (roughly 50+ sessions), the scope
decision belongs to the user, not the agent. Do the cheap analysis first, then
ask — with evidence attached — instead of picking a strategy yourself. Reading
everything overspends; marking sessions processed without reading on your own
judgment overreaches. Neither default is yours to take.

1. **Prepare the evidence before asking.** Without reading full transcripts:
   run `harvest-scan.mjs --processed <markers> --sessions` to get the
   project × month × capture-signal breakdown (`summary.buckets`) and the
   per-session signals, including each in-scope session's `first_user_message`
   (the script already skips injected instruction files, environment blocks, and
   command echoes). Spot-check the newest 1-2 sessions against the transcript to
   confirm the signals hold (one spot-check catches a miscalibrated capture
   signal before it discards real backlog); then bucket the sessions without a
   capture signal by request type using their `first_user_message`. Typical
   buckets and their observed yield:
   - implementation / fix / design-consultation requests — highest yield; user
     judgment and corrections concentrate here
   - review-request one-shots — yield starts high but saturates once a
     feature's lessons are memoized; sample one per feature group
   - mechanical work (rebase and conflict resolution, branch pulls, commit
     runs, doc generation, skill invocations) — near-zero yield
   - error/log investigations and short Q&A — low yield
   - empty / greeting-only — zero yield
2. **Ask the user in one round.** Present the breakdown, the bucket table with
   counts and a few example first-messages per bucket, and the spot-check
   findings, then ask at bucket level: whether capture-verified sessions may
   be marked processed without reading (their learnings were extracted
   in-session; the residual is usually side topics); which first-message
   buckets to read and which to mark processed without reading; and how far
   back this run should go. Batch these into a single question round — do not
   interrogate stage by stage. Record in the report which buckets were marked
   processed without reading at the user's direction.
3. **Execute the user's split.** Bulk-mark the excluded buckets with cheap
   parallel marker subagents; send only the approved buckets to Delegated
   Batch Reading, grouped by feature/repo.
4. **Close with the reconciliation audit** defined in Delegated Batch Reading.
   It closes every run that delegated writes, funnel or not.
5. **Headless fallback.** If no user is available to answer (scheduled or
   unattended runs), do not mark anything processed without reading: fall back
   to the standard priority order and process only as much as the run's budget
   allows, leaving the rest for the next run. A scheduled or unattended
   invocation is itself the user's standing consent to read within that
   budget — it satisfies the Step 6 gate — but it never grants marking
   sessions processed without reading.

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
  `session_id`, `source_session_updated_at`) AND the resolved project link
  (`projects` id and title, resolved centrally once per distinct repository)
  to each reader up front — reconstructing identifiers from truncated listings
  is an error source, and per-reader project resolution wastes calls.
- Project-specific repeated instructions and procedures are NOT subject to
  coordinator approval. Each reader registers every occurrence directly with
  `paput_add_project_document` (kind `procedure`) as it appears, resolving the
  project with `paput_get_project_context` when needed. The server deduplicates
  and counts repetitions via duplicate hits; collapsing or filtering repeats
  client-side — including "the coordinator decided it was already documented" —
  starves the repetition counter and skill proposals never fire. Only the
  secrets/customer-data exclusion applies. Surface any skill proposal returned
  by the server to the user.
- Treat subagent success reports about external writes (registrations, marks)
  as claims, not facts — a subagent can report success for a call that never
  took effect, and can rationalize the gap when questioned. Close every run
  that delegated writes with a reconciliation audit: re-fetch the processed
  markers and reconcile them against the local file list (match Codex markers
  by both the rollout basename and the bare UUID — both formats exist in
  history). Gap detection runs in the file→marker direction only, over the
  in-scope sessions this run actually processed — sessions deliberately left
  for a future run (budget limits, deferred buckets) are not gaps. A
  processed-but-unmarked file means a silently failed write.
  Exclude files that are out of harvest scope per Step 2, and ignore
  historical markers that point at out-of-scope or since-deleted files —
  orphan markers are not failures and need no action. Any session still unmatched means a delegated write silently
  failed despite a success report: re-execute it and verify by reading the
  record back. The audit is the accounting of record — when it contradicts a
  report, trust the ledger. Completion is declared only at zero gaps.

## Backfill: repeated-instruction sweep

Run this mode when the skill is invoked with the `backfill` argument, or when
the user explicitly asks for it (for example "backfill repeated instructions"
or "同じ指示を拾い直して"). Unlike the normal run it re-reads sessions that are
already marked processed, so it is opt-in, not part of the idempotent catch-up.

Why it exists: sessions processed before the user-prompt axis lens was added
were marked processed and are never re-reviewed, so the repeated instructions
they contain never reach the server-side repetition counter and no skill
proposal can fire. This sweep recovers that history.

1. Discover session files as in Steps 2–3, but do NOT skip processed sessions
   (run the scanner without `--processed`).
2. Build the recurrence table mechanically: run the scanner with
   `--user-messages` (add `--digest-cache` so repeat sweeps only re-read
   changed files). It reads user messages only — assistant output and tool
   results are never read — and emits `clusters`, the recurring same-shape
   instructions with counts, projects, months, and source `session_ids`,
   replacing any hand-read pass over transcripts. Messages from agent-driven
   sessions are never counted (scope filter + `p3` heuristic). First-message
   inspection alone is NOT a substitute: recurrence concentrates mid-session
   (a first-message-only sweep missed the most repeated instructions in
   practice), which is exactly what the cluster table surfaces.
3. Review the clusters yourself, top-down: judge which are real recurring user
   instructions — declared constraints, requested procedures, and corrections
   that appear across sessions — and which are noise (greetings, one-word
   nudges like "続けて", client-generated approvals). For an ambiguous
   cluster, read the user messages of a couple of its `session_ids` before
   deciding. With a large history, process the table in batches, report
   progress per batch, and ask before expanding further back.
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
- Use `paput_mark_processed_session` after reviewing a session that produces no candidates — or, on a large backlog, for buckets the user explicitly directed to be marked processed without reading (see Large-Backlog Funnel).
- Report duplicates or similar memos when found.
- Prefer high-quality pending candidates over increasing the pending count.
- Every candidate carries its source project in `projects` (Step 8); a
  registration wave with all-empty `projects` is a process error, not a
  normal outcome.
