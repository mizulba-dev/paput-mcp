import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  readlinkSync,
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
  rulesOnly: boolean;
  removeSkills: boolean;
  claude: boolean;
  codex: boolean;
}

interface SkillSpec {
  name: string;
  description: string;
  body: string;
}

const skillsDir = fileURLToPath(new URL('../plugin/skills', import.meta.url));
const rulesDir = fileURLToPath(new URL('./rules', import.meta.url));

function parseSkill(markdown: string, fallbackName: string): SkillSpec {
  const match = markdown.match(/^---\n([\s\S]*?)\n---\n\n([\s\S]*?)\n?$/);
  if (!match) {
    throw new Error(`Invalid SKILL.md format: ${fallbackName}`);
  }
  const frontmatter = match[1];
  const body = match[2];
  const name =
    frontmatter.match(/^name:\s*(.*)$/m)?.[1]?.trim() ?? fallbackName;
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
        `paput-${dirName}`,
      ),
    );
}

export const SKILLS: SkillSpec[] = loadSkills();
const RULES = readdirSync(rulesDir)
  .filter((fileName) => fileName.endsWith('.md'))
  .sort()
  .map((fileName) => readFileSync(join(rulesDir, fileName), 'utf8').trim())
  .join('\n\n');

const RULE_START = '<!-- paput-mcp:start -->';
const RULE_END = '<!-- paput-mcp:end -->';

export function setupAi(args: string[]): void {
  const options = parseOptions(args);
  if (!options) return;
  const paputHome = process.env.PAPUT_HOME || join(homedir(), '.paput');
  const sourceSkillsDir = join(paputHome, 'skills');

  if (options.removeSkills) {
    removeSkillsCommand(sourceSkillsDir, options);
    return;
  }

  printSetupNotice(options);

  if (!options.rulesOnly) {
    createSourceSkills(sourceSkillsDir, options.force);
    pruneSourceSkills(sourceSkillsDir);
  }

  if (options.claude) {
    setupClaude(sourceSkillsDir, options);
  }

  if (options.codex) {
    setupCodex(sourceSkillsDir, options);
  }
}

function parseOptions(args: string[]): SetupOptions | null {
  const claudeOnly = args.includes('--claude-only');
  const codexOnly = args.includes('--codex-only');
  const rulesOnly = args.includes('--rules-only');
  const removeSkills = args.includes('--remove-skills');

  if (rulesOnly && removeSkills) {
    console.error('--rules-only and --remove-skills cannot be used together.');
    process.exitCode = 1;
    return null;
  }

  if (rulesOnly && args.includes('--no-rules')) {
    console.error('--rules-only and --no-rules cannot be used together.');
    process.exitCode = 1;
    return null;
  }

  if (claudeOnly && codexOnly) {
    console.error('--claude-only and --codex-only cannot be used together.');
    process.exitCode = 1;
    return {
      force: false,
      noRules: false,
      rulesOnly: false,
      removeSkills: false,
      claude: false,
      codex: false,
    };
  }

  return {
    force: args.includes('--force'),
    noRules: args.includes('--no-rules'),
    rulesOnly,
    removeSkills,
    claude: !codexOnly,
    codex: !claudeOnly,
  };
}

function printSetupNotice(options: SetupOptions): void {
  console.log('Setting up PaPut AI integration.');
  console.log('');
  console.log('This command will:');
  if (!options.rulesOnly) {
    console.log('- Create canonical PaPut skills under ~/.paput/skills');
    if (options.claude) {
      console.log(
        '- Link skills into ~/.claude/skills when Claude is available',
      );
    }
    if (options.codex) {
      console.log(
        '- Link skills into ~/.agents/skills when Codex is available',
      );
    }
  }
  if (!options.noRules) {
    console.log('- Add PaPut usage rules to Claude/Codex global rules');
  }
  console.log('');
  console.log('Use --no-rules if you do not want to update global rules.');
  console.log(
    'Use --rules-only to update global rules without installing skills (e.g. when skills come from the PaPut plugin).',
  );
  console.log(
    'Use --force to refresh existing PaPut-managed blocks and links.',
  );
  console.log('');
}

function removeSkillsCommand(
  sourceSkillsDir: string,
  options: SetupOptions,
): void {
  console.log('Removing CLI-managed PaPut skills. Rules are kept as-is.');
  console.log('');

  if (options.claude) {
    const claudeHome = process.env.CLAUDE_HOME || join(homedir(), '.claude');
    removeSkillLinks(sourceSkillsDir, join(claudeHome, 'skills'), 'Claude');
  }

  if (options.codex) {
    const agentsHome = process.env.AGENTS_HOME || join(homedir(), '.agents');
    removeSkillLinks(sourceSkillsDir, join(agentsHome, 'skills'), 'Codex');
  }

  if (options.claude && options.codex) {
    removeSourceSkills(sourceSkillsDir);
  } else {
    console.log(
      'Keep source skills under ~/.paput/skills: the other target may still link to them. Run --remove-skills without --claude-only/--codex-only to remove them too.',
    );
  }
}

function removeSkillLinks(
  sourceSkillsDir: string,
  targetSkillsDir: string,
  label: string,
): void {
  if (!existsSync(targetSkillsDir)) return;

  for (const entry of readdirSync(targetSkillsDir, { withFileTypes: true })) {
    if (!entry.name.startsWith('paput-')) continue;

    const targetPath = join(targetSkillsDir, entry.name);
    if (!lstatSync(targetPath).isSymbolicLink()) continue;
    if (!readlinkSync(targetPath).startsWith(sourceSkillsDir)) continue;

    rmSync(targetPath, { force: true });
    console.log(`Remove ${label} skill link: ${targetPath}`);
  }
}

function removeSourceSkills(sourceSkillsDir: string): void {
  if (!existsSync(sourceSkillsDir)) return;

  for (const entry of readdirSync(sourceSkillsDir, { withFileTypes: true })) {
    if (!entry.isDirectory() || !entry.name.startsWith('paput-')) continue;

    const sourcePath = join(sourceSkillsDir, entry.name);
    rmSync(sourcePath, { recursive: true, force: true });
    console.log(`Remove source skill: ${sourcePath}`);
  }
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

function pruneSourceSkills(sourceSkillsDir: string): void {
  if (!existsSync(sourceSkillsDir)) return;
  const expected = new Set(SKILLS.map((skill) => skill.name));

  for (const entry of readdirSync(sourceSkillsDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    if (!entry.name.startsWith('paput-') || expected.has(entry.name)) continue;

    const stalePath = join(sourceSkillsDir, entry.name);
    rmSync(stalePath, { recursive: true, force: true });
    console.log(`Remove stale source skill: ${stalePath}`);
  }
}

function pruneSkillLinks(
  sourceSkillsDir: string,
  targetSkillsDir: string,
  label: string,
): void {
  if (!existsSync(targetSkillsDir)) return;
  const expected = new Set(SKILLS.map((skill) => skill.name));

  for (const entry of readdirSync(targetSkillsDir, { withFileTypes: true })) {
    if (!entry.name.startsWith('paput-') || expected.has(entry.name)) continue;

    const targetPath = join(targetSkillsDir, entry.name);
    if (!lstatSync(targetPath).isSymbolicLink()) continue;
    if (!readlinkSync(targetPath).startsWith(sourceSkillsDir)) continue;

    rmSync(targetPath, { force: true });
    console.log(`Remove stale ${label} skill link: ${targetPath}`);
  }
}

function setupClaude(sourceSkillsDir: string, options: SetupOptions): void {
  const claudeHome = process.env.CLAUDE_HOME || join(homedir(), '.claude');
  if (!existsSync(claudeHome)) {
    console.log('Skip Claude: ~/.claude was not found.');
    return;
  }

  if (!options.rulesOnly) {
    linkSkills(
      sourceSkillsDir,
      join(claudeHome, 'skills'),
      'Claude',
      options.force,
    );
  }

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

  if (!options.rulesOnly) {
    linkSkills(
      sourceSkillsDir,
      join(agentsHome, 'skills'),
      'Codex',
      options.force,
    );
  }

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
  pruneSkillLinks(sourceSkillsDir, targetSkillsDir, label);

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
  return SKILLS.find(
    (skill) => skill.name === name || skill.name === `paput-${name}`,
  );
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
