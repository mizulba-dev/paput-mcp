import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';

// headersHelper は `npx -y paput-mcp@<version> project-header <dir>` として実行される。
// 実プロセスでしか確かめられない契約（終了コードと stdout の形）をここで守る。
const ENTRY = fileURLToPath(new URL('../../dist/index.js', import.meta.url));

const tempDirs: string[] = [];

function withConfig(lines: string[]): string {
  const dir = mkdtempSync(join(tmpdir(), 'paput-project-header-cli-'));
  tempDirs.push(dir);
  writeFileSync(join(dir, 'projects'), lines.join('\n') + '\n');
  return dir;
}

function runCli(args: string[], env: Record<string, string> = {}) {
  return spawnSync(process.execPath, [ENTRY, 'project-header', ...args], {
    encoding: 'utf8',
    env: { ...process.env, PAPUT_PROJECT_ALIAS: '', ...env },
  });
}

afterEach(() => {
  while (tempDirs.length > 0) {
    rmSync(tempDirs.pop()!, { recursive: true, force: true });
  }
});

describe.skipIf(!existsSync(ENTRY))('project-header CLI', () => {
  it('prints the header object and exits 0 when the alias resolves', () => {
    const cfg = withConfig(['paput\t/repos/paput']);

    const result = runCli(['/repos/paput'], { PAPUT_HOME: cfg });

    expect(result.status).toBe(0);
    expect(result.stdout.trim()).toBe('{"X-PaPut-Project-Alias":"paput"}');
  });

  it('prints an empty object and exits 0 when nothing resolves', () => {
    const cfg = withConfig(['paput\t/repos/paput']);

    const result = runCli(['/repos/elsewhere'], { PAPUT_HOME: cfg });

    expect(result.status).toBe(0);
    expect(result.stdout.trim()).toBe('{}');
  });

  it('exits 0 even without a project directory argument', () => {
    const result = runCli([], { PAPUT_HOME: withConfig([]) });

    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout)).toEqual({});
  });
});
