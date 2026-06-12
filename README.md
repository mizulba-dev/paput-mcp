# PaPut MCP Server

PaPut MCP Server connects [PaPut](https://paput.io) to AI assistants through the Model Context Protocol (MCP). Remote HTTP mode lets Claude, ChatGPT, Codex, Claude Code, and other MCP clients create, search, and organize PaPut memos, notes, and skill sheets through OAuth. Local CLI mode is convenient for Claude Code and Codex workflows that need local session scanning, pending knowledge candidates, and the local PaPut cache.

## Features

### PaPut Data Management

- Create, search, read, and update memos
- Create, search, read, and update notes
- Read and update skill sheet profile fields, self PR, skills, and projects
- Delete skill sheet projects when explicitly requested
- Create, list, update, and delete goals
- Get dashboard context and save AI-generated dashboard analysis results

### Knowledge Capture From AI Sessions

- Scan local Claude and Codex session logs
- Add reusable knowledge candidates to a local pending queue
- Reject near-duplicate candidates automatically using semantic search against existing memos
- Prevent duplicate pending candidates with fingerprints
- Derive a local capture policy from discarded candidates
- Save pending candidates to PaPut only after explicit user approval
- Preserve the source session updated timestamp as the PaPut memo creation timestamp
- Link pending candidates to PaPut projects through `PAPUT_PROJECT_MATCH`
- Install Claude/Codex skills and global rules for PaPut workflows

## Installation

Run directly with `npx`:

```bash
npx -y paput-mcp
```

Or install globally:

```bash
npm install -g paput-mcp
```

## MCP Configuration

### Remote HTTP Mode

Use remote HTTP mode when you want a simple OAuth-based MCP setup for memo,
note, and skill sheet operations.

```json
"paput": {
  "type": "http",
  "url": "https://mcp.paput.io"
}
```

Remote HTTP mode intentionally does not expose local cache, pending candidate,
session transcript, or capture policy tools because the hosted server cannot
access files on your device. Remote HTTP mode also does not apply
project-specific local configuration.

### Local CLI Mode

Use local CLI mode when you want Claude Code, Codex, or another local MCP client
to scan local Claude/Codex sessions and keep a local pending cache. Log in once
with OAuth before starting the local MCP server:

```bash
npx -y paput-mcp login
```

```json
"paput": {
  "command": "npx",
  "args": ["-y", "paput-mcp"],
  "env": {
    "PAPUT_PROJECT_MATCH": "optional project name fragment"
  }
}
```

The login command stores OAuth tokens under `~/.paput/oauth.json` by default.
The `~/.paput` directory is created with `0700` permissions and the token file is
written with `0600` permissions. To revoke and remove the local token cache, run:

```bash
npx -y paput-mcp logout
```

### Environment Variables

- `PAPUT_PROJECT_MATCH` - Optional project name fragment for automatic project linking when creating memos in bulk or updating memos.
- `PAPUT_HOME` - Optional PaPut local data directory. Defaults to `~/.paput`.
- `PAPUT_CACHE_DIR` - Optional cache directory for knowledge capture data.
- `PAPUT_ALLOWED_ORIGINS` - Optional comma-separated list of extra allowed
  HTTP `Origin` values for remote MCP requests. The remote server already allows
  its own origin, PaPut, Claude, and ChatGPT origins.

When `PAPUT_PROJECT_MATCH` is set, memo bulk-create and update operations search skill sheet projects whose title contains the configured text and link the first match.

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
```

Generated skills:

- `paput-init` - Initialize PaPut usage and inspect unprocessed sessions.
- `paput-capture` - Extract reusable knowledge candidates from the current conversation or a specified topic and add them to pending.
- `paput-save` - Review pending candidates first, then save only candidates explicitly approved by the user.
- `paput-analyze-discard-policy` - Analyze discarded candidates and save a local capture policy used by future captures.
- `paput-dashboard-analysis` - Analyze PaPut dashboard context and optionally save the generated dashboard analysis.

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
assistant to turn rejection history into a local capture policy. Future
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
- `paput_update_skill_sheet_public_profile` - Save the AI-generated public profile (headline, summary, strength labels, and project highlights) shown on the AI Summary tab.
- `paput_set_skill_sheet_skills` - Replace the full skill list with the provided final state.
- `paput_upsert_skill_sheet_project` - Add or update a skill sheet project.
- `paput_delete_skill_sheet_project` - Delete a skill sheet project.
- `paput_get_skill_sheet_project_summary_context` - Get project information and related memo bodies so the MCP client AI model can generate a project summary.
- `paput_update_skill_sheet_project_ai_summary` - Save an AI-generated project summary.

### Goal Management

- `paput_list_goals` - List active and archived goals.
- `paput_create_goal` - Create a goal.
- `paput_update_goal` - Update a goal. The update body includes the goal ID.
- `paput_delete_goal` - Delete a goal by ID.

### Dashboard Analysis

- `paput_get_dashboard_analysis` - Get the saved dashboard analysis.
- `paput_get_dashboard_analysis_context` - Get dashboard, goal, skill sheet, memo, note, and category context so the MCP client AI model can generate an analysis.
- `paput_update_dashboard_analysis` - Save an AI-generated dashboard analysis.

### Knowledge Capture And Local Cache

These tools are local CLI mode only. They are not exposed by the remote HTTP MCP
server.

- `paput_cache_status` - Inspect the local cache state.
- `paput_scan_sessions` - Scan local Claude/Codex session logs.
- `paput_get_session_transcript` - Read a session transcript.
- `paput_add_knowledge_candidates` - Add extracted knowledge candidates to pending.
- `paput_list_pending_candidates` - List pending candidates.
- `paput_save_pending_candidate` - Save an approved pending candidate as a PaPut memo.
- `paput_discard_pending_candidate` - Discard a pending candidate.
- `paput_get_capture_policy` - Read the local capture policy generated from discarded candidates.
- `paput_get_discard_policy_context` - Read discarded candidates and the current policy for AI-side policy analysis.
- `paput_update_capture_policy` - Save the local capture policy generated by the AI.

## Confirmation Guidance

Write and destructive tools should be used only when the user intent is clear. In particular:

- `paput_save_pending_candidate` requires explicit user approval to save a pending candidate to PaPut.
- `paput_delete_skill_sheet_project` should be used only when the user intends to delete a project.
- `paput_delete_goal` should be used only when the user intends to delete a goal.
- `paput_set_skill_sheet_skills` replaces the full skill list and should be used only when the desired final list is known.
- `paput_update_dashboard_analysis` should be used only after the MCP client AI model has generated an analysis and the user intends to save it.
- `paput_discard_pending_candidate` removes a pending candidate from the save flow.
- `paput_update_capture_policy` writes only to the local cache and should be used after the MCP client AI has generated a capture policy from discarded candidates.
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

Recommended tool flow:

1. `paput_scan_sessions`
2. `paput_get_session_transcript`
3. `paput_add_knowledge_candidates`

### 3. Update a skill sheet project

```text
Update my skill sheet project with the latest technologies and responsibilities.
```

Recommended tool flow:

1. `paput_get_skill_sheet`
2. `paput_upsert_skill_sheet_project`
3. `paput_get_skill_sheet` to verify the updated project

## Local Data

PaPut MCP stores local data under `~/.paput` by default.

```text
~/.paput/
  skills/  # Canonical skills linked into Claude/Codex
  cache/   # Synced memos, pending candidates, processed sessions, and capture-policy.md
```

## Troubleshooting

- **Connection fails or tools do not appear**: Make sure the server URL is `https://mcp.paput.io` and that you completed the PaPut sign-in and consent screen. Check `https://mcp.paput.io/healthz` returns `{"ok":true}`.
- **401 Unauthorized / asked to sign in again**: Your access token expired or the connector was disconnected. Reconnect the connector and re-authorize through PaPut OAuth.
- **A write or delete tool did nothing**: Write and destructive tools require user confirmation. Approve the confirmation prompt in the client before the action runs.
- **Read/search tools return empty results**: The account has no matching data yet. Create content first (e.g. `paput_create_memos`), then search again.
- **Local CLI mode: `login` required**: For stdio/local usage, run `node dist/index.js login` to complete OAuth before starting the server.
- **Still stuck**: Contact `paput.dev@gmail.com` or open an issue at https://github.com/mizulba-dev/paput-mcp/issues.

## Public Documents

- [Privacy Policy](docs/privacy-policy.md)
- [Usage Examples](docs/usage-examples.md)
- [Tools And Use Cases](docs/tools.md)
- [MCP Directory Submission Notes](docs/directory-submission.md)
