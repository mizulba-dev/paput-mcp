# PaPut MCP Server

PaPut MCP Server connects [PaPut](https://paput.io) to AI assistants through the Model Context Protocol (MCP). PaPut helps you capture the decisions, trade-offs, and operating practices behind your work — not just the facts an AI can already recall — and turn them into a durable record of how you think and work, including your skill sheet.

Remote HTTP mode lets Claude, ChatGPT, Codex, Claude Code, and other MCP clients create, search, and organize your PaPut memos, notes, and skill sheet through OAuth. As AI commoditizes raw know-how, PaPut focuses on the judgment that stays yours: why you chose one approach over another, and how you work. Local-file-capable clients such as Claude Code and Codex can also use the installed PaPut skills to harvest reusable decisions and practices from their own session files into the same API-backed workflow.

## Features

### PaPut Data Management

- Create, search, read, and update memos
- Create, search, read, and update notes
- Read and update skill sheet profile fields, self PR, skills, and projects
- Delete skill sheet projects when explicitly requested
- Create, list, update, and delete goals
- Get dashboard context and save AI-generated dashboard analysis results
- Get private project context and manage project documents (design decisions and repeatable procedures)

### Knowledge Capture

- Add reusable knowledge candidates to the API-backed pending queue
- Track processed Claude/Codex sessions through the PaPut API
- Reject near-duplicate candidates automatically using semantic search against existing memos
- Prevent duplicate pending candidates with fingerprints
- Derive a capture policy from discarded candidates
- Save pending candidates to PaPut only after explicit user approval
- Preserve the source session updated timestamp as the PaPut memo creation timestamp
- Link pending candidates to PaPut projects through `project_alias` in the Remote HTTP MCP URL
- Install Claude/Codex skills and global rules for PaPut workflows

## Installation

### Remote HTTP connection (URL + OAuth)

For MCP clients, use the Remote HTTP server URL and complete the OAuth flow in
the client. No local MCP server process or local login command is required.

```json
"paput": {
  "type": "http",
  "url": "https://mcp.paput.io/mcp"
}
```

### CLI utilities (`setup-ai` / `export-skill`)

The `paput-mcp` package is still useful as a local CLI utility for installing or
exporting PaPut skills and rules:

```bash
npx -y paput-mcp setup-ai
npx -y paput-mcp export-skill
```

Running `npx -y paput-mcp` with no subcommand prints help only. It does not
start an MCP server and does not sign in to PaPut.

You can also install the CLI globally:

```bash
npm install -g paput-mcp
```

## MCP Configuration

### Remote HTTP Mode

Use Remote HTTP mode for PaPut MCP connections. It uses OAuth-based MCP setup
for PaPut data operations, including memos, notes, skill sheets, and
API-backed knowledge capture.

```json
"paput": {
  "type": "http",
  "url": "https://mcp.paput.io/mcp"
}
```

Pending candidates, processed session markers, and capture policies are
API-backed. Use `project_alias` in the remote URL when you want to pin
operations to a project.

```json
"paput": {
  "type": "http",
  "url": "https://mcp.paput.io/mcp?project_alias=paput"
}
```

### Environment Variables

- `PAPUT_HOME` - Optional output root for `setup-ai` generated skills and
  managed links. Defaults to `~/.paput`.

## AI Setup

Run this command to install PaPut skills and global rules for Claude and Codex:

```bash
npx -y paput-mcp setup-ai
```

The setup command:

- Creates canonical PaPut skills under `~/.paput/skills`
- Creates symlinks under `~/.claude/skills` when Claude is available
- Creates symlinks under `~/.agents/skills` when Codex is available
- Adds PaPut usage rules to Claude/Codex global instruction files

Options:

```bash
# Do not update global rules
npx -y paput-mcp setup-ai --no-rules

# Refresh PaPut-managed links and rule blocks
npx -y paput-mcp setup-ai --force

# Configure only Claude or only Codex
npx -y paput-mcp setup-ai --claude-only
npx -y paput-mcp setup-ai --codex-only

# Update global rules only, without installing skills
# (e.g. when skills come from the PaPut plugin)
npx -y paput-mcp setup-ai --rules-only

# Remove CLI-managed skills and their symlinks (rules are kept)
npx -y paput-mcp setup-ai --remove-skills
```

Migrating to the PaPut plugin? Run `setup-ai --remove-skills` to drop the
CLI-installed skills, then `setup-ai --rules-only --force` to keep the global
rules up to date. The plugin provides the same skills under the `paput`
namespace (e.g. `/paput:capture`).

Generated skills:

- `paput-harvest` - Harvest reusable knowledge from past local sessions in local-file-capable AI clients. Safe to run repeatedly; skips already-processed sessions.
- `paput-capture` - Extract reusable knowledge candidates from the current conversation or a specified topic and add them to pending.
- `paput-save` - Review pending candidates first, then save only candidates explicitly approved by the user.
- `paput-principle-synthesizer` - Synthesize cross-cutting principle candidates from your accumulated decision/operation memos and add them to pending.
- `paput-analyze-discard-policy` - Analyze discarded candidates and save a capture policy used by future captures.
- `paput-dashboard-analysis` - Analyze PaPut dashboard context and optionally save the generated dashboard analysis.
- `paput-project-document` - Save a project-specific design decision or repeatable procedure as a PaPut project document.
- `paput-project-episodes` - Draft and optionally save design-and-judgment episodes for a skill sheet project.
- `paput-self-pr-draft` - Draft the skill sheet self PR and save it only after explicit approval.
- `paput-interview-qa` - Source, draft, and optionally save the skill sheet Q&A (FAQ) section from interview questions, memo clusters, and general interview FAQ research.

For Claude Desktop, export skill ZIP files and upload them from
`Customize > Skills`:

```bash
npx -y paput-mcp export-skill
```

The command writes all PaPut skill ZIP files to `~/Downloads`. To export one
skill only:

```bash
npx -y paput-mcp export-skill paput-dashboard-analysis
```

To choose another output directory:

```bash
npx -y paput-mcp export-skill --output ~/Downloads/paput-skills
```

## Knowledge Workflow

Knowledge capture uses a two-step flow to avoid accidental memo creation.

```text
Extract reusable knowledge candidates
  ↓
Add candidates to pending
  ↓
Save approved candidates to PaPut
```

The global rules installed by `setup-ai` ask the AI assistant to automatically check whether completed work, solved problems, or settled design decisions produced reusable knowledge. Candidates that are reusable, non-duplicate, non-sensitive, and not project-specific may be added to pending without asking for approval. The assistant should report the title, categories, and candidate ID after adding them.

If a candidate may be duplicate, sensitive, project-specific, or too ambiguous, the assistant should ask before adding it to pending.

Use `paput-capture` when the assistant did not automatically suggest candidates.

```text
Create PaPut knowledge candidates from this conversation
```

Use `paput-save` when you want to save pending candidates to PaPut.

```text
Review my PaPut pending candidates
```

Use `paput-analyze-discard-policy` after discarding candidates when you want the
assistant to turn rejection history into a capture policy. Future
`paput-capture` runs read this policy before adding new pending candidates.

```text
Analyze my discarded PaPut candidates and refresh the capture policy
```

Claude can call skills such as `/paput-save`. Codex can call `$paput-save` or use natural language.

## Available Tools

Detailed public tool documentation is available in [docs/tools.md](docs/tools.md).

### Memo Management

- `paput_create_memos` - Create multiple PaPut memos in one call and return created memo IDs.
- `paput_search_memo` - Search PaPut memos by keyword, category, IDs, date, visibility, or pagination.
- `paput_find_similar_memos` - Find memos semantically similar to a natural-language query (vector search). Finds related memos even when the wording differs.
- `paput_backfill_memo_embeddings` - Generate embeddings for existing memos so they appear in similarity results. Needed once after semantic search is enabled; new and updated memos are embedded automatically.
- `paput_get_memo` - Get full details for a memo.
- `paput_update_memo` - Update an existing memo.
- `paput_get_categories` - List available categories.

### Note Management

- `paput_create_note` - Create a note that groups existing memos.
- `paput_search_notes` - Search notes by keyword, visibility, and pagination.
- `paput_get_note` - Get full details for a note.
- `paput_update_note` - Update a note title, visibility, or attached memo IDs.

### Skill Sheet Management

- `paput_get_skill_sheet` - Get the full skill sheet.
- `paput_update_skill_sheet_basic_info` - Update basic profile fields.
- `paput_update_skill_sheet_self_pr` - Update the self PR section.
- `paput_set_skill_sheet_skills` - Replace the full skill list with the provided final state.
- `paput_upsert_skill_sheet_project` - Add or update a skill sheet project, including optional achievement bullets.
- `paput_delete_skill_sheet_project` - Delete a skill sheet project.
- `paput_get_skill_sheet_project_episodes_context` - Get project information and public linked memo bodies so the MCP client AI model can draft design-and-judgment episodes.
- `paput_update_skill_sheet_project_episodes` - Full-replace the generated project episodes after explicit user approval.
- `paput_update_skill_sheet_faq` - Full-replace the user-authored Q&A (FAQ) section. Pass `faq: []` to clear it.

### Goal Management

- `paput_list_goals` - List active and archived goals.
- `paput_create_goal` - Create a goal.
- `paput_update_goal` - Update a goal. The update body includes the goal ID.
- `paput_delete_goal` - Delete a goal by ID.

### Dashboard Analysis

- `paput_get_dashboard_analysis` - Get the saved dashboard analysis.
- `paput_get_dashboard_analysis_context` - Get dashboard, goal, skill sheet, memo, note, and category context so the MCP client AI model can generate an analysis.
- `paput_update_dashboard_analysis` - Save an AI-generated dashboard analysis.

### Project Document

Project document state is private, project-scoped, API-backed, and available
through Remote HTTP MCP.

- `paput_get_project_context` - Get a project's always-applied instructions and document index. Call at session start.
- `paput_get_project_document` - Read the full body of a project document by ID.
- `paput_add_project_document` - Save a design decision, procedure, or skill candidate linked to a project.
- `paput_update_project_document` - Replace a project document's title, summary, and body.
- `paput_update_project_instructions` - Overwrite a project's always-applied instructions. Requires explicit user approval.
- `paput_discard_project_proposal` - Record that the user rejected a skill proposal.
- `paput_promote_project_documents` - Mark a skill proposal and related procedure documents as promoted after a skill is created.

### Knowledge Capture

Knowledge capture state is stored by the PaPut API and is available through
Remote HTTP MCP.

- `paput_add_knowledge_candidates` - Add extracted knowledge candidates to pending.
- `paput_list_processed_sessions` - List Claude/Codex sessions already reviewed for knowledge capture.
- `paput_mark_processed_session` - Mark a reviewed session as processed when no candidates are added.
- `paput_list_pending_candidates` - List pending candidates.
- `paput_update_pending_candidate` - Update a pending candidate's fields before it is saved.
- `paput_save_pending_candidate` - Save an approved pending candidate as a PaPut memo.
- `paput_discard_pending_candidate` - Discard a pending candidate.
- `paput_get_capture_policy` - Read the capture policy generated from discarded candidates.
- `paput_get_discard_policy_context` - Read discarded candidates and the current policy for AI-side policy analysis.
- `paput_update_capture_policy` - Save the capture policy generated by the AI.

### Local Session Import

PaPut MCP no longer reads local Claude/Codex session files as MCP tools. When
using Claude Code, Codex, or another AI client with local file access, run the
installed `paput-harvest` skill (safe to run repeatedly; it skips
already-processed sessions). The AI client reads its own session files, extracts
reusable knowledge, and submits only the resulting candidates and processed
session markers through PaPut MCP.

## Confirmation Guidance

Write and destructive tools should be used only when the user intent is clear. In particular:

- `paput_save_pending_candidate` requires explicit user approval to save a pending candidate to PaPut.
- `paput_delete_skill_sheet_project` should be used only when the user intends to delete a project.
- `paput_update_skill_sheet_project_episodes` should be used only after the MCP client AI model has drafted project episodes and the user intends to save them.
- `paput_update_skill_sheet_faq` full-replaces the user-authored FAQ and should be used only after the user explicitly approves the FAQ content.
- `paput_delete_goal` should be used only when the user intends to delete a goal.
- `paput_set_skill_sheet_skills` replaces the full skill list and should be used only when the desired final list is known.
- `paput_update_dashboard_analysis` should be used only after the MCP client AI model has generated an analysis and the user intends to save it.
- `paput_discard_pending_candidate` removes a pending candidate from the save flow.
- `paput_update_capture_policy` should be used after the MCP client AI has generated a capture policy from discarded candidates.
- Update and upsert tools should preserve existing data unless the user requests a change.

## Usage Examples

Additional public examples are available in [docs/usage-examples.md](docs/usage-examples.md).

### 1. Avoid duplicate knowledge before saving

```text
Search PaPut for existing memos about MCP tool descriptions before creating a new knowledge candidate.
```

Recommended tool flow:

1. `paput_search_memo`
2. `paput_add_knowledge_candidates` if no duplicate exists
3. `paput_list_pending_candidates` when the user wants to review pending items

### 2. Capture knowledge from a Codex session

```text
Scan recent Codex sessions and extract reusable knowledge from the relevant session.
```

The AI client reads its own local session files; PaPut MCP only receives the
extracted candidates and processed-session markers.

Recommended flow:

1. Use `paput_list_processed_sessions` to skip sessions already reviewed.
2. The local-file-capable AI client reads `~/.codex/sessions/**/*.jsonl`.
3. Use `paput_add_knowledge_candidates` when reusable candidates are found.
4. Use `paput_mark_processed_session` when a reviewed session has no candidates.

### 3. Update a skill sheet project

```text
Update my skill sheet project with the latest technologies and responsibilities.
```

Recommended tool flow:

1. `paput_get_skill_sheet`
2. `paput_upsert_skill_sheet_project`
3. `paput_get_skill_sheet` to verify the updated project

## Local Data

`setup-ai` stores generated skills under `~/.paput` by default. Knowledge
capture state is stored by the PaPut API.

```text
~/.paput/
  skills/  # Canonical skills linked into Claude/Codex
```

## Troubleshooting

- **Connection fails or tools do not appear**: Make sure the server URL is `https://mcp.paput.io/mcp` and that you completed the PaPut sign-in and consent screen. Check `https://mcp.paput.io/healthz` returns `{"ok":true}`.
- **401 Unauthorized / asked to sign in again**: Your access token expired or the connector was disconnected. Reconnect the connector and re-authorize through PaPut OAuth.
- **A write or delete tool did nothing**: Write and destructive tools require user confirmation. Approve the confirmation prompt in the client before the action runs.
- **Read/search tools return empty results**: The account has no matching data yet. Create content first (e.g. `paput_create_memos`), then search again.
- **Still stuck**: Contact `paput.dev@gmail.com` or open an issue at https://github.com/mizulba-dev/paput-mcp/issues.

## Public Documents

- [Privacy Policy](docs/privacy-policy.md)
- [Usage Examples](docs/usage-examples.md)
- [Tools And Use Cases](docs/tools.md)
- [MCP Directory Submission Notes](docs/directory-submission.md)
