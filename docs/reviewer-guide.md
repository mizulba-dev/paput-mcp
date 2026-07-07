# PaPut MCP Connector — Reviewer Guide

## Overview

PaPut is a knowledge-capture tool for engineers (memos, notes, and skill sheets).
This MCP connector lets Claude read and write PaPut content on behalf of an
authorized user.

- **Server URL:** `https://mcp.paput.io/mcp`
- **Transport:** Streamable HTTP
- **Authentication:** OAuth 2.1 (Authorization Code + PKCE/S256, Dynamic Client Registration supported)
- **Scopes:** `paput.read`, `paput.write`

## Capabilities (tool groups)

The connector exposes the following tools. All tools carry annotations
(`readOnlyHint` / `destructiveHint`).

- **Memos:** create, search, get, update, list categories
- **Notes:** create, search, get, update
- **Skill sheet:** get and update basic info, self PR, skills, projects, project achievements, generated project episodes, and the user-authored Q&A (FAQ) section
- **Goals:** list, create, update, delete
- **Dashboard analysis:** get and update the user's dashboard analysis
- **Knowledge capture:** add, list, update, save, discard pending candidates; manage processed session markers and capture policy
- **Project documents:** get project context, search/read/add/update private project documents, manage project instructions and proposal promotion status

## Test account

Test credentials (email and password) are provided in the submission form.
The account is prepared with basic sample memos and categories so read/search
tools can return data without the reviewer having to create memos first.
Additional representative data for notes, skill sheet projects, goals,
dashboard analysis, pending candidates, processed session markers, capture
policy, or private project documents may be prepared for review as needed.

> Note: PaPut normally uses Google sign-in only. A dedicated email/password
> login is enabled for the review period so you can sign in without a Google
> account.

`paput-mcp setup-ai` installs local AI-client skills and rules for Claude Code
or Codex. It is a local utility and is outside the remote connector review
scope.

## Steps

1. In Claude, add a custom connector with the server URL `https://mcp.paput.io/mcp`.
2. Start the connection. You will be redirected to the PaPut sign-in page.
3. On the sign-in page, enter the test credentials (the email/password form),
   then approve the consent screen. You will be returned to Claude and the
   connection completes.
4. Confirm the tool list loads (`tools/list` shows PaPut tools such as
   `paput_search_memo`, `paput_get_categories`, `paput_create_memos`).
5. **Read:** ask Claude to list categories (`paput_get_categories`) and to
   search memos (`paput_search_memo`). Results should be returned.
6. **Get:** ask Claude to open one of the returned memos (`paput_get_memo`).
7. **Write:** ask Claude to create a test memo (`paput_create_memos`). Confirm
   that write/destructive tools prompt for user confirmation before executing.
8. Verify the created data appears when searching again.

> Some tool groups (e.g. dashboard analysis, goals, skill sheet) may return
> empty results on a fresh review account; the tools still respond correctly.
> You can populate them through the connector's write tools if you want to
> exercise them.

## Notes for reviewers

- Read-only tools are annotated with `readOnlyHint`; write/destructive tools are
  annotated with `destructiveHint` and are expected to be confirmed by the
  client.
- The connector accesses PaPut content only after OAuth authorization and does
  not read Claude memory, chat history, or user files.
- Support contact: `paput.dev@gmail.com`
- Privacy policy: https://github.com/mizulba-dev/paput-mcp/blob/main/docs/privacy-policy.md
