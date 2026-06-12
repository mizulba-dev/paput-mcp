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

1. Read the local capture policy with `paput_get_capture_policy`.
2. Check existing pending candidates with `paput_list_pending_candidates`.
3. Extract only reusable knowledge from the current conversation or the user-specified topic.
4. For each candidate, check semantically similar existing memos with `paput_find_similar_memos`, using the candidate title or a one-line gist as the query. Treat results with a score around 0.85 or higher as near-duplicates, and results around 0.7 to 0.85 as overlap that needs comparison against the candidate body. Use `paput_search_memo` in addition when the candidate centers on an exact name or identifier.
5. Apply the capture policy when deciding whether to add, reject, or ask about candidates. If no policy exists yet, use the Candidate Rules and Rejected Candidates sections below.
6. Keep each candidate focused on one reusable idea, and prepare a title, Markdown body, categories, and visibility.
7. Self-review the candidate against the Quality Bar below. If the body is only a short summary or conclusion, enrich it before adding.
8. Do not add candidates that may duplicate existing memos or pending candidates. Suggest reusing or updating the existing memo or candidate instead.
9. If a candidate is reusable, non-duplicate, non-sensitive, not project-specific, and allowed by the capture policy, add it to pending with `paput_add_knowledge_candidates` without waiting for user approval.
10. After adding candidates, briefly report the title, categories, and candidate ID.

## Candidate Rules

- Keep each candidate focused on one reusable idea. This does not mean removing rationale, constraints, or operational guidance.
- Make titles concise and searchable.
- Write the body in Markdown.
- Do not use top-level Markdown headings (`# ...`) in the body. If headings help readability, start at `##`.
- Include concrete procedures, causes, reasons, and decision criteria in the body.
- To make candidates reusable, naturally include decision criteria, applicability conditions, reasons, pitfalls, and verification methods where possible.
- Do not include project-specific specifications, implementation details, operational rules, code, secrets, or customer data.
- Only capture technical knowledge, decision criteria, or procedures that can be reused in other projects.
- Treat candidates as private by default.

## Quality Bar

Before adding a candidate, make sure the body preserves enough reasoning for future reuse. A good candidate is not just a conclusion; it should include the relevant problem context, decision criteria, applicability conditions, tradeoffs, pitfalls, operational guidance, or verification method.

Do not force a fixed template. Include the pieces that are useful for the specific knowledge. If the body only states a conclusion or summary, enrich it before adding the candidate.

Prefer generalized but concrete writing:

- Remove project-specific names, code, secrets, and local details.
- Keep generalized examples when they clarify the rule.
- Preserve why the decision matters and how to apply it.
- Make sure the title and body alone are enough for a future reader to understand and reuse the knowledge.

## Rejected Candidates

Do not add these to pending:

- Project-specific specifications, screen names, button names, business workflows, operational rules, or local context.
- Personal workflow notes about PRs, GitHub, Codex, Claude, AI review, editors, or OS operations.
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
- If `paput_find_similar_memos` is unavailable or fails, fall back to `paput_search_memo` instead of skipping the duplicate check.
- `paput_add_knowledge_candidates` also runs a semantic near-duplicate check internally and rejects candidates whose top match score is 0.9 or higher, so review its `duplicate_details` in the result.
