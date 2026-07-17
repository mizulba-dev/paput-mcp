---
name: paput-capture
description: Use this to extract reusable knowledge candidates from the current conversation or a specified topic and add them to pending.
---

# PaPut Capture

Extract reusable knowledge candidates from the current conversation or a user-specified topic and add them to pending. Use this as a manual fallback when the global rules did not suggest candidates automatically.

## When To Use

- The user wants to keep knowledge learned while solving a problem.
- The user wants to keep a design decision and its rationale.
- The user wants to keep a best practice or debugging method.
- The user asks to create notes for a specific topic.

## Steps

1. Read the capture policy with `paput_get_capture_policy`.
2. Check existing pending candidates with `paput_list_pending_candidates`.
3. Extract only reusable knowledge from the current conversation or the user-specified topic.
4. For each candidate, check semantically similar existing memos with `paput_search_memo`, using the candidate title or a one-line gist as the query. Treat results with a score around 0.85 or higher as near-duplicates, and results around 0.7 to 0.85 as overlap that needs comparison against the candidate body. Only results with a `score` are semantic near-matches; results without one are keyword-only hits, which already cover the case where the candidate centers on an exact name or identifier.
5. Apply the capture policy when deciding whether to add, reject, or ask about candidates. If no policy exists yet, use the Candidate Rules and Rejected Candidates sections below.
6. Keep each candidate focused on one reusable idea. Draft the title and Markdown body first, structured to fit the content itself — do not shape the body around memo types. Classify the finalized body afterwards (see the Memo Type section), and set categories and visibility.
7. Self-review the candidate against the Quality Bar below. If the body is only a short summary or conclusion, enrich it before adding.
8. Do not add candidates that may duplicate existing memos or pending candidates. Suggest reusing or updating the existing memo or candidate instead.
9. If a candidate is reusable, non-duplicate, non-sensitive, not project-specific, and allowed by the capture policy, add it to pending with `paput_add_knowledge_candidates` (including `memo_type_keys`, the real source-session identity — see Source Session Identity — and the source project link — see Project Link) without waiting for user approval.
10. After adding candidates, briefly report the title, categories, memo type, and candidate ID.

## Source Session Identity

`paput_add_knowledge_candidates` marks the source session as processed, and `paput-harvest` later matches those markers against local session files by the file basename without `.jsonl`. Pass the real session identity whenever the client has a local session file, so captured sessions do not resurface as unprocessed in harvest. Resolve it before calling the tool:

- Claude Code: `source` is `claude`. The session ID is the current session's 36-character UUID, visible in session-scoped paths the harness exposes (the scratchpad directory, tool-result paths, or the transcript path). Confirm it by checking that `~/.claude/projects/*/<uuid>.jsonl` exists, and pass the bare UUID — the file basename without `.jsonl` — as `session_id`.
- Codex CLI: `source` is `codex`. Read the `CODEX_THREAD_ID` environment variable, then normalize it to the rollout basename: locate `~/.codex/sessions/**/rollout-*-<thread-id>.jsonl` and pass the filename without `.jsonl` as `session_id`. If the file cannot be located, pass the bare thread ID.
- For `claude` / `codex`, set `source_session_updated_at` to the located session file's modified time in ISO 8601; if no file was located, use the current time.
- Conversation clients without local session files (`claude-ai`, `chatgpt`) omit `session_id`.
- Fall back to a short descriptive `session_id` only when no real ID is obtainable — deduplication still works, but harvest cannot match the marker to the local file and will re-read the session. The bare Codex thread ID fallback shares this limitation, since it does not match the rollout basename.

Marking the current session processed while it is still running is intended: the completion checklist keeps running capture on later work turns, so harvest does not need to revisit the session.

## Project Link

Set `projects: [{id, title}]` on every candidate from the project the conversation is working in. Resolve it once per session with `paput_get_project_context` using the current repository / working-directory name (it is often already resolved at session start by the project-context rules). The link records where the knowledge came from — the body still stays generalized and cross-project. If the conversation is not tied to any project (a general consultation with no repository context), leave `projects` empty and say so when reporting. Never guess a project from the candidate's topic.

## Candidate Rules

- Keep each candidate focused on one reusable idea. This does not mean removing rationale, constraints, or operational guidance.
- Make titles concise and searchable.
- Write the body in Markdown.
- Do not use top-level Markdown headings (`# ...`) in the body. If headings help readability, start at `##`.
- The save API sits behind a WAF that inspects the request body, so write command, SQL, and markup examples as prose or pseudo-notation, not raw executable strings (an HTTP-fetch command with a URL, a union-style select, a leading script tag). Code fences do not help; raw strings get the request rejected with a 403.
- Include concrete procedures, causes, reasons, and decision criteria in the body.
- To make candidates reusable, naturally include decision criteria, applicability conditions, reasons, pitfalls, and verification methods where possible.
- Do not include project-specific specifications, implementation details, operational rules, code, secrets, or customer data.
- Only capture technical knowledge, decision criteria, or procedures that can be reused in other projects.
- Treat candidates as private by default.

## Memo Type

Classify each candidate with one or more memo types via `memo_type_keys`. A memo can have several. This axis is what lets PaPut surface judgment and practices in project episodes, self PR drafting, and analysis, so classify deliberately.

Typing is a reading step, not a writing step. Classify only after the body is final, and only from what the body already says. Never add headings, criteria sections, or choice wording to the body to justify a type — if a type fits only after such an edit, the type does not fit.

- `decision`: reusable judgment criteria that do not depend on a project — why you choose one option over another, what you optimize for, what you avoid.
- `operation`: operating practices — observability, eval, testing, review, and improvement procedures.
- `principle`: a stance you have explicitly stated, generalized one level above individual decisions.
- `knowledge`: technical know-how, usage, or implementation knowledge (commodity).

Guidance:

- Capture candidates are reusable decision criteria, procedures, or principles, so prefer `decision` / `operation` / `principle` when they fit; use `knowledge` for commodity technical know-how.
- `decision` / `operation` / `principle` are the primary material for durable judgment and working-practice summaries; `knowledge` usually is not.
- Tagging review — do not under-label. The default failure mode is dropping a judgment memo into `knowledge` and missing `decision` / `operation` / `principle`; this is a main reason the `principle` axis stays thin. Consider the durable three FIRST and use `knowledge` only when none genuinely fit. Quick catches: a stated reason for choosing or avoiding an option → `decision`; an operating practice (how you measure, review, run, or verify) → `operation`; a generalized stance one level above a single decision → `principle`. Before finalizing `memo_type_keys`, re-read the candidate once and ask "is there a judgment here that I labeled as mere knowledge?". Do not over-correct either: `principle` needs an explicitly generalized stance, not a one-off opinion — keep it honest against the Quality Bar.
- Do not over-label `decision` — it requires a judgment that actually happened, recorded in the body: an option taken, an alternative rejected, or a tradeoff resolved. A criteria-style heading, or a list of options with no record of what was chosen, does not make a memo a `decision`; plain library, API, or service behavior stays `knowledge` even when written as guidance.
- AI-collaboration practices and postures belong here, not in the reject pile: how you structure a task or spec for an AI, your review discipline for AI-generated changes, where you verify versus trust AI output, when you delegate versus do it yourself. Capture the reusable practice as `operation` or the stated stance as `principle` — generalized so it would hold with a different AI tool, on a different project, for someone else to learn. This is the scarcest, most durable axis; do not drop it as workflow chatter.
- Leaving a candidate unclassified (no type) is allowed, but classifying it improves analysis and the public profile. Do not force a type when none fits.

## Eliciting scarce operating practices (eval / observability)

`operation` is a primary public-summary axis, but its eval / observability / measurement part is the scarcest and most easily lost — it surfaces as "how the work was measured and watched", not as a deliverable, so generic free-form capture tends to miss it or leave thin, ad-hoc candidates. When the conversation touched measurement, evaluation, monitoring, alerting, test strategy, SLO / SLI, threshold or pass-fail tuning, or incident review, do not let it pass as a work log: actively draw out the reusable practice and capture it as `operation` (or `principle` for a stated stance, `decision` for an adopt/reject criterion).

Draw out only what fits the conversation — do not interrogate:

- What was measured, and why that signal rather than another?
- How was signal separated from noise?
- How was the threshold / pass-fail decided — by feel, or by offline evaluation?
- What is watched in production, and where were alerts placed, and why there?
- What did a failure or false positive teach, and how did it change the judgment?

Generalize one level above the project: drop service, metric, and dashboard names; keep the criterion, the rationale, and the verification method. A candidate here must carry at least one of measurement target + why, threshold rationale, or verification method — a bare "added monitoring" or "wrote tests" is a work log, not knowledge. This is a lens for capturing the user's methodology, not a feature: do not turn PaPut into an eval or monitoring tool.

## Eliciting prompt-derived judgment

The user's own prompts in the current conversation are first-party evidence of judgment. Corrections, constraints, repeated instructions, and choices among AI-presented options often reveal reusable operating practices or postures before they appear in the final artifact. When the conversation includes this signal, do not treat it as disposable task wording: actively draw out the reusable judgment and capture it as `operation`, `principle`, or `decision` as appropriate.

Draw out only what fits the conversation — do not interrogate:

- Where did the user reject or correct the AI's output, and what reason did they give? This is the strongest material for `operation` or `principle`.
- What constraints or prohibitions did the user declare — "do not ..." or "always ..." — and do they generalize beyond this task?
- Is the user repeating nearly the same boilerplate instruction? If it is project-specific, route it to a project document as a `procedure` through Check 1; if it is cross-project, capture the practice as `operation` in pending through Check 2.
- Did the AI present options, and did the user choose, reject, or combine them with a reason? That reason is `decision` material.

Generalize one level above the prompt: keep the judgment criterion, operating practice, stance, or repeatable procedure; drop local paths, project names, customer details, and exact task facts. Short verbatim phrasing from the user may be preserved for authenticity, but pending candidates must not include sensitive or project-specific content. A one-off "fix this" or "run tests" instruction is a work log, not knowledge, unless it exposes a reusable judgment criterion, operating practice, or procedure. Project-specific repeated instructions belong in project documents (`procedure`, Check 1); cross-project practices and postures belong in pending candidates (Check 2).

## Quality Bar

Before adding a candidate, make sure the body preserves enough reasoning for future reuse. A good candidate is not just a conclusion; it should include the relevant problem context, decision criteria, applicability conditions, tradeoffs, pitfalls, operational guidance, or verification method.

Do not force a fixed template. Include the pieces that are useful for the specific knowledge, and let the content decide the structure: a judgment-memo skeleton (criteria / why / pitfalls / verification headings) fits judgment candidates, not every candidate — a knowledge-centered body should follow its own natural shape. If the body only states a conclusion or summary, enrich it before adding the candidate.

Prefer generalized but concrete writing:

- Remove project-specific names, code, secrets, and local details.
- Keep generalized examples when they clarify the rule.
- Preserve why the decision matters and how to apply it.
- Make sure the title and body alone are enough for a future reader to understand and reuse the knowledge.

## Rejected Candidates

Do not add these to pending:

- Project-specific specifications, screen names, button names, business workflows, operational rules, or local context.
- One-off tool mechanics or configuration: editor / OS / CLI settings, keybindings, which button was clicked, model- or version-specific quirks, project-specific CI wiring, or anecdotes about a single session (for example, "the AI got confused here"). These are commodity even when they mention AI tools — capture the reusable practice or stance instead, not the mechanics. Reusable AI-collaboration practices and postures ARE worth capturing (see the AI-collaboration note under Memo Type); do not discard them as workflow chatter.
- Content that third parties cannot understand from the title and body alone.
- Rejected designs, anecdotes, work logs, impressions, or decision histories without reusable guidance.
- Content semantically close to existing memos or pending candidates.
- Generic security, authorization, or tenant-isolation notes when similar knowledge already exists.
- Code fragments or project-specific naming that has not been generalized.

## Notes

- Do not save directly to PaPut.
- Save only to pending. Final PaPut saves are handled by `paput-save`.
- Add safe candidates to pending without waiting for user approval. If a candidate may be duplicate, sensitive, project-specific, too narrow, or ambiguous, present the concern and ask before adding it.
- Candidates created from past sessions use the source session updated timestamp as the PaPut memo creation timestamp when saved.
- If there are no candidates, say that no reusable knowledge was found.
- If `paput_search_memo` fails, do not silently skip the duplicate check — retry once, and if it still fails, disclose that duplicate checking could not run for the affected candidates.
- `paput_add_knowledge_candidates` also runs a semantic near-duplicate check internally and rejects candidates whose top match score is 0.9 or higher, so review its `duplicate_details` in the result.
