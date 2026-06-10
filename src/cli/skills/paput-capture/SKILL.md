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

1. Check existing pending candidates with `paput_list_pending_candidates`.
2. Extract only reusable knowledge from the current conversation or the user-specified topic.
3. Keep candidates small, and prepare a title, body, categories, and visibility.
4. Do not add candidates that may duplicate existing pending candidates. Suggest using the existing candidate instead.
5. If a candidate is reusable, non-duplicate, non-sensitive, and not project-specific, add it to pending with `paput_add_knowledge_candidates` without waiting for user approval.
6. After adding candidates, briefly report the title, categories, and candidate ID.

## Candidate Rules

- Keep each candidate small.
- Make titles concise and searchable.
- Include concrete procedures, causes, reasons, and decision criteria in the body.
- To make candidates reusable, naturally include decision criteria, applicability conditions, reasons, pitfalls, and verification methods where possible.
- Do not include project-specific specifications, implementation details, operational rules, code, secrets, or customer data.
- Only capture technical knowledge, decision criteria, or procedures that can be reused in other projects.
- Treat candidates as private by default.
- Do not include Markdown heading lines that start with `#` in the body.

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
