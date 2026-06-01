# Tools And Use Cases

PaPut MCP is a data-only MCP server. It exposes tools and resources for PaPut data. It does not provide UI widgets.

## Confirmation Policy

Clients and assistants should follow these rules:

- Read-only tools may be used when they are relevant to the user's request.
- Create, update, save, publish, discard, and delete tools should be used only when the user's intent is clear.
- Destructive tools require explicit confirmation before execution.
- `paput_save_pending_candidate` requires explicit user approval because it creates a PaPut memo from a local pending candidate.
- `paput_delete_skill_sheet_project` should be used only when the user clearly intends to remove a project.
- `paput_set_skill_sheet_skills` replaces the full skill list and should be used only when the complete desired final list is known.
- `paput_discard_pending_candidate` removes a pending item from the save flow and should be confirmed when the candidate may still be useful.
- Update and upsert tools should preserve existing data unless the user requested the change.

## Memo Tools

| Tool                   | Safety            | Use case                                                                         |
| ---------------------- | ----------------- | -------------------------------------------------------------------------------- |
| `paput_create_memo`    | Write             | Create a PaPut memo when the user explicitly asks to save content directly.      |
| `paput_search_memo`    | Read-only         | Search memos by keyword, category, IDs, date, visibility, or pagination.         |
| `paput_get_memo`       | Read-only         | Read the full details of a memo by ID.                                           |
| `paput_update_memo`    | Destructive/write | Update an existing memo title, body, visibility, categories, or linked projects. |
| `paput_get_categories` | Read-only         | List categories before assigning categories or checking duplicates.              |

## Note Tools

| Tool                 | Safety            | Use case                                               |
| -------------------- | ----------------- | ------------------------------------------------------ |
| `paput_create_note`  | Write             | Create a note that groups existing memo IDs.           |
| `paput_search_notes` | Read-only         | Search notes by keyword, visibility, and pagination.   |
| `paput_get_note`     | Read-only         | Read a note and its attached memos.                    |
| `paput_update_note`  | Destructive/write | Update a note title, visibility, or attached memo IDs. |

## Skill Sheet Tools

| Tool                                  | Safety            | Use case                                                                                   |
| ------------------------------------- | ----------------- | ------------------------------------------------------------------------------------------ |
| `paput_get_skill_sheet`               | Read-only         | Read the user's PaPut skill sheet.                                                         |
| `paput_update_skill_sheet_basic_info` | Destructive/write | Update profile fields such as nearest station, gender, birth date, or years of experience. |
| `paput_update_skill_sheet_self_pr`    | Destructive/write | Update the self PR section.                                                                |
| `paput_set_skill_sheet_skills`        | Destructive/write | Replace the full skill list with a known final state.                                      |
| `paput_upsert_skill_sheet_project`    | Destructive/write | Add or update a skill sheet project by ID or exact title match.                            |
| `paput_delete_skill_sheet_project`    | Destructive       | Delete a skill sheet project by ID.                                                        |

## Knowledge Capture And Local Cache Tools

| Tool                              | Safety                       | Use case                                                                      |
| --------------------------------- | ---------------------------- | ----------------------------------------------------------------------------- |
| `paput_cache_status`              | Read-only                    | Inspect local cache, pending candidates, processed sessions, and sync status. |
| `paput_sync_remote_memos`         | Write to local cache         | Sync existing PaPut memos into the local cache for duplicate detection.       |
| `paput_scan_sessions`             | Read-only                    | Scan local Claude and Codex session logs for reusable knowledge sources.      |
| `paput_get_session_transcript`    | Read-only                    | Read a selected local Claude or Codex session transcript.                     |
| `paput_add_knowledge_candidates`  | Write to local pending queue | Add extracted reusable knowledge candidates before they are saved to PaPut.   |
| `paput_list_pending_candidates`   | Read-only                    | List pending candidates for review.                                           |
| `paput_save_pending_candidate`    | Write                        | Save an approved pending candidate as a PaPut memo.                           |
| `paput_discard_pending_candidate` | Destructive local action     | Remove a pending candidate from the save flow.                                |
