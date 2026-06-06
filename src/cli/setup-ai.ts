import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';

interface SetupOptions {
  force: boolean;
  noRules: boolean;
  claude: boolean;
  codex: boolean;
}

interface SkillSpec {
  name: string;
  description: string;
  body: string;
}

export const SKILLS: SkillSpec[] = [
  {
    name: 'paput-init',
    description:
      'Use this to initialize PaPut usage, sync existing memos, and inspect unprocessed sessions.',
    body: `# PaPut Init

Initialize PaPut knowledge capture.

## Steps

1. Check the local cache with \`paput_cache_status\`.
2. Sync existing PaPut memos into the local cache with \`paput_sync_remote_memos\`.
3. Scan unprocessed Claude/Codex sessions with \`paput_scan_sessions\`.
4. If unprocessed sessions exist, report the count and a short summary to the user.
5. Only when the user wants it, read the transcript with \`paput_get_session_transcript\` and create candidates that meet the extraction criteria below.
6. Before adding candidates with \`paput_add_knowledge_candidates\`, check that they do not contain project-specific specifications, implementation details, operational rules, code, customer data, or secrets.
7. After adding pending candidates, briefly report added candidates, duplicates, and rejected candidates.

## Extraction Criteria

Only add technical knowledge, decision criteria, and procedures that can be reused in other projects.

Do not add these to pending:

- Project-specific specifications, screen names, button names, business workflows, operational rules, or local context.
- Personal workflow notes about PRs, GitHub, Codex, Claude, AI review, editors, or OS operations.
- Content that third parties cannot understand from the title and body alone.
- Rejected designs, anecdotes, work logs, impressions, or decision histories without reusable guidance.
- Content semantically close to existing memos or pending candidates.
- Generic security, authorization, or tenant-isolation notes when similar knowledge already exists.
- Code fragments or project-specific naming that has not been generalized.

When unsure, do not add the candidate. Report that there is no knowledge to save or that the candidate was rejected.

## Notes

- Do not save directly to PaPut.
- Add candidates to pending first.
- Report duplicates or similar memos when found.
- Prefer high-quality pending candidates over increasing the pending count.`,
  },
  {
    name: 'paput-sync',
    description:
      'Use this to sync existing PaPut memos into the local cache and improve duplicate detection.',
    body: `# PaPut Sync

Sync existing PaPut memos into the local cache.

## Steps

1. Check the current cache state with \`paput_cache_status\`.
2. Run \`paput_sync_remote_memos\`.
3. Run \`paput_cache_status\` again and confirm the synced counts.
4. Briefly report the sync result to the user.

## Notes

- Syncing is for duplicate detection.
- Do not save or discard pending candidates.
- Do not create new PaPut memos.`,
  },
  {
    name: 'paput-save',
    description:
      'Use this to review pending candidates first, then save only candidates explicitly approved by the user. This skill never saves automatically.',
    body: `# PaPut Save

Review pending knowledge candidates first, then save only candidates explicitly approved by the user. This skill never saves automatically.

## Steps

1. Fetch pending candidates with \`paput_list_pending_candidates\`.
2. Briefly show each candidate title, categories, summary, and similar memo information.
3. Save only candidates approved by the user with \`paput_save_pending_candidate\`.
4. Discard candidates the user rejects with \`paput_discard_pending_candidate\`.
5. Report the number of saved and discarded candidates.

## Notes

- Do not save to PaPut without user approval.
- Save multiple candidates only when the user explicitly asks to save all of them.
- If the user asks to modify a title or body, apply the override when saving.
- For ambiguous or likely duplicate candidates, present not saving as an option.`,
  },
  {
    name: 'paput-capture',
    description:
      'Use this to extract reusable knowledge candidates from the current conversation or a specified topic and add them to pending.',
    body: `# PaPut Capture

Extract reusable knowledge candidates from the current conversation or a user-specified topic and add them to pending. Use this as a manual fallback when the global rules did not suggest candidates automatically.

## When To Use

- The user wants to keep knowledge learned while solving a problem.
- The user wants to keep a design decision and its rationale.
- The user wants to keep a best practice or debugging method.
- The user asks to create notes for a specific topic.

## Steps

1. Check existing pending candidates with \`paput_list_pending_candidates\`.
2. Extract only reusable knowledge from the current conversation or the user-specified topic.
3. Keep candidates small, and prepare a title, body, categories, and visibility.
4. Do not add candidates that may duplicate existing pending candidates. Suggest using the existing candidate instead.
5. If a candidate is reusable, non-duplicate, non-sensitive, and not project-specific, add it to pending with \`paput_add_knowledge_candidates\` without waiting for user approval.
6. After adding candidates, briefly report the title, categories, and candidate ID.

## Candidate Rules

- Keep each candidate small.
- Make titles concise and searchable.
- Include concrete procedures, causes, reasons, and decision criteria in the body.
- To make candidates reusable, naturally include decision criteria, applicability conditions, reasons, pitfalls, and verification methods where possible.
- Do not include project-specific specifications, implementation details, operational rules, code, secrets, or customer data.
- Only capture technical knowledge, decision criteria, or procedures that can be reused in other projects.
- Treat candidates as private by default.
- Do not include Markdown heading lines that start with \`#\` in the body.

## Rejected Candidates

Do not add these to pending:

- Project-specific specifications, screen names, button names, business workflows, operational rules, or local context.
- Personal workflow notes about PRs, GitHub, Codex, Claude, AI review, editors, or OS operations.
- Content that third parties cannot understand from the title and body alone.
- Rejected designs, anecdotes, work logs, impressions, or decision histories without reusable guidance.
- Content semantically close to existing memos or pending candidates.
- Generic security, authorization, or tenant-isolation notes when similar knowledge already exists.
- Code fragments or project-specific naming that has not been generalized.

## Notes

- Do not save directly to PaPut.
- Save only to pending. Final PaPut saves are handled by \`paput-save\`.
- Add safe candidates to pending without waiting for user approval. If a candidate may be duplicate, sensitive, project-specific, too narrow, or ambiguous, present the concern and ask before adding it.
- Candidates created from past sessions use the source session updated timestamp as the PaPut memo creation timestamp when saved.
- If there are no candidates, say that no reusable knowledge was found.`,
  },
  {
    name: 'paput-dashboard-analysis',
    description:
      "Use this to analyze the user's PaPut dashboard, goals, skill sheet, memos, notes, and categories; identify current position, strengths, growing areas, thin areas, missing knowledge, next knowledge to learn, and career-history phrasing; optionally save the generated dashboard analysis when the user asks to save it.",
    body: `# PaPut Dashboard Analysis

Analyze the user's PaPut dashboard and goals. Use this skill when the user asks about dashboard analysis, goals, progress, strengths, weak areas, next learning topics, or career-history phrasing.

## Workflow

1. Call \`paput_get_dashboard_analysis_context\`.
2. Analyze the returned \`structuredContent\`.
3. Present the analysis in the user's language and tone.
4. Do not save the result unless the user explicitly asks to save it.
5. If the user asks to save, call \`paput_update_dashboard_analysis\`.

## Analysis Points

Include these points when relevant:

- Current position
- Areas that can be presented as strengths
- Areas that have been growing recently
- Thin or underdeveloped areas
- Knowledge missing against active goals
- Knowledge to learn next
- Phrasing suitable for a skill sheet or career history

## Rules

- Do not claim that paput-mcp generated the analysis. The MCP client AI performs the analysis.
- Use active goals as the main analysis basis.
- Treat archived goals as historical context.
- Do not recalculate dashboard continuity from activities. Use the dashboard summary values returned by the API.
- Do not assume the user should write memos next.
- Focus on how knowledge naturally accumulated through daily development can grow toward the user's goals.
- When saving, map the generated result to:
  - \`current_summary\`
  - \`strengths\`
  - \`growing_areas\`
  - \`weak_areas\`
  - \`next_knowledge_suggestions\`
  - \`analyzed_at\``,
  },
];

const RULES = `## PaPut Knowledge Capture Rules

When work is completed, a problem is solved, a design decision is settled, or reusable knowledge appears, automatically check whether there are candidates worth keeping in PaPut.

Only keep technical knowledge, decision criteria, and procedures that can be reused in other projects. Do not keep project-specific specifications, implementation details, operational rules, code, secrets, or customer data.

When candidates exist, check for duplicates with the local cache or similar memo information before saving. If a candidate is reusable, non-duplicate, non-sensitive, and not project-specific, add it to pending with \`paput_add_knowledge_candidates\` without waiting for user approval. After adding it, briefly report the title, categories, and candidate ID.

Use \`paput_save_pending_candidate\` only when the user explicitly approves saving a pending candidate to PaPut.

If a candidate may be duplicate, sensitive, project-specific, too narrow, or ambiguous, present its title, body, categories, and concern before adding it to pending, and ask the user to confirm.

When the user asks to review pending candidates or save them to PaPut, follow the \`paput-save\` workflow.`;

const RULE_START = '<!-- paput-mcp:start -->';
const RULE_END = '<!-- paput-mcp:end -->';

export function setupAi(args: string[]): void {
  const options = parseOptions(args);
  const paputHome = process.env.PAPUT_HOME || join(homedir(), '.paput');
  const sourceSkillsDir = join(paputHome, 'skills');

  printSetupNotice(options);
  createSourceSkills(sourceSkillsDir, options.force);

  if (options.claude) {
    setupClaude(sourceSkillsDir, options);
  }

  if (options.codex) {
    setupCodex(sourceSkillsDir, options);
  }
}

function parseOptions(args: string[]): SetupOptions {
  const claudeOnly = args.includes('--claude-only');
  const codexOnly = args.includes('--codex-only');

  if (claudeOnly && codexOnly) {
    console.error('--claude-only and --codex-only cannot be used together.');
    process.exitCode = 1;
    return {
      force: false,
      noRules: false,
      claude: false,
      codex: false,
    };
  }

  return {
    force: args.includes('--force'),
    noRules: args.includes('--no-rules'),
    claude: !codexOnly,
    codex: !claudeOnly,
  };
}

function printSetupNotice(options: SetupOptions): void {
  console.log('Setting up PaPut AI integration.');
  console.log('');
  console.log('This command will:');
  console.log('- Create canonical PaPut skills under ~/.paput/skills');
  if (options.claude) {
    console.log('- Link skills into ~/.claude/skills when Claude is available');
  }
  if (options.codex) {
    console.log('- Link skills into ~/.agents/skills when Codex is available');
  }
  if (!options.noRules) {
    console.log('- Add PaPut usage rules to Claude/Codex global rules');
  }
  console.log('');
  console.log('Use --no-rules if you do not want to update global rules.');
  console.log(
    'Use --force to refresh existing PaPut-managed blocks and links.',
  );
  console.log('');
}

function createSourceSkills(sourceSkillsDir: string, force: boolean): void {
  mkdirSync(sourceSkillsDir, { recursive: true });

  for (const skill of SKILLS) {
    const skillDir = join(sourceSkillsDir, skill.name);
    const skillPath = join(skillDir, 'SKILL.md');

    if (existsSync(skillPath) && !force) {
      console.log(`Skip source skill: ${skillPath} already exists.`);
      continue;
    }

    mkdirSync(skillDir, { recursive: true });
    writeFileSync(skillPath, renderSkill(skill), 'utf8');
    console.log(`Create source skill: ${skillPath}`);
  }
}

function setupClaude(sourceSkillsDir: string, options: SetupOptions): void {
  const claudeHome = process.env.CLAUDE_HOME || join(homedir(), '.claude');
  if (!existsSync(claudeHome)) {
    console.log('Skip Claude: ~/.claude was not found.');
    return;
  }

  linkSkills(
    sourceSkillsDir,
    join(claudeHome, 'skills'),
    'Claude',
    options.force,
  );

  if (!options.noRules) {
    upsertRules(join(claudeHome, 'CLAUDE.md'), options.force, 'Claude');
  }
}

function setupCodex(sourceSkillsDir: string, options: SetupOptions): void {
  const codexHome = process.env.CODEX_HOME || join(homedir(), '.codex');
  const agentsHome = process.env.AGENTS_HOME || join(homedir(), '.agents');
  if (!existsSync(codexHome) && !existsSync(agentsHome)) {
    console.log('Skip Codex: neither ~/.codex nor ~/.agents was found.');
    return;
  }

  linkSkills(
    sourceSkillsDir,
    join(agentsHome, 'skills'),
    'Codex',
    options.force,
  );

  if (!options.noRules) {
    upsertRules(join(codexHome, 'AGENTS.md'), options.force, 'Codex');
  }
}

function linkSkills(
  sourceSkillsDir: string,
  targetSkillsDir: string,
  label: string,
  force: boolean,
): void {
  mkdirSync(targetSkillsDir, { recursive: true });

  for (const skill of SKILLS) {
    const sourceDir = join(sourceSkillsDir, skill.name);
    const targetDir = join(targetSkillsDir, skill.name);

    if (existsSync(targetDir)) {
      const stat = lstatSync(targetDir);
      if (!force) {
        console.log(`Skip ${label} skill link: ${targetDir} already exists.`);
        continue;
      }
      rmSync(targetDir, {
        recursive: stat.isDirectory() && !stat.isSymbolicLink(),
        force: true,
      });
    }

    symlinkSync(sourceDir, targetDir, 'dir');
    console.log(`Link ${label} skill: ${targetDir} -> ${sourceDir}`);
  }
}

function upsertRules(path: string, force: boolean, label: string): void {
  mkdirSync(dirname(path), { recursive: true });
  const block = `${RULE_START}\n${RULES}\n${RULE_END}`;
  const current = existsSync(path) ? readFileSync(path, 'utf8') : '';
  const pattern = new RegExp(
    `${escapeRegExp(RULE_START)}[\\s\\S]*?${escapeRegExp(RULE_END)}`,
  );

  if (pattern.test(current)) {
    if (!force) {
      console.log(
        `Skip ${label} rules: ${path} already contains a PaPut-managed block.`,
      );
      return;
    }

    writeFileSync(path, current.replace(pattern, block), 'utf8');
    console.log(`Update ${label} rules: ${path}`);
    return;
  }

  const next = `${current.trimEnd()}${current ? '\n\n' : ''}${block}\n`;
  writeFileSync(path, next, 'utf8');
  console.log(`Append ${label} rules: ${path}`);
}

export function findSkill(name: string): SkillSpec | undefined {
  return SKILLS.find((skill) => skill.name === name);
}

export function renderSkill(skill: SkillSpec): string {
  return `---
name: ${skill.name}
description: ${skill.description}
---

${skill.body}
`;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
