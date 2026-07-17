# Tools And Use Cases

PaPut MCP is a data-only MCP server. It exposes tools and resources for PaPut data. It does not provide UI widgets.

Remote HTTP mode exposes API-backed PaPut tools. Pending candidates, processed
session markers, and capture policies are stored by the PaPut API. PaPut MCP
does not expose tools that read local Claude/Codex session files; local-file-
capable clients can read those files themselves through the `paput-harvest`
skill workflow and then submit extracted candidates through MCP.

## Confirmation Policy

Clients and assistants should follow these rules:

- Read-only tools may be used when they are relevant to the user's request.
- Create, update, save, publish, discard, and delete tools should be used only when the user's intent is clear.
- Destructive tools require explicit confirmation before execution.
- `paput_save_pending_candidate` requires explicit user approval because it creates a PaPut memo from a pending candidate.
- `paput_delete_skill_sheet_project` should be used only when the user clearly intends to remove a project.
- `paput_update_skill_sheet_project_episodes` should be used only after the MCP client AI model has drafted project episodes and the user intends to save them.
- `paput_update_skill_sheet_faq` full-replaces the user-authored FAQ and should be used only after the user explicitly approves the FAQ content.
- `paput_update_dashboard_analysis` should be used only after the MCP client AI model has generated dashboard analysis and the user intends to save it.
- `paput_set_skill_sheet_skills` replaces the full skill list and should be used only when the complete desired final list is known.
- `paput_discard_pending_candidate` removes a pending item from the save flow and should be confirmed when the candidate may still be useful.
- `paput_delete_goal` should be used only when the user clearly intends to remove a goal.
- `paput_update_project_instructions` requires explicit user approval because the instructions are applied to every future session.
- `paput_discard_project_proposal` and `paput_promote_project_documents` change project document status and should be used only when the user clearly intends to reject a skill proposal or to promote documents into a created skill.
- Update and upsert tools should preserve existing data unless the user requested the change.

## Memo Tools

| Tool                   | Safety            | Use case                                                                                                     |
| ---------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------ |
| `paput_create_memos`   | Write             | Create multiple PaPut memos in one call and return created memo IDs.                                         |
| `paput_search_memo`    | Read-only         | Hybrid keyword-and-semantic search over memos, with category, IDs, date, visibility, and pagination filters. |
| `paput_get_memo`       | Read-only         | Read the full details of a memo by ID.                                                                       |
| `paput_update_memo`    | Destructive/write | Update an existing memo title, body, visibility, categories, or linked projects.                             |
| `paput_get_categories` | Read-only         | List categories before assigning categories or checking duplicates.                                          |

`paput_create_memos` and `paput_update_memo` link projects only when you pass an
explicit `projects` array or a `project_match` input. They do not auto-link from
the Remote HTTP URL `project_alias` context, so a memo with neither stays
unlinked.

`paput_search_memo` runs a hybrid search: pass `query` for combined
keyword-and-semantic matching (matches include a `score` when they come from
the semantic side; keyword-only matches do not), or omit `query` to page
through a plain filtered list ordered by most recently updated. It covers
topic discovery, near-duplicate checks, and exact words, IDs, or identifiers
alike, and it only returns memos owned by the authenticated user.

New and updated memos get embeddings automatically, so semantic matching is
available immediately.

## Note Tools

| Tool                 | Safety            | Use case                                               |
| -------------------- | ----------------- | ------------------------------------------------------ |
| `paput_create_note`  | Write             | Create a note that groups existing memo IDs.           |
| `paput_search_notes` | Read-only         | Search notes by keyword, visibility, and pagination.   |
| `paput_get_note`     | Read-only         | Read a note and its attached memos.                    |
| `paput_update_note`  | Destructive/write | Update a note title, visibility, or attached memo IDs. |

## Skill Sheet Tools

| Tool                                             | Safety            | Use case                                                                                         |
| ------------------------------------------------ | ----------------- | ------------------------------------------------------------------------------------------------ |
| `paput_get_skill_sheet`                          | Read-only         | Read the user's PaPut skill sheet.                                                               |
| `paput_update_skill_sheet_basic_info`            | Destructive/write | Update profile fields such as nearest station, gender, birth date, or years of experience.       |
| `paput_update_skill_sheet_self_pr`               | Destructive/write | Update the self PR section.                                                                      |
| `paput_set_skill_sheet_skills`                   | Destructive/write | Replace the full skill list with a known final state.                                            |
| `paput_upsert_skill_sheet_project`               | Destructive/write | Add or update a skill sheet project by ID or exact title match, including optional achievements. |
| `paput_delete_skill_sheet_project`               | Destructive       | Delete a skill sheet project by ID.                                                              |
| `paput_get_skill_sheet_project_episodes_context` | Read-only         | Get project information and public linked memo bodies for MCP client-side episode drafting.      |
| `paput_update_skill_sheet_project_episodes`      | Destructive/write | Full-replace generated project episodes after explicit user approval.                            |
| `paput_update_skill_sheet_faq`                   | Destructive/write | Full-replace the user-authored Q&A (FAQ) section after explicit user approval.                   |

`paput_get_skill_sheet_project_episodes_context` returns project information and
public linked memo bodies in `structuredContent`; private linked memos are
included only as a count. The MCP client AI should draft episodes from the
public material, present the draft first, and save with
`paput_update_skill_sheet_project_episodes` only when the user intends to.

`paput_update_skill_sheet_project_episodes` full-replaces the generated
episodes for a project. Pass `episodes: []` only when the user explicitly wants
to clear them. The API filters supporting memo IDs to the user's own public
memos and reports dropped IDs.

`paput_update_skill_sheet_faq` full-replaces the FAQ section returned by
`paput_get_skill_sheet`. Unlike project episodes, FAQ question and answer text
are user-authored originals, not AI-generated, so a resolved `related_memos`
list is an optional evidence badge rather than a requirement. Pass `faq: []`
only when the user explicitly wants to clear all items. The API filters
`related_memo_ids` to the user's own public memos and reports dropped IDs per
item.

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
repeatable procedures. They are API-backed and available through Remote HTTP
MCP. Project context and documents are private and are never exposed
publicly.

| Tool                                | Safety            | Use case                                                                                                                                      |
| ----------------------------------- | ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `paput_get_project_context`         | Read-only         | Get a project's always-applied instructions, pending skill proposals, and document counts by kind by fuzzy name match. Call at session start. |
| `paput_get_project_document`        | Read-only         | Read the full body of a project document by ID, found via `paput_search_project_documents`.                                                   |
| `paput_search_project_documents`    | Read-only         | Semantic search over private project documents (vector search). Use before drafting a decision or plan.                                       |
| `paput_add_project_document`        | Write             | Save a design decision, procedure, or skill candidate linked to a project, with same-kind dedup.                                              |
| `paput_update_project_document`     | Destructive/write | Replace a document's title, summary, and body by ID; optionally set status to active or archived.                                             |
| `paput_update_project_instructions` | Destructive/write | Overwrite a project's always-applied instructions (max 8000 chars). Requires explicit user approval.                                          |
| `paput_discard_project_proposal`    | Destructive       | Record that the user rejected a skill proposal so it is not raised again.                                                                     |
| `paput_promote_project_documents`   | Destructive       | Mark a skill proposal and its procedure documents as promoted after a skill is created.                                                       |

When `project_alias` is present in the MCP URL, `paput_get_project_context` is
called with no arguments and the `project` argument is not exposed. Without a
URL project context, provide `project` per call.

`paput_get_project_context` returns instructions, pending proposals, and
document counts only (no document list or bodies). Before drafting a design
decision, implementation plan, or refactor, search past decisions and rejected
alternatives with `paput_search_project_documents`, then fetch bodies on demand
with `paput_get_project_document`. Save settled design decisions and repeatable
procedures with `paput_add_project_document`; when similar procedure records
repeat, the server may suggest turning them into a skill. After the user
approves a skill proposal and the skill is created, call
`paput_promote_project_documents` with the proposal and related procedure IDs; if
the user rejects it, call `paput_discard_project_proposal` with the reason.
Because instructions are loaded in full at session start, change them only with
`paput_update_project_instructions` after explicit user approval. Archive
settled or superseded documents with `paput_update_project_document`'s
`status` argument to exclude them from default search results.

## Knowledge Capture Tools

Knowledge capture state is stored by the PaPut API and is available through
Remote HTTP MCP.

| Tool                               | Safety                 | Use case                                                                        |
| ---------------------------------- | ---------------------- | ------------------------------------------------------------------------------- |
| `paput_add_knowledge_candidates`   | Write to pending queue | Add extracted reusable knowledge candidates before they are saved to PaPut.     |
| `paput_list_processed_sessions`    | Read-only              | List Claude/Codex sessions already reviewed for knowledge capture.              |
| `paput_mark_processed_session`     | Write                  | Mark a reviewed Claude/Codex session as processed when no candidates are added. |
| `paput_list_pending_candidates`    | Read-only              | List pending candidates for review.                                             |
| `paput_update_pending_candidate`   | Write to pending queue | Refine a pending candidate's fields before it is saved.                         |
| `paput_save_pending_candidate`     | Write                  | Save an approved pending candidate as a PaPut memo.                             |
| `paput_discard_pending_candidate`  | Destructive action     | Remove a pending candidate from the save flow.                                  |
| `paput_get_capture_policy`         | Read-only              | Read the capture policy generated from discarded candidates.                    |
| `paput_get_discard_policy_context` | Read-only              | Read discarded candidates and current policy for AI-side policy analysis.       |
| `paput_update_capture_policy`      | Write                  | Save the capture policy generated by the AI.                                    |

Capture policy workflow:

1. `paput_discard_pending_candidate` keeps rejected pending candidates with their discard reason.
2. `paput_get_discard_policy_context` returns those discarded candidates and the current policy to the MCP client AI.
3. The MCP client AI summarizes rejection patterns into a concise Markdown policy.
4. `paput_update_capture_policy` saves that policy.
5. `paput-capture` reads the saved policy with `paput_get_capture_policy` before adding future candidates.

The capture policy is not saved as a PaPut memo. It is stored by the PaPut API
and is available through Remote HTTP MCP.

For past-session import, a local-file-capable AI client should read its own
Claude/Codex session files through the `paput-harvest` skill, then call
`paput_add_knowledge_candidates` or `paput_mark_processed_session`.
