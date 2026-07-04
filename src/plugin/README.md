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

- **Claude Code**: you are prompted for `Project alias` when enabling the plugin (or pass it at install time with `--config project_alias=<alias>`). Leave it empty to connect without a project.
- The value is stored once per user and shared across projects. To use a different alias in a specific project, add this to that project's `.claude/settings.local.json`:

```json
{
  "pluginConfigs": {
    "paput@paput": {
      "options": { "project_alias": "<alias>" }
    }
  }
}
```

- **Codex**: the bundled connection does not take an alias. To pin a project in Codex, configure the MCP server manually with the alias in the URL query (`?project_alias=<alias>`); the plugin-bundled server steps aside automatically when a server named `paput` already exists in your config.

## Already connected via a custom connector?

If you have already added PaPut as a custom connector (URL-based MCP setup), installing this plugin gives you a second connection:

- **Claude**: the plugin server registers separately as `plugin:paput:paput`. Authenticating both duplicates every tool — keep one and disable the other.
- **Codex**: your existing `paput` server wins and the bundled one is skipped, so nothing breaks.

The skills work with either connection.

## Links

- [PaPut](https://paput.io)
- [MCP integration guide](https://paput.io/mcp-integration)
