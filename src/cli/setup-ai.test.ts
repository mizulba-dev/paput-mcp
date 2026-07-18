import {
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readlinkSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { findSkill, renderSkill, setupAi, SKILLS } from './setup-ai.js';

describe('setupAi', () => {
  const envKeys = [
    'PAPUT_HOME',
    'CLAUDE_HOME',
    'CODEX_HOME',
    'AGENTS_HOME',
  ] as const;
  const originalEnv: Partial<Record<(typeof envKeys)[number], string>> = {};
  const originalExitCode = process.exitCode;
  let root: string;
  let paputHome: string;
  let claudeHome: string;
  let codexHome: string;
  let agentsHome: string;

  beforeEach(() => {
    for (const key of envKeys) {
      originalEnv[key] = process.env[key];
    }
    root = mkdtempSync(join(tmpdir(), 'paput-setup-ai-test-'));
    paputHome = join(root, '.paput');
    claudeHome = join(root, '.claude');
    codexHome = join(root, '.codex');
    agentsHome = join(root, '.agents');
    process.env.PAPUT_HOME = paputHome;
    process.env.CLAUDE_HOME = claudeHome;
    process.env.CODEX_HOME = codexHome;
    process.env.AGENTS_HOME = agentsHome;
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    for (const key of envKeys) {
      const value = originalEnv[key];
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
    process.exitCode = originalExitCode;
    rmSync(root, { force: true, recursive: true });
  });

  it('preserves argument-hint through renderSkill and omits it when absent', () => {
    const withHint = findSkill('paput-harvest');
    expect(withHint?.argumentHint).toBe('[backfill]');
    expect(renderSkill(withHint!)).toContain('\nargument-hint: [backfill]\n');

    const withoutHint = SKILLS.find((skill) => !skill.argumentHint);
    expect(withoutHint).toBeDefined();
    expect(renderSkill(withoutHint!)).not.toContain('argument-hint');
  });

  it('creates canonical skills under PAPUT_HOME/skills', () => {
    setupAi([]);

    for (const skill of SKILLS) {
      const skillPath = join(paputHome, 'skills', skill.name, 'SKILL.md');
      expect(existsSync(skillPath)).toBe(true);
      expect(readFileSync(skillPath, 'utf8')).toBe(renderSkill(skill));
    }
  });

  it('keeps locally edited source skills unless --force is given', () => {
    const skill = SKILLS[0];
    const skillPath = join(paputHome, 'skills', skill.name, 'SKILL.md');
    mkdirSync(join(paputHome, 'skills', skill.name), { recursive: true });
    writeFileSync(skillPath, 'edited', 'utf8');

    setupAi([]);
    expect(readFileSync(skillPath, 'utf8')).toBe('edited');

    setupAi(['--force']);
    expect(readFileSync(skillPath, 'utf8')).toBe(renderSkill(skill));
  });

  it('prunes stale paput-* source skills and keeps unrelated directories', () => {
    const staleDir = join(paputHome, 'skills', 'paput-removed-skill');
    const unrelatedDir = join(paputHome, 'skills', 'my-own-skill');
    mkdirSync(staleDir, { recursive: true });
    mkdirSync(unrelatedDir, { recursive: true });

    setupAi([]);

    expect(existsSync(staleDir)).toBe(false);
    expect(existsSync(unrelatedDir)).toBe(true);
  });

  it('links skills into Claude and Codex skill directories', () => {
    mkdirSync(claudeHome, { recursive: true });
    mkdirSync(codexHome, { recursive: true });

    setupAi([]);

    for (const skill of SKILLS) {
      const claudeLink = join(claudeHome, 'skills', skill.name);
      const codexLink = join(agentsHome, 'skills', skill.name);
      expect(lstatSync(claudeLink).isSymbolicLink()).toBe(true);
      expect(readlinkSync(claudeLink)).toBe(
        join(paputHome, 'skills', skill.name),
      );
      expect(lstatSync(codexLink).isSymbolicLink()).toBe(true);
    }
  });

  it('skips Claude and Codex when their home directories do not exist', () => {
    setupAi([]);

    expect(existsSync(join(claudeHome, 'skills'))).toBe(false);
    expect(existsSync(join(agentsHome, 'skills'))).toBe(false);
  });

  it('prunes stale paput-* links only when they point into the source dir', () => {
    mkdirSync(claudeHome, { recursive: true });
    const targetSkillsDir = join(claudeHome, 'skills');
    mkdirSync(targetSkillsDir, { recursive: true });

    const staleLink = join(targetSkillsDir, 'paput-removed-skill');
    symlinkSync(join(paputHome, 'skills', 'paput-removed-skill'), staleLink);

    const foreignSource = join(root, 'foreign-skill');
    mkdirSync(foreignSource, { recursive: true });
    const foreignLink = join(targetSkillsDir, 'paput-foreign');
    symlinkSync(foreignSource, foreignLink);

    const realDir = join(targetSkillsDir, 'paput-realdir');
    mkdirSync(realDir, { recursive: true });

    setupAi([]);

    expect(existsSync(staleLink)).toBe(false);
    expect(lstatSync(foreignLink).isSymbolicLink()).toBe(true);
    expect(existsSync(realDir)).toBe(true);
  });

  it('keeps existing link targets unless --force is given', () => {
    mkdirSync(claudeHome, { recursive: true });
    const skill = SKILLS[0];
    const targetDir = join(claudeHome, 'skills', skill.name);
    mkdirSync(targetDir, { recursive: true });

    setupAi([]);
    expect(lstatSync(targetDir).isSymbolicLink()).toBe(false);

    setupAi(['--force']);
    expect(lstatSync(targetDir).isSymbolicLink()).toBe(true);
  });

  it('appends the managed rules block and preserves user content', () => {
    mkdirSync(claudeHome, { recursive: true });
    mkdirSync(codexHome, { recursive: true });
    const claudeMd = join(claudeHome, 'CLAUDE.md');
    writeFileSync(claudeMd, '# My rules\n', 'utf8');

    setupAi([]);

    const content = readFileSync(claudeMd, 'utf8');
    expect(content).toContain('# My rules');
    expect(content).toContain('<!-- paput-mcp:start -->');
    expect(content).toContain('<!-- paput-mcp:end -->');
    expect(readFileSync(join(codexHome, 'AGENTS.md'), 'utf8')).toContain(
      '<!-- paput-mcp:start -->',
    );
  });

  it('refreshes an existing managed block only with --force', () => {
    mkdirSync(claudeHome, { recursive: true });
    const claudeMd = join(claudeHome, 'CLAUDE.md');
    writeFileSync(
      claudeMd,
      '# Before\n\n<!-- paput-mcp:start -->\nold block\n<!-- paput-mcp:end -->\n\n# After\n',
      'utf8',
    );

    setupAi([]);
    expect(readFileSync(claudeMd, 'utf8')).toContain('old block');

    setupAi(['--force']);
    const content = readFileSync(claudeMd, 'utf8');
    expect(content).not.toContain('old block');
    expect(content).toContain('# Before');
    expect(content).toContain('# After');
    expect(content.match(/<!-- paput-mcp:start -->/g)).toHaveLength(1);
  });

  it('does not touch rules files with --no-rules', () => {
    mkdirSync(claudeHome, { recursive: true });

    setupAi(['--no-rules']);

    expect(existsSync(join(claudeHome, 'CLAUDE.md'))).toBe(false);
    expect(existsSync(join(codexHome, 'AGENTS.md'))).toBe(false);
  });

  it('limits the targets with --claude-only and --codex-only', () => {
    mkdirSync(claudeHome, { recursive: true });
    mkdirSync(codexHome, { recursive: true });

    setupAi(['--claude-only']);
    expect(existsSync(join(claudeHome, 'skills'))).toBe(true);
    expect(existsSync(join(agentsHome, 'skills'))).toBe(false);

    setupAi(['--codex-only']);
    expect(existsSync(join(agentsHome, 'skills'))).toBe(true);
  });

  it('fails when --claude-only and --codex-only are combined', () => {
    setupAi(['--claude-only', '--codex-only']);

    expect(process.exitCode).toBe(1);
    expect(existsSync(join(paputHome, 'skills'))).toBe(true);
  });

  it('installs only rules with --rules-only', () => {
    mkdirSync(claudeHome, { recursive: true });
    mkdirSync(codexHome, { recursive: true });

    setupAi(['--rules-only']);

    expect(existsSync(join(paputHome, 'skills'))).toBe(false);
    expect(existsSync(join(claudeHome, 'skills'))).toBe(false);
    expect(existsSync(join(agentsHome, 'skills'))).toBe(false);
    expect(readFileSync(join(claudeHome, 'CLAUDE.md'), 'utf8')).toContain(
      '<!-- paput-mcp:start -->',
    );
    expect(readFileSync(join(codexHome, 'AGENTS.md'), 'utf8')).toContain(
      '<!-- paput-mcp:start -->',
    );
  });

  it('removes CLI-managed skills and keeps rules with --remove-skills', () => {
    mkdirSync(claudeHome, { recursive: true });
    mkdirSync(codexHome, { recursive: true });
    setupAi([]);

    const unrelatedDir = join(paputHome, 'skills', 'my-own-skill');
    mkdirSync(unrelatedDir, { recursive: true });
    const foreignSource = join(root, 'foreign-skill');
    mkdirSync(foreignSource, { recursive: true });
    const foreignLink = join(claudeHome, 'skills', 'paput-foreign');
    symlinkSync(foreignSource, foreignLink);

    setupAi(['--remove-skills']);

    for (const skill of SKILLS) {
      expect(existsSync(join(paputHome, 'skills', skill.name))).toBe(false);
      expect(existsSync(join(claudeHome, 'skills', skill.name))).toBe(false);
      expect(existsSync(join(agentsHome, 'skills', skill.name))).toBe(false);
    }
    expect(existsSync(unrelatedDir)).toBe(true);
    expect(lstatSync(foreignLink).isSymbolicLink()).toBe(true);
    expect(readFileSync(join(claudeHome, 'CLAUDE.md'), 'utf8')).toContain(
      '<!-- paput-mcp:start -->',
    );
  });

  it('keeps source skills when --remove-skills is limited to one target', () => {
    mkdirSync(claudeHome, { recursive: true });
    mkdirSync(codexHome, { recursive: true });
    setupAi([]);

    setupAi(['--remove-skills', '--claude-only']);

    const skill = SKILLS[0];
    expect(existsSync(join(claudeHome, 'skills', skill.name))).toBe(false);
    expect(
      lstatSync(join(agentsHome, 'skills', skill.name)).isSymbolicLink(),
    ).toBe(true);
    expect(existsSync(join(paputHome, 'skills', skill.name))).toBe(true);
  });

  it('fails when --rules-only and --remove-skills are combined', () => {
    setupAi(['--rules-only', '--remove-skills']);

    expect(process.exitCode).toBe(1);
    expect(existsSync(join(paputHome, 'skills'))).toBe(false);
  });

  it('fails when --rules-only and --no-rules are combined', () => {
    mkdirSync(claudeHome, { recursive: true });

    setupAi(['--rules-only', '--no-rules']);

    expect(process.exitCode).toBe(1);
    expect(existsSync(join(claudeHome, 'CLAUDE.md'))).toBe(false);
  });
});

describe('findSkill', () => {
  it('finds a known skill and returns undefined for unknown names', () => {
    expect(findSkill('paput-capture')?.name).toBe('paput-capture');
    expect(findSkill('unknown-skill')).toBeUndefined();
  });
});
