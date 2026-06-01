# PaPut MCP Server

PaPut MCP Server connects [PaPut](https://paput.io) to AI assistants through the Model Context Protocol (MCP). It lets Claude, Codex, Cursor, and other MCP clients work with PaPut memos, notes, skill sheets, reusable knowledge candidates, and the local PaPut cache.

## Features

### PaPut Data Management

- Create, search, read, and update memos
- Create, search, read, and update notes
- Read and update skill sheet profile fields, self PR, skills, and projects
- Delete skill sheet projects when explicitly requested

### Knowledge Capture From AI Sessions

- Scan local Claude and Codex session logs
- Add reusable knowledge candidates to a local pending queue
- Sync existing PaPut memos to the local cache for duplicate detection
- Prevent duplicate candidates with fingerprints
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

Create an API key in your PaPut account settings and pass it through the MCP
server environment when you want to run tools that call the PaPut API.

```json
"paput": {
  "command": "npx",
  "args": ["-y", "paput-mcp"],
  "env": {
    "PAPUT_API_KEY": "your-api-key",
    "PAPUT_PROJECT_MATCH": "optional project name fragment"
  }
}
```

### Environment Variables

- `PAPUT_API_KEY` - Optional at startup. Required when executing tools that call the PaPut API.
- `PAPUT_API_URL` - Optional API URL. Defaults to `https://api.paput.io`.
- `PAPUT_PROJECT_MATCH` - Optional project name fragment for automatic project linking when creating or updating memos.
- `PAPUT_HOME` - Optional PaPut local data directory. Defaults to `~/.paput`.
- `PAPUT_CACHE_DIR` - Optional cache directory for knowledge capture data.

When `PAPUT_PROJECT_MATCH` is set, memo create and update operations search skill sheet projects whose title contains the configured text and link the first match.

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

- `paput-init` - Initialize PaPut usage, sync existing memos, and inspect unprocessed sessions.
- `paput-sync` - Sync existing PaPut memos into the local cache.
- `paput-capture` - Extract reusable knowledge candidates from the current conversation or a specified topic and add them to pending.
- `paput-save` - Review pending candidates first, then save only candidates explicitly approved by the user.

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

Claude can call skills such as `/paput-save`. Codex can call `$paput-save` or use natural language.

## Available Tools

### Memo Management

- `paput_create_memo` - Create a PaPut memo directly.
- `paput_search_memo` - Search PaPut memos by keyword, category, IDs, date, visibility, or pagination.
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
- `paput_upsert_skill_sheet_project` - Add or update a skill sheet project.
- `paput_delete_skill_sheet_project` - Delete a skill sheet project.

### Knowledge Capture And Local Cache

- `paput_cache_status` - Inspect the local cache state.
- `paput_sync_remote_memos` - Sync existing PaPut memos into the local cache.
- `paput_scan_sessions` - Scan local Claude/Codex session logs.
- `paput_get_session_transcript` - Read a session transcript.
- `paput_add_knowledge_candidates` - Add extracted knowledge candidates to pending.
- `paput_list_pending_candidates` - List pending candidates.
- `paput_save_pending_candidate` - Save an approved pending candidate as a PaPut memo.
- `paput_discard_pending_candidate` - Discard a pending candidate.

## Confirmation Guidance

Write and destructive tools should be used only when the user intent is clear. In particular:

- `paput_save_pending_candidate` requires explicit user approval to save a pending candidate to PaPut.
- `paput_delete_skill_sheet_project` should be used only when the user intends to delete a project.
- `paput_set_skill_sheet_skills` replaces the full skill list and should be used only when the desired final list is known.
- `paput_discard_pending_candidate` removes a pending candidate from the save flow.
- Update and upsert tools should preserve existing data unless the user requests a change.

## Usage Examples

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
  cache/   # Synced memos, pending candidates, and processed sessions
```
