# Tools And Use Cases

PaPut MCP is a data-only MCP server. It exposes tools and resources for PaPut data. It does not provide UI widgets.

Remote HTTP mode exposes API-backed PaPut tools only. Local cache, pending
candidate, and session transcript tools are available in local CLI mode because
they read or write files on the user's device.

## Confirmation Policy

Clients and assistants should follow these rules:

- Read-only tools may be used when they are relevant to the user's request.
- Create, update, save, publish, discard, and delete tools should be used only when the user's intent is clear.
- Destructive tools require explicit confirmation before execution.
- `paput_save_pending_candidate` requires explicit user approval because it creates a PaPut memo from a local pending candidate.
- `paput_delete_skill_sheet_project` should be used only when the user clearly intends to remove a project.
- `paput_update_skill_sheet_project_ai_summary` should be used only after the MCP client AI model has generated a project summary and the user intends to save it.
- `paput_update_skill_sheet_public_profile` should be used only after the MCP client AI model has generated a public profile (headline, profile summary, or strength labels) and the user intends to save it.
- `paput_update_dashboard_analysis` should be used only after the MCP client AI model has generated dashboard analysis and the user intends to save it.
- `paput_set_skill_sheet_skills` replaces the full skill list and should be used only when the complete desired final list is known.
- `paput_discard_pending_candidate` removes a pending item from the save flow and should be confirmed when the candidate may still be useful.
- `paput_delete_goal` should be used only when the user clearly intends to remove a goal.
- `paput_update_project_instructions` requires explicit user approval because the instructions are applied to every future session.
- `paput_discard_project_proposal` and `paput_promote_project_documents` change project document status and should be used only when the user clearly intends to reject a skill proposal or to promote documents into a created skill.
- Update and upsert tools should preserve existing data unless the user requested the change.

## Memo Tools

| Tool                             | Safety            | Use case                                                                         |
| -------------------------------- | ----------------- | -------------------------------------------------------------------------------- |
| `paput_create_memos`             | Write             | Create multiple PaPut memos in one call and return created memo IDs.             |
| `paput_search_memo`              | Read-only         | Search memos by keyword, category, IDs, date, visibility, or pagination.         |
| `paput_find_similar_memos`       | Read-only         | Find memos semantically similar to a natural-language query using vector search. |
| `paput_backfill_memo_embeddings` | Write             | Generate embeddings for existing memos that do not have one yet.                 |
| `paput_get_memo`                 | Read-only         | Read the full details of a memo by ID.                                           |
| `paput_update_memo`              | Destructive/write | Update an existing memo title, body, visibility, categories, or linked projects. |
| `paput_get_categories`           | Read-only         | List categories before assigning categories or checking duplicates.              |

`paput_create_memos` and `paput_update_memo` can link projects through explicit
`projects`, a `project_match` input, or local `PAPUT_PROJECT_MATCH` in local CLI
mode.

`paput_search_memo` matches surface text, while `paput_find_similar_memos`
matches meaning, so it finds related memos even when the wording differs.
Prefer `paput_find_similar_memos` for topic discovery and near-duplicate
checks, and `paput_search_memo` for exact words, IDs, or identifiers. Both
tools only return memos owned by the authenticated user.

New and updated memos get embeddings automatically. If memos created before
semantic search was enabled are missing from similarity results, run
`paput_backfill_memo_embeddings` (up to 100 memos per call) and repeat while
the response reports `has_more: true`.

## Note Tools

| Tool                 | Safety            | Use case                                               |
| -------------------- | ----------------- | ------------------------------------------------------ |
| `paput_create_note`  | Write             | Create a note that groups existing memo IDs.           |
| `paput_search_notes` | Read-only         | Search notes by keyword, visibility, and pagination.   |
| `paput_get_note`     | Read-only         | Read a note and its attached memos.                    |
| `paput_update_note`  | Destructive/write | Update a note title, visibility, or attached memo IDs. |

## Skill Sheet Tools

| Tool                                            | Safety            | Use case                                                                                          |
| ----------------------------------------------- | ----------------- | ------------------------------------------------------------------------------------------------- |
| `paput_get_skill_sheet`                         | Read-only         | Read the user's PaPut skill sheet.                                                                |
| `paput_update_skill_sheet_basic_info`           | Destructive/write | Update profile fields such as nearest station, gender, birth date, or years of experience.        |
| `paput_update_skill_sheet_self_pr`              | Destructive/write | Update the self PR section.                                                                       |
| `paput_update_skill_sheet_public_profile`       | Destructive/write | Save an AI-generated public profile: headline, profile summary, and strength labels.              |
| `paput_set_skill_sheet_skills`                  | Destructive/write | Replace the full skill list with a known final state.                                             |
| `paput_upsert_skill_sheet_project`              | Destructive/write | Add or update a skill sheet project by ID or exact title match.                                   |
| `paput_delete_skill_sheet_project`              | Destructive       | Delete a skill sheet project by ID.                                                               |
| `paput_get_skill_sheet_project_summary_context` | Read-only         | Get project information and related memo bodies for MCP client-side summary generation.           |
| `paput_update_skill_sheet_project_ai_summary`   | Destructive/write | Save an AI-generated project summary.                                                             |
| `paput_get_public_profile_context`              | Read-only         | Get public materials (skill sheet, public memos, category map, growth) for AI summary generation. |

`paput_update_skill_sheet_public_profile` saves the headline (one-line catchphrase),
profile_summary (multi-line overall summary), strength_labels (array of strength
items with optional description, category names, and project IDs), and
project_highlights (short project evidence shown on the AI Summary tab) fields
generated by the MCP client AI model. It should be used only after the AI model has
generated a public profile and the user intends to save it.

`paput_get_public_profile_context` returns public materials only (skill sheet,
public memos, category map, and recently growing areas) in `structuredContent`
so the MCP client AI model can generate the headline, profile_summary,
strength_labels, and project_highlights shown on the AI Summary tab. It intentionally
excludes private dashboard analysis and goals. Present the draft first and save with
`paput_update_skill_sheet_public_profile` only when the user intends to.

## Goal Tools

| Tool                | Safety            | Use case                                                                            |
| ------------------- | ----------------- | ----------------------------------------------------------------------------------- |
| `paput_list_goals`  | Read-only         | List active and archived goals. Active goals are current analysis targets.          |
| `paput_create_goal` | Write             | Create a goal for career, learning, portfolio, project, or other progress tracking. |
| `paput_update_goal` | Destructive/write | Update a goal. The update request body includes `id`, and success returns no body.  |
| `paput_delete_goal` | Destructive       | Delete a goal by ID. The API path uses `/goal/:id`.                                 |

Archived goals are historical context. Active goals are normally used as the basis for
dashboard analysis.

## Dashboard Analysis Tools

| Tool                                   | Safety            | Use case                                                                                        |
| -------------------------------------- | ----------------- | ----------------------------------------------------------------------------------------------- |
| `paput_get_dashboard_analysis`         | Read-only         | Get the saved dashboard analysis result.                                                        |
| `paput_get_dashboard_analysis_context` | Read-only         | Get dashboard summary, goals, skill sheet, recent memos, notes, and categories for AI analysis. |
| `paput_update_dashboard_analysis`      | Destructive/write | Save dashboard analysis generated by the MCP client AI model.                                   |

`paput_get_dashboard_analysis_context` returns raw source data in
`structuredContent` for MCP client-side analysis. The context asks the MCP client
AI model to analyze current position, strengths, recently growing areas, thin
areas, missing knowledge against goals, next knowledge to learn, and expressions
suitable for a skill sheet or career history. It also instructs the client AI to
write the final output in the user's language. The MCP server does not
recalculate dashboard continuity from activities; it relies on summary values
returned by the PaPut API.

## Project Document Tools

These tools manage private, project-scoped context for a PaPut skill sheet
project: always-applied instructions, accumulated design decisions, and
repeatable procedures. They are API-backed and available in both remote HTTP and
local CLI modes. Project context and documents are private and are never exposed
publicly.

| Tool                                | Safety            | Use case                                                                                            |
| ----------------------------------- | ----------------- | --------------------------------------------------------------------------------------------------- |
| `paput_get_project_context`         | Read-only         | Get a project's always-applied instructions and document index by fuzzy name match. Call at session start. |
| `paput_get_project_document`        | Read-only         | Read the full body of a project document by ID, using the index from `paput_get_project_context`.   |
| `paput_add_project_document`        | Write             | Save a design decision, procedure, or skill candidate linked to a project, with same-kind dedup.    |
| `paput_update_project_document`     | Destructive/write | Replace a document's title, summary, and body by ID. Fetch the current document first for partial edits. |
| `paput_update_project_instructions` | Destructive/write | Overwrite a project's always-applied instructions (max 8000 chars). Requires explicit user approval. |
| `paput_discard_project_proposal`    | Destructive       | Record that the user rejected a skill proposal so it is not raised again.                            |
| `paput_promote_project_documents`   | Destructive       | Mark a skill proposal and its procedure documents as promoted after a skill is created.              |

In local CLI mode the project is resolved from `PAPUT_PROJECT_MATCH`, so
`paput_get_project_context` is called with no arguments and the `project`
argument is not exposed. In remote HTTP mode there is no configured match, so
`project` is provided per call.

`paput_get_project_context` returns the document index only (no bodies); fetch
bodies on demand with `paput_get_project_document`. Save settled design
decisions and repeatable procedures with `paput_add_project_document`; when
similar procedure records repeat, the server may suggest turning them into a
skill. After the user approves a skill proposal and the skill is created, call
`paput_promote_project_documents` with the proposal and related procedure IDs; if
the user rejects it, call `paput_discard_project_proposal` with the reason.
Because instructions are loaded in full at session start, change them only with
`paput_update_project_instructions` after explicit user approval.

## Knowledge Capture And Local Cache Tools

These tools are local CLI mode only. They are not listed by the remote HTTP MCP
server.

| Tool                               | Safety                       | Use case                                                                    |
| ---------------------------------- | ---------------------------- | --------------------------------------------------------------------------- |
| `paput_cache_status`               | Read-only                    | Inspect local cache, pending candidates, processed sessions, and policy.    |
| `paput_scan_sessions`              | Read-only                    | Scan local Claude and Codex session logs for reusable knowledge sources.    |
| `paput_get_session_transcript`     | Read-only                    | Read a selected local Claude or Codex session transcript.                   |
| `paput_add_knowledge_candidates`   | Write to local pending queue | Add extracted reusable knowledge candidates before they are saved to PaPut. |
| `paput_list_pending_candidates`    | Read-only                    | List pending candidates for review.                                         |
| `paput_update_pending_candidate`   | Write to local pending queue | Refine a pending candidate's fields before it is saved.                     |
| `paput_save_pending_candidate`     | Write                        | Save an approved pending candidate as a PaPut memo.                         |
| `paput_discard_pending_candidate`  | Destructive local action     | Remove a pending candidate from the save flow.                              |
| `paput_get_capture_policy`         | Read-only                    | Read the local capture policy generated from discarded candidates.          |
| `paput_get_discard_policy_context` | Read-only                    | Read discarded candidates and current policy for AI-side policy analysis.   |
| `paput_update_capture_policy`      | Write to local cache         | Save the local capture policy generated by the AI.                          |

Capture policy workflow:

1. `paput_discard_pending_candidate` keeps rejected pending candidates in the local cache with their discard reason.
2. `paput_get_discard_policy_context` returns those discarded candidates and the current policy to the MCP client AI.
3. The MCP client AI summarizes rejection patterns into a concise Markdown policy.
4. `paput_update_capture_policy` saves that policy locally.
5. `paput-capture` reads the saved policy with `paput_get_capture_policy` before adding future candidates.

The capture policy is local-only. It is not saved as a PaPut memo and is not
available from the remote HTTP MCP server.
