# Privacy Policy

Effective date: June 1, 2026

PaPut MCP Server connects AI assistants and MCP clients to PaPut through the Model Context Protocol. This policy explains what data is handled when you use the PaPut MCP Server.

## Data The Server Handles

Depending on the tools you use, the server may process:

- PaPut memos, notes, categories, skill sheet data, and related project metadata.
- OAuth access tokens used to authenticate requests to PaPut.
- MCP request and response metadata needed to execute tool calls.
- Local Claude or Codex session metadata and transcripts when you explicitly use local knowledge capture tools.
- Local pending knowledge candidates and cache data stored on your device.

## How Data Is Used

Data is used only to provide the MCP tools you invoke, including:

- Searching, reading, creating, and updating PaPut memos and notes.
- Reading and updating your PaPut skill sheet.
- Synchronizing PaPut memo metadata into a local cache for duplicate detection.
- Scanning local AI session logs and preparing reusable knowledge candidates.
- Completing OAuth authorization and token-based requests to the PaPut API.

## Authentication

Remote MCP connections use OAuth. PaPut issues tokens after you sign in and approve the requested scopes. The MCP server receives bearer tokens on requests and forwards them to the PaPut API. The MCP server does not intentionally persist OAuth access tokens.

Local stdio usage uses OAuth tokens created by `paput-mcp login`. You are responsible for keeping local token and configuration files private.

## Local Data

When local knowledge capture features are used, PaPut MCP may store cache files under `~/.paput` or a configured cache directory. This local data can include synced memo summaries, pending knowledge candidates, processed session markers, session metadata, and local OAuth tokens created by `paput-mcp login`. The default OAuth token directory is created with `0700` permissions and the token file is written with `0600` permissions. It remains on your device unless you choose to save a pending candidate to PaPut or remove the local token cache with `paput-mcp logout`.

## Logging

Hosted infrastructure and MCP clients may record operational logs such as request timestamps, status codes, errors, and connection metadata. Logs are used for reliability, troubleshooting, abuse prevention, and security. The server is designed not to log OAuth tokens or full private content intentionally.

## Sharing

PaPut MCP does not sell personal data. Data may be processed by PaPut infrastructure providers only as needed to operate the service. Data may also be disclosed if required by law or to protect the security and integrity of PaPut, users, or the service.

## User Control

You can:

- Revoke OAuth access from PaPut account settings when available.
- Remove local MCP configuration from your client.
- Delete local cache data stored under `~/.paput` or your configured cache directory.
- Run `paput-mcp logout` to revoke and remove the local OAuth token cache.
- Delete or update PaPut content using PaPut or authorized MCP tools.

## Security

PaPut MCP uses OAuth for remote access and supports read/write tool annotations so clients can request user confirmation for write or destructive actions. You should review tool calls before approving actions that create, update, delete, publish, or discard data.

## Contact

For privacy questions, use the contact method provided on https://paput.io.
