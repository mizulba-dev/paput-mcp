# Privacy Policy

Effective date: June 1, 2026

PaPut MCP Server connects AI assistants and MCP clients to PaPut through the Model Context Protocol. This policy explains what data is handled when you use the PaPut MCP Server.

## Data The Server Handles

Depending on the tools you use, the server may process:

- PaPut memos, notes, categories, skill sheet data, and related project metadata.
- OAuth access tokens used to authenticate requests to PaPut.
- MCP request and response metadata needed to execute tool calls.
- Pending knowledge candidates, discarded candidate metadata, processed AI
  session markers, and capture policy documents stored by the PaPut API.
- Source session identifiers and optional source session timestamps when an AI
  client submits knowledge candidates or marks sessions as processed.

## How Data Is Used

Data is used only to provide the MCP tools you invoke, including:

- Searching, reading, creating, and updating PaPut memos and notes.
- Reading and updating your PaPut skill sheet.
- Accepting reusable knowledge candidates extracted by the MCP client AI.
- Managing pending candidates, processed session markers, and capture policies
  through PaPut API storage.
- Analyzing discarded knowledge candidates to generate a capture policy used by
  future candidate extraction.
- Completing OAuth authorization and token-based requests to the PaPut API.

## Authentication

Remote MCP connections use OAuth. PaPut issues tokens after you sign in and approve the requested scopes. The MCP server receives bearer tokens on requests and forwards them to the PaPut API. The MCP server does not intentionally persist OAuth access tokens.

## Local Data

`paput-mcp setup-ai` stores generated skill files under `~/.paput` by default.
Pending candidates, discarded candidate metadata, processed AI session markers,
and capture policies are stored in PaPut API storage, not under `~/.paput`.
PaPut MCP does not read local Claude/Codex session files. When you use
`paput-harvest` in a local-file-capable client such as Claude Code or Codex, that
client may read its own session files and submit only extracted candidates or
processed-session markers to PaPut MCP.

## Logging

Hosted infrastructure and MCP clients may record operational logs such as request timestamps, status codes, errors, and connection metadata. Logs are used for reliability, troubleshooting, abuse prevention, and security. The server is designed not to log OAuth tokens or full private content intentionally.

## Retention

PaPut content and API-backed MCP state are retained until the user deletes or
updates them in PaPut, while operational logs are retained only as long as
needed for reliability, troubleshooting, abuse prevention, and security.

## Sharing

PaPut MCP does not sell personal data. Data may be processed by PaPut infrastructure providers only as needed to operate the service. Data may also be disclosed if required by law or to protect the security and integrity of PaPut, users, or the service.

## User Control

You can:

- Revoke OAuth access from PaPut account settings when available.
- Remove local MCP configuration from your client.
- Delete or update PaPut content using PaPut or authorized MCP tools.

## Security

PaPut MCP uses OAuth for remote access and supports read/write tool annotations so clients can request user confirmation for write or destructive actions. You should review tool calls before approving actions that create, update, delete, publish, or discard data.

## Contact

For privacy questions, contact paput.dev@gmail.com (or use the contact method on https://paput.io).
