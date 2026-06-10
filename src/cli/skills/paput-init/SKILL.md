---
name: paput-init
description: Use this to initialize PaPut usage, sync existing memos, and inspect unprocessed sessions.
---

# PaPut Init

Initialize PaPut knowledge capture.

## Steps

1. Check the local cache with `paput_cache_status`.
2. Sync existing PaPut memos into the local cache with `paput_sync_remote_memos`.
3. Scan unprocessed Claude/Codex sessions with `paput_scan_sessions`.
4. If unprocessed sessions exist, report the count and a short summary to the user.
5. Only when the user wants it, read the transcript with `paput_get_session_transcript` and create candidates that meet the extraction criteria below.
6. Before adding candidates with `paput_add_knowledge_candidates`, check that they do not contain project-specific specifications, implementation details, operational rules, code, customer data, or secrets.
7. After adding pending candidates, briefly report added candidates, duplicates, and rejected candidates.

## Extraction Criteria

Only add technical knowledge, decision criteria, and procedures that can be reused in other projects.

Do not add these to pending:

- Project-specific specifications, screen names, button names, business workflows, operational rules, or local context.
- Personal workflow notes about PRs, GitHub, Codex, Claude, AI review, editors, or OS operations.
- Content that third parties cannot understand from the title and body alone.
- Rejected designs, anecdotes, work logs, impressions, or decision histories without reusable guidance.
- Content semantically close to existing memos or pending candidates.
- Generic security, authorization, or tenant-isolation notes when similar knowledge already exists.
- Code fragments or project-specific naming that has not been generalized.

When unsure, do not add the candidate. Report that there is no knowledge to save or that the candidate was rejected.

## Notes

- Do not save directly to PaPut.
- Add candidates to pending first.
- Report duplicates or similar memos when found.
- Prefer high-quality pending candidates over increasing the pending count.
