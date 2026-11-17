import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { projectHeaderJson } from './cli/project-header.js';

const tempDirs: string[] = [];

function withConfig(lines: string[]): string {
  const dir = mkdtempSync(join(tmpdir(), 'paput-project-header-'));
  tempDirs.push(dir);
  writeFileSync(join(dir, 'projects'), lines.join('\n') + '\n');
  return dir;
}

interface HelperResult {
  stdout: string;
  /** 出力が JSON オブジェクトとして壊れていないことは契約の一部。 */
  parsed: Record<string, string>;
}

function run(
  projectDir: string,
  env: Record<string, string> = {},
): HelperResult {
  const merged = {
    ...process.env,
    PAPUT_PROJECT_ALIAS: '',
    ...env,
  } as NodeJS.ProcessEnv;
  const stdout = projectHeaderJson(projectDir, merged);
  return { stdout, parsed: JSON.parse(stdout) };
}

afterEach(() => {
  while (tempDirs.length > 0) {
    rmSync(tempDirs.pop()!, { recursive: true, force: true });
  }
});

describe('plugin project header helper', () => {
  it('resolves an exactly matching project directory', () => {
    const cfg = withConfig(['# alias\tpath', 'paput\t/repos/paput']);

    expect(run('/repos/paput', { PAPUT_HOME: cfg }).stdout).toBe(
      '{"X-PaPut-Project-Alias":"paput"}',
    );
  });

  it('resolves a subdirectory of a registered project', () => {
    const cfg = withConfig(['paput\t/repos/paput']);

    expect(run('/repos/paput/paput-front', { PAPUT_HOME: cfg }).stdout).toBe(
      '{"X-PaPut-Project-Alias":"paput"}',
    );
  });

  it('prefers the longest matching path', () => {
    const cfg = withConfig([
      'paput\t/repos/paput',
      'paputapi\t/repos/paput/paput-api',
    ]);

    expect(
      run('/repos/paput/paput-api/internal', { PAPUT_HOME: cfg }).stdout,
    ).toBe('{"X-PaPut-Project-Alias":"paputapi"}');
  });

  it('does not match a sibling directory sharing the same prefix string', () => {
    const cfg = withConfig(['paput\t/repos/paput']);

    expect(run('/repos/paput-other', { PAPUT_HOME: cfg }).stdout).toBe('{}');
  });

  it('ignores a trailing slash on the registered path', () => {
    const cfg = withConfig(['paput\t/repos/paput/']);

    expect(run('/repos/paput/sub', { PAPUT_HOME: cfg }).stdout).toBe(
      '{"X-PaPut-Project-Alias":"paput"}',
    );
  });

  it('matches paths containing spaces', () => {
    const cfg = withConfig(['spaced\t/repos/my dir']);

    expect(run('/repos/my dir/sub', { PAPUT_HOME: cfg }).stdout).toBe(
      '{"X-PaPut-Project-Alias":"spaced"}',
    );
  });

  it('uses an alias-only line as the fallback for unregistered paths', () => {
    const cfg = withConfig(['paput\t/repos/paput', 'fallbackalias']);

    expect(run('/repos/elsewhere', { PAPUT_HOME: cfg }).stdout).toBe(
      '{"X-PaPut-Project-Alias":"fallbackalias"}',
    );
    expect(run('/repos/paput', { PAPUT_HOME: cfg }).stdout).toBe(
      '{"X-PaPut-Project-Alias":"paput"}',
    );
  });

  it('lets the environment variable win over the config file', () => {
    const cfg = withConfig(['paput\t/repos/paput']);

    expect(
      run('/repos/paput', {
        PAPUT_HOME: cfg,
        PAPUT_PROJECT_ALIAS: 'devmethod',
      }).stdout,
    ).toBe('{"X-PaPut-Project-Alias":"devmethod"}');
  });

  it('drops values that fail the alias format check', () => {
    const cfg = withConfig(['Bad Alias\t/repos/paput', 'ab\t/repos/short']);

    expect(run('/repos/paput', { PAPUT_HOME: cfg }).stdout).toBe('{}');
    expect(run('/repos/short', { PAPUT_HOME: cfg }).stdout).toBe('{}');
    expect(
      run('/repos/paput', {
        PAPUT_HOME: cfg,
        PAPUT_PROJECT_ALIAS: 'ab',
      }).stdout,
    ).toBe('{}');
  });

  it('returns an empty header set for an unregistered path', () => {
    const cfg = withConfig(['paput\t/repos/paput']);

    expect(run('/repos/elsewhere', { PAPUT_HOME: cfg }).stdout).toBe('{}');
  });

  it('degrades to an empty header set when the config is missing', () => {
    const result = run('/repos/paput', {
      PAPUT_HOME: '/nonexistent-paput-config',
    });

    expect(result.stdout).toBe('{}');
    expect(result.stdout.length).toBeGreaterThan(0);
  });

  it('degrades to an empty header set when the config is unparseable', () => {
    const dir = mkdtempSync(join(tmpdir(), 'paput-project-header-'));
    tempDirs.push(dir);
    writeFileSync(join(dir, 'projects'), Buffer.from([0, 1, 2, 3, 255, 254]));

    const result = run('/repos/paput', { PAPUT_HOME: dir });

    expect(result.stdout).toBe('{}');
    expect(result.stdout.length).toBeGreaterThan(0);
  });

  it('degrades to an empty header set when no project directory is given', () => {
    const cfg = withConfig(['paput\t/repos/paput']);
    const result = run('', { PAPUT_HOME: cfg });

    expect(result.stdout).toBe('{}');
    expect(result.stdout.length).toBeGreaterThan(0);
  });

  it('never throws on any resolution path', () => {
    const cfg = withConfig(['paput\t/repos/paput']);

    for (const dir of ['/repos/paput', '/repos/elsewhere', '', '${CLAUDE_PROJECT_DIR}']) {
      expect(() => projectHeaderJson(dir, { PAPUT_HOME: cfg } as NodeJS.ProcessEnv)).not.toThrow();
    }
  });

  it('rejects a multi-line alias instead of emitting broken JSON', () => {
    const cfg = withConfig(['paput\t/repos/paput']);

    const result = run('/repos/elsewhere', {
      PAPUT_HOME: cfg,
      PAPUT_PROJECT_ALIAS: 'evil"\nabc',
    });

    expect(result.parsed).toEqual({});
    expect(result.stdout.length).toBeGreaterThan(0);
  });

  it('degrades to an empty header set when HOME is unset', () => {
    const stdout = projectHeaderJson('/repos/paput', {} as NodeJS.ProcessEnv);

    const result = { stdout, parsed: JSON.parse(stdout) };
    expect(result.parsed).toEqual({});
    expect(result.stdout.length).toBeGreaterThan(0);
  });

  it('accepts spaces as the separator so the documented example works verbatim', () => {
    const cfg = withConfig([
      '# alias        path',
      'paput          /repos/paput',
      'gaikodb        /repos/gaiko-db',
      'mydefault',
    ]);

    expect(run('/repos/paput', { PAPUT_HOME: cfg }).parsed).toEqual({
      'X-PaPut-Project-Alias': 'paput',
    });
    expect(run('/repos/gaiko-db/sub', { PAPUT_HOME: cfg }).parsed).toEqual({
      'X-PaPut-Project-Alias': 'gaikodb',
    });
    expect(run('/repos/elsewhere', { PAPUT_HOME: cfg }).parsed).toEqual({
      'X-PaPut-Project-Alias': 'mydefault',
    });
  });

  it('keeps a tab inside the registered path', () => {
    const cfg = withConfig(['tabbed\t/repos/has\ttab/dir']);

    expect(run('/repos/has\ttab/dir/sub', { PAPUT_HOME: cfg }).parsed).toEqual({
      'X-PaPut-Project-Alias': 'tabbed',
    });
  });

  it('tolerates CRLF line endings', () => {
    const dir = mkdtempSync(join(tmpdir(), 'paput-project-header-'));
    tempDirs.push(dir);
    writeFileSync(
      join(dir, 'projects'),
      'paput\t/repos/paput\r\nfallbackalias\r\n',
    );

    expect(run('/repos/paput', { PAPUT_HOME: dir }).parsed).toEqual({
      'X-PaPut-Project-Alias': 'paput',
    });
  });

  it('skips a malformed alias line instead of losing a shorter valid match', () => {
    const cfg = withConfig([
      'paput\t/repos/paput',
      'BAD_ALIAS\t/repos/paput/deep',
    ]);

    expect(run('/repos/paput/deep/x', { PAPUT_HOME: cfg }).parsed).toEqual({
      'X-PaPut-Project-Alias': 'paput',
    });
  });

  it('falls back to the default line when the project directory is unexpanded', () => {
    const cfg = withConfig(['paput\t/repos/paput', 'fallbackalias']);

    expect(run('${CLAUDE_PROJECT_DIR}', { PAPUT_HOME: cfg }).parsed).toEqual({
      'X-PaPut-Project-Alias': 'fallbackalias',
    });
  });
});

describe('plugin MCP configuration', () => {
  const claudeConfig = JSON.parse(
    readFileSync(
      fileURLToPath(new URL('./plugin/mcp/claude.json', import.meta.url)),
      'utf8',
    ),
  ) as {
    mcpServers: Record<string, { url: string; headersHelper?: string }>;
  };
  const codexConfig = JSON.parse(
    readFileSync(
      fileURLToPath(new URL('./plugin/mcp/codex.json', import.meta.url)),
      'utf8',
    ),
  ) as {
    mcpServers: Record<string, { url: string }>;
  };

  it('keeps both bundled URLs fixed to the canonical endpoint', () => {
    expect(claudeConfig.mcpServers.paput.url).toBe('https://mcp.paput.io/mcp');
    expect(codexConfig.mcpServers.paput.url).toBe('https://mcp.paput.io/mcp');
  });

  it('wires the headers helper to the npm CLI and the project directory', () => {
    const helper = claudeConfig.mcpServers.paput.headersHelper ?? '';

    // 配布物へ実行可能スクリプトを同梱すると Claude Desktop が marketplace ごと拒否する。
    // helper は npm パッケージのサブコマンドを呼ぶ形に保つ。
    expect(helper).toContain('project-header');
    expect(helper).toContain('${CLAUDE_PROJECT_DIR}');
    expect(helper).not.toContain('.sh');
    expect(helper).not.toContain('CLAUDE_PLUGIN_ROOT');
  });

  it('pins the npx launcher to the package version', () => {
    const helper = claudeConfig.mcpServers.paput.headersHelper ?? '';
    const { version } = JSON.parse(
      readFileSync(
        fileURLToPath(new URL('../package.json', import.meta.url)),
        'utf8',
      ),
    ) as { version: string };

    // Claude ディレクトリは版未固定の npx launcher を Blocks にする。
    expect(helper).toContain(`npx -y paput-mcp@${version} project-header`);
  });

});
