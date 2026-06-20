---
name: paput-init
description: Use this to initialize PaPut usage and inspect unprocessed local Claude/Codex sessions when the AI client can read local files.
---

# PaPut Init

Initialize PaPut knowledge capture from past local AI sessions.

This skill is for local-file-capable AI clients such as Claude Code or Codex.
PaPut MCP does not read local session files. The AI client should read the
session files directly, then use PaPut MCP only to check processed-session
markers and add or mark reviewed sessions.

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
7. Before adding candidates with `paput_add_knowledge_candidates`, check that
   they do not contain project-specific specifications, implementation details,
   operational rules, code, customer data, or secrets. Duplicate checks against
   existing memos run automatically inside `paput_add_knowledge_candidates`
   using semantic search.
8. If reusable candidates exist, call `paput_add_knowledge_candidates` with
   `source`, `session_id`, `source_session_updated_at`, and the candidates.
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
- Add candidates to the API-backed pending queue first.
- `paput_add_knowledge_candidates` marks the source session as processed when candidates are submitted.
- Use `paput_mark_processed_session` after reviewing a session that produces no candidates.
- Report duplicates or similar memos when found.
- Prefer high-quality pending candidates over increasing the pending count.
