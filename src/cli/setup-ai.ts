import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

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

const skillsDir = fileURLToPath(new URL('./skills', import.meta.url));
const rulesDir = fileURLToPath(new URL('./rules', import.meta.url));

function parseSkill(markdown: string, fallbackName: string): SkillSpec {
  const match = markdown.match(/^---\n([\s\S]*?)\n---\n\n([\s\S]*?)\n?$/);
  if (!match) {
    throw new Error(`Invalid SKILL.md format: ${fallbackName}`);
  }
  const frontmatter = match[1];
  const body = match[2];
  const name = frontmatter.match(/^name:\s*(.*)$/m)?.[1]?.trim() ?? fallbackName;
  const description =
    frontmatter.match(/^description:\s*(.*)$/m)?.[1]?.trim() ?? '';
  return { name, description, body };
}

function loadSkills(): SkillSpec[] {
  return readdirSync(skillsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()
    .map((dirName) =>
      parseSkill(
        readFileSync(join(skillsDir, dirName, 'SKILL.md'), 'utf8'),
        dirName,
      ),
    );
}

export const SKILLS: SkillSpec[] = loadSkills();
const RULES = readFileSync(
  join(rulesDir, 'paput-knowledge-capture.md'),
  'utf8',
).trim();

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
