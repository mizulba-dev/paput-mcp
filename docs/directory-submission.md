# MCP Directory Submission Notes

This document collects public submission information for PaPut MCP.

## Server Summary

- Name: PaPut MCP
- Website: https://paput.io
- Remote MCP server URL: https://mcp.paput.io
- Transport: Streamable HTTP
- Authentication: OAuth 2.1-style authorization code with PKCE
- Dynamic client registration: Supported through PaPut OAuth metadata
- Data model: Data-only MCP server
- UI widgets: None
- Primary use: Give AI assistants controlled access to PaPut memos, notes, skill sheets, and reusable knowledge workflows

## OAuth Metadata

- Protected resource metadata: `https://mcp.paput.io/.well-known/oauth-protected-resource`
- Authorization server: `https://api.paput.io`
- Authorization server metadata: `https://api.paput.io/.well-known/oauth-authorization-server`
- Authorization endpoint: `https://api.paput.io/oauth/authorize`
- Token endpoint: `https://api.paput.io/oauth/token`
- Registration endpoint: `https://api.paput.io/oauth/register`
- Supported scopes: `paput.read`, `paput.write`
- Token endpoint auth method: `none`
- PKCE method: `S256`

## Claude Connector Preparation

Recommended listing details:

- Connector name: PaPut
- Description: Connect Claude to PaPut memos, notes, skill sheets, and knowledge capture workflows.
- Server URL: `https://mcp.paput.io`
- Authentication: OAuth
- Transport: Streamable HTTP
- Scopes: `paput.read paput.write`
- Category: Productivity, knowledge management, developer tools
- Data access summary: Reads and writes PaPut content only after the user authorizes access through PaPut OAuth.
- Safety summary: Read-only tools are annotated. Write and destructive tools require clear user intent and should be confirmed by the client.
- Callback URL handling: Claude registers its redirect URI through dynamic client registration. PaPut validates the registered redirect URI during authorization instead of relying on a preconfigured static callback URL.

Validation checklist:

Status: verified with Claude custom connector UI.

1. Add `https://mcp.paput.io` as a remote MCP connector in Claude.
2. Complete the PaPut OAuth consent flow.
3. Confirm `tools/list` returns PaPut tools.
4. Call a read-only tool such as `paput_get_categories`.
5. Call a search tool such as `paput_search_memo` with a low `limit`.
6. Call one write tool with test-safe content.
7. Confirm write/destructive tools show user confirmation before execution.
8. Confirm the created or changed data is visible in PaPut.

## ChatGPT Developer Mode Preparation

Recommended listing details:

- App name: PaPut
- Remote MCP server URL: `https://mcp.paput.io`
- Authentication: OAuth with dynamic client registration
- Transport: Streamable HTTP
- Tool access: Full MCP tools, data-only, no UI widgets
- Scopes: `paput.read paput.write`
- Callback URL handling: ChatGPT should register its redirect URI through dynamic client registration. PaPut validates registered redirect URIs before issuing authorization codes.

Developer Mode validation checklist:

1. Enable Developer Mode in ChatGPT settings.
2. Create an app for the remote MCP server URL `https://mcp.paput.io`.
3. Use OAuth without static credentials so dynamic client registration is exercised.
4. Complete the PaPut OAuth flow in the browser.
5. Refresh the app tools and confirm PaPut tools are listed.
6. Start a conversation with Developer Mode enabled and select the PaPut app.
7. Prompt: `Use the PaPut app to get my categories. Do not use other tools.`
8. Confirm `paput_get_categories` succeeds.
9. Prompt a write action in a test-safe way and confirm the client asks for approval before execution.

Status: pending validation.

## Submission Positioning

PaPut MCP should be submitted as a data-only MCP connector. It should not request UI widget support. The connector should emphasize:

- User-owned PaPut data access through OAuth.
- Knowledge management and session knowledge capture.
- Explicit confirmation for write and destructive operations.
- No broad web browsing, scraping, or unrelated third-party data access.

## Public References

- Privacy Policy: `docs/privacy-policy.md`
- Usage Examples: `docs/usage-examples.md`
- Tools And Use Cases: `docs/tools.md`
- OpenAI ChatGPT Developer Mode documentation: https://platform.openai.com/docs/guides/developer-mode
- OpenAI MCP documentation: https://platform.openai.com/docs/mcp/
- Anthropic remote MCP connector documentation: https://support.anthropic.com/en/articles/11175166-getting-started-with-custom-integrations-using-remote-mcp

Before submission, replace local documentation paths with public URLs from the published package, repository, or documentation site.
