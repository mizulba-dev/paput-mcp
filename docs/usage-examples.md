# Usage Examples

These examples show typical ways to use PaPut MCP from an AI assistant.

## 1. Create A Memo From A Remote MCP Client

Prompt:

```text
Create a private PaPut memo summarizing this conversation.
```

Expected tool flow:

1. `paput_create_memo`
2. `paput_search_memo` or `paput_get_memo` when the user wants to verify the result

Use case: quickly save useful content from Claude, ChatGPT, Codex, or another remote MCP client.

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

Local mode note: `paput_add_knowledge_candidates` and pending review tools are
local CLI mode tools.

## 3. Capture Reusable Knowledge From A Codex Session

Prompt:

```text
Scan recent Codex sessions, find the OAuth implementation session, and extract reusable knowledge candidates.
```

Expected tool flow:

1. `paput_scan_sessions`
2. `paput_get_session_transcript`
3. `paput_add_knowledge_candidates`

Use case: turn completed development work into reviewable knowledge without immediately publishing it to PaPut.

Local mode note: session scanning and transcript reading are local CLI mode
tools.

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

Local mode note: pending candidate tools are local CLI mode tools.

## 5. Update A Skill Sheet Project

Prompt:

```text
Update my PaPut skill sheet project for the MCP server work with the latest technologies and responsibilities.
```

Expected tool flow:

1. `paput_get_skill_sheet`
2. `paput_upsert_skill_sheet_project`
3. `paput_get_skill_sheet` to verify the final result

Use case: maintain an accurate skill sheet after project milestones.

## 6. Organize Memos Into A Note

Prompt:

```text
Find my MCP-related memos and create a PaPut note that groups the most relevant ones.
```

Expected tool flow:

1. `paput_search_memo`
2. `paput_create_note`
3. `paput_get_note` to verify attached memo IDs

Use case: create curated collections from existing PaPut memos.

## 7. Generate And Save Dashboard Analysis

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

## 8. Generate And Save AI Summary

Prompt:

```text
Create my PaPut public AI summary, then save it.
```

Expected tool flow:

1. `paput_get_public_profile_context`
2. MCP client AI generates headline, profile_summary, and strength_labels from `structuredContent`
3. `paput_update_skill_sheet_public_profile` after the user intends to save the result
4. `paput_get_skill_sheet` to verify the saved result

Use case: generate the public profile shown on the AI Summary tab from public
materials only. The context excludes private dashboard analysis and goals.
