# PaPut Plugin

PaPut turns AI-assisted work into a verifiable knowledge and judgment portfolio. This plugin bundles the connection to the PaPut remote MCP server and the skills for capturing, reviewing, and publishing reusable knowledge.

A PaPut account is required. On first tool use, the MCP client runs the OAuth flow against `mcp.paput.io`.

## Install

### Claude Code

```
/plugin marketplace add mizulba-dev/paput-mcp
/plugin install paput@paput
```

### claude.ai / Claude Desktop / Cowork

Open **Customize > Plugins**, add `mizulba-dev/paput-mcp` as a marketplace from GitHub, then install **paput**.

### Codex (App / CLI / VS Code)

```
codex plugin marketplace add mizulba-dev/paput-mcp
codex plugin add paput@paput
```

## Skills

All skills are invoked with the `paput` namespace, e.g. `/paput:capture`.

| Skill | Purpose |
| --- | --- |
| `capture` | Extract reusable knowledge candidates from the conversation and add them to pending |
| `save` | Review pending candidates and save only user-approved ones to PaPut |
| `harvest` | Harvest reusable knowledge from past local AI sessions (skips processed ones) |
| `principle-synthesizer` | Synthesize cross-cutting principle candidates from accumulated public memos |
| `analyze-discard-policy` | Derive capture rejection criteria from discarded candidates |
| `project-document` | Save a project design decision or repeatable procedure as a project document |
| `project-episodes` | Draft design-and-judgment episodes for a skill sheet project from public linked memos |
| `self-pr-draft` | Draft the skill sheet self PR and save it only after explicit approval |
| `dashboard-analysis` | Analyze the dashboard, goals, and memos through the judgment axis |

## Project alias (optional)

The bundled connection can pin a PaPut project context via a project alias (3–40 lowercase alphanumeric characters).

- **Claude Code**: the alias is resolved per project from your working directory, so one plugin install covers every repository. Requires Claude Code v2.1.195 or later, which is when plugin-provided `headersHelper` entries started expanding `${CLAUDE_PROJECT_DIR}`; on older versions the connection still works but never carries a project context. To resolve the alias, Claude Code runs `npx -y paput-mcp@<plugin version> project-header "${CLAUDE_PROJECT_DIR}"` on connect; the package version is pinned to the plugin version. npx may fetch that pinned package from the npm registry; the CLI itself makes no network requests — it only reads `~/.paput/projects` and prints the header, which Claude Code sends to `mcp.paput.io` with the connection. List your projects in `~/.paput/projects`, one per line, as the alias, any run of spaces or a tab, then the absolute path:

```
# alias        path
paput          /Users/you/repos/paput
gaikodb        /Users/you/repos/gaiko-db
mydefault
```

- Paths match exactly or as a parent directory, and the longest match wins, so a monorepo subdirectory inherits its parent's alias unless you register it separately. A line with only an alias is the fallback for directories that match nothing.
- Only the first run of whitespace separates the two columns, so a path containing spaces or tabs stays intact.
- Edit the file by hand, or let the CLI do it from inside the repository: `npx -y paput-mcp set-project-alias <alias>` registers the current directory, `--list` shows the registrations, and `--remove` drops one. The fallback line is hand-written only — the CLI never adds or removes it.
- Set `PAPUT_PROJECT_ALIAS` to override the file for a single session (handy in worktrees). Set `PAPUT_HOME` to move `~/.paput` elsewhere.
- The file is read only from your home directory — the plugin never reads configuration out of the repository you are working in.
- If the file is missing or no entry matches, the connection is made without a project context.
- **Codex**: the bundled connection does not take an alias. To pin a project, add a server named `paput` to the project's `.codex/config.toml`; the plugin-bundled server steps aside automatically when that server exists:

```toml
[mcp_servers.paput]
url = "https://mcp.paput.io/mcp"
http_headers = { "X-PaPut-Project-Alias" = "paput" }
```

Use `env_http_headers = { "X-PaPut-Project-Alias" = "PAPUT_PROJECT_ALIAS" }` instead when the alias must come from an environment variable. Restart Codex after changing the connection. If an older resource URL was already authorized, remove or reauthorize the connection and complete OAuth again.

## Already connected via a custom connector?

If you have already added PaPut as a custom connector (URL-based MCP setup), installing this plugin gives you a second connection:

- **Claude**: the plugin server registers separately as `plugin:paput:paput`. Authenticating both duplicates every tool — keep one and disable the other.
- **Codex**: your existing `paput` server wins and the bundled one is skipped, so nothing breaks.

The skills work with either connection.

## Links

- [PaPut](https://paput.io)
- [MCP integration guide](https://paput.io/mcp-integration)
