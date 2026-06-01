# Usage Examples

These examples show typical ways to use PaPut MCP from an AI assistant.

## 1. Search Existing Memos Before Creating Knowledge

Prompt:

```text
Search my PaPut memos for existing notes about OAuth dynamic client registration before creating a new knowledge candidate.
```

Expected tool flow:

1. `paput_search_memo`
2. `paput_add_knowledge_candidates` only when no duplicate or near-duplicate exists
3. `paput_list_pending_candidates` when the user wants to review pending items

Use case: avoid duplicate long-term knowledge while preserving useful decisions from engineering work.

## 2. Capture Reusable Knowledge From A Codex Session

Prompt:

```text
Scan recent Codex sessions, find the OAuth implementation session, and extract reusable knowledge candidates.
```

Expected tool flow:

1. `paput_scan_sessions`
2. `paput_get_session_transcript`
3. `paput_add_knowledge_candidates`

Use case: turn completed development work into reviewable knowledge without immediately publishing it to PaPut.

## 3. Save An Approved Pending Candidate

Prompt:

```text
Review my pending PaPut knowledge candidates and save the OAuth metadata candidate if it is not a duplicate.
```

Expected tool flow:

1. `paput_list_pending_candidates`
2. `paput_search_memo`
3. `paput_save_pending_candidate` only after explicit user approval

Use case: keep the user in control before creating a permanent PaPut memo.

## 4. Update A Skill Sheet Project

Prompt:

```text
Update my PaPut skill sheet project for the MCP server work with the latest technologies and responsibilities.
```

Expected tool flow:

1. `paput_get_skill_sheet`
2. `paput_upsert_skill_sheet_project`
3. `paput_get_skill_sheet` to verify the final result

Use case: maintain an accurate skill sheet after project milestones.

## 5. Organize Memos Into A Note

Prompt:

```text
Find my MCP-related memos and create a PaPut note that groups the most relevant ones.
```

Expected tool flow:

1. `paput_search_memo`
2. `paput_create_note`
3. `paput_get_note` to verify attached memo IDs

Use case: create curated collections from existing PaPut memos.
