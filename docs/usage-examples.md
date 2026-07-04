# Usage Examples

These examples show typical ways to use PaPut MCP from an AI assistant.

## 1. Create Memos From A Remote MCP Client

Prompt:

```text
Create private PaPut memos summarizing these learnings and return their IDs.
```

Expected tool flow:

1. `paput_create_memos`
2. `paput_search_memo` or `paput_get_memo` when the user wants to verify the result

Use case: quickly save one or more useful items from Claude, ChatGPT, Codex, or another remote MCP client.

## 2. Search Existing Memos Before Creating Knowledge

Prompt:

```text
Search my PaPut memos for existing notes about OAuth dynamic client registration before creating a new knowledge candidate.
```

Expected tool flow:

1. `paput_search_memo`
2. `paput_add_knowledge_candidates` only when no duplicate or near-duplicate exists
3. `paput_list_pending_candidates` when the user wants to review pending items

Use case: avoid duplicate long-term knowledge while preserving useful decisions from engineering work.

Note: pending candidate tools are API-backed through Remote HTTP MCP.

## 3. Capture Reusable Knowledge From A Codex Session

Prompt:

```text
Scan recent Codex sessions, find the OAuth implementation session, and extract reusable knowledge candidates.
```

Expected flow:

1. `paput_list_processed_sessions` to skip sessions already reviewed
2. The local-file-capable AI client reads `~/.codex/sessions/**/*.jsonl`
3. `paput_add_knowledge_candidates` when reusable candidates are found
4. `paput_mark_processed_session` when a reviewed session has no candidates

Use case: turn completed development work into reviewable knowledge without immediately publishing it to PaPut.

Client capability note: local session import requires an AI client that can read
files on the user's device, such as Codex or Claude Code. PaPut MCP itself does
not read local session files.

## 4. Save An Approved Pending Candidate

Prompt:

```text
Review my pending PaPut knowledge candidates and save the OAuth metadata candidate if it is not a duplicate.
```

Expected tool flow:

1. `paput_list_pending_candidates`
2. `paput_search_memo`
3. `paput_save_pending_candidate` only after explicit user approval

Use case: keep the user in control before creating a permanent PaPut memo.

Note: pending candidate tools are API-backed through Remote HTTP MCP.

## 5. Refresh The Capture Policy From Discards

Prompt:

```text
Analyze my discarded PaPut candidates and refresh the capture policy.
```

Expected tool flow:

1. `paput_get_discard_policy_context`
2. MCP client AI analyzes discarded candidates and generates a concise policy
3. `paput_update_capture_policy`
4. `paput_get_capture_policy` when the user wants to verify the saved policy

Use case: turn repeated discard decisions into reusable capture criteria
that future `paput-capture` runs can apply before adding pending candidates.

Note: capture policy tools are API-backed through Remote HTTP MCP. The generated
policy is not saved as a PaPut memo.

## 6. Update A Skill Sheet Project

Prompt:

```text
Update my PaPut skill sheet project for the MCP server work with the latest technologies and responsibilities.
```

Expected tool flow:

1. `paput_get_skill_sheet`
2. `paput_upsert_skill_sheet_project`
3. `paput_get_skill_sheet` to verify the final result

Use case: maintain an accurate skill sheet after project milestones.

## 7. Organize Memos Into A Note

Prompt:

```text
Find my MCP-related memos and create a PaPut note that groups the most relevant ones.
```

Expected tool flow:

1. `paput_search_memo`
2. `paput_create_note`
3. `paput_get_note` to verify attached memo IDs

Use case: create curated collections from existing PaPut memos.

## 8. Generate And Save Dashboard Analysis

Prompt:

```text
Analyze my PaPut dashboard and goals, then save the dashboard analysis.
```

Expected tool flow:

1. `paput_get_dashboard_analysis_context`
2. MCP client AI generates the analysis from `structuredContent`
3. `paput_update_dashboard_analysis` after the user intends to save the result
4. `paput_get_dashboard_analysis` to verify the saved result

Use case: keep analysis generation in the MCP client AI while PaPut MCP only
retrieves source data and saves the finished analysis.

## 9. Draft And Save Project Episodes

Prompt:

```text
Draft design-and-judgment episodes for my PaPut MCP project, then save them after I approve the draft.
```

Expected tool flow:

1. `paput_get_skill_sheet`
2. `paput_get_skill_sheet_project_episodes_context`
3. MCP client AI drafts episodes from the public linked memos in `structuredContent`
4. `paput_update_skill_sheet_project_episodes` after the user approves the draft
5. `paput_get_skill_sheet` to verify the saved result

Use case: publish project-level judgment evidence backed by public linked memos.

## 10. Draft And Save Self PR

Prompt:

```text
Draft a new self PR for my PaPut skill sheet and save it after I approve it.
```

Expected tool flow:

1. `paput_get_skill_sheet`
2. `paput_search_memo` and `paput_get_memo` only when additional public memo evidence is needed
3. MCP client AI drafts the self PR
4. `paput_update_skill_sheet_self_pr` after the user approves the text
5. `paput_get_skill_sheet` to verify the saved result

Use case: draft the skill sheet self PR from existing profile, skills, projects,
episodes, achievements, and public decision/operation/principle memos.

## 11. Find Related Memos By Meaning

Prompt:

```text
Find my PaPut memos related to database schema migration tooling, even if they use different wording.
```

Expected tool flow:

1. `paput_find_similar_memos` with a natural-language query
2. `paput_get_memo` when the user wants the full body of a result
3. `paput_search_memo` as a fallback for exact words, IDs, or identifiers

Use case: discover related knowledge or near-duplicate memos when the saved
memos use different wording than the query (for example, "DB 移行" vs
"マイグレーション"). Results include a similarity score per memo.

If older memos never appear in similarity results, run
`paput_backfill_memo_embeddings` and repeat while the response reports
`has_more: true`. This is a one-time setup step; new and updated memos are
embedded automatically.

## 12. Source And Save Interview Q&A (FAQ)

Prompt:

```text
Help me build out my PaPut FAQ from questions I've been asked in interviews and my memos, then save it after I approve it.
```

Expected tool flow:

1. `paput_get_skill_sheet` to see the current `faq` and profile
2. `paput_get_categories` and `paput_search_memo` to find decision/operation/principle clusters for memo-derived question candidates
3. Web search (or, if unavailable, general model knowledge labeled as tentative) for general technical interview questions, filtered to the user's skills
4. MCP client AI presents candidates from all three sources; the user adopts or rejects each one
5. MCP client AI drafts a first-person answer for each adopted question
6. `paput_get_skill_sheet` again, then `paput_update_skill_sheet_faq` with the merged full list, after the user approves the drafts. Check the per-item `dropped_ids` in that response.
7. `paput_get_skill_sheet` to verify the saved result

Use case: build the skill sheet's Q&A section from real interview questions,
existing memo evidence, and general interview-question research, without
locking the question set to a static list baked into the skill.
