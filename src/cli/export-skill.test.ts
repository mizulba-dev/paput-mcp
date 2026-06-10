import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { inflateRawSync } from 'node:zlib';
import { afterEach, describe, expect, it } from 'vitest';
import { createZip, exportSkill } from './export-skill.js';
import { SKILLS } from './setup-ai.js';

const tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { force: true, recursive: true });
  }
});

describe('createZip', () => {
  it('creates a readable ZIP for a skill folder', () => {
    const zip = createZip([
      {
        path: 'example-skill/SKILL.md',
        data: Buffer.from('# Example Skill\n', 'utf8'),
      },
    ]);
    const entry = readFirstZipEntry(zip);

    expect(entry.path).toBe('example-skill/SKILL.md');
    expect(entry.content).toBe('# Example Skill\n');
  });
});

describe('exportSkill', () => {
  it('exports paput-dashboard-analysis as a ZIP file', () => {
    const dir = mkdtempSync(join(tmpdir(), 'paput-export-skill-test-'));
    tempDirs.push(dir);
    const outputPath = join(dir, 'dashboard.zip');

    exportSkill(['paput-dashboard-analysis', '--output', outputPath]);

    const entry = readFirstZipEntry(readFileSync(outputPath));
    expect(entry.path).toBe('paput-dashboard-analysis/SKILL.md');
    expect(entry.content).toContain('name: paput-dashboard-analysis');
    expect(entry.content).toContain('paput_get_dashboard_analysis_context');
  });

  it('exports paput-project-summary as a ZIP file', () => {
    const dir = mkdtempSync(join(tmpdir(), 'paput-export-skill-test-'));
    tempDirs.push(dir);
    const outputPath = join(dir, 'project-summary.zip');

    exportSkill(['paput-project-summary', '--output', outputPath]);

    const entry = readFirstZipEntry(readFileSync(outputPath));
    expect(entry.path).toBe('paput-project-summary/SKILL.md');
    expect(entry.content).toContain('name: paput-project-summary');
    expect(entry.content).toContain(
      'paput_get_skill_sheet_project_summary_context',
    );
  });

  it('exports a named skill into the output directory', () => {
    const dir = mkdtempSync(join(tmpdir(), 'paput-export-skill-test-'));
    tempDirs.push(dir);

    exportSkill(['paput-dashboard-analysis', '--output', dir]);

    const entry = readFirstZipEntry(
      readFileSync(join(dir, 'paput-dashboard-analysis.zip')),
    );
    expect(entry.path).toBe('paput-dashboard-analysis/SKILL.md');
  });

  it('exports all skills when no skill name is provided', () => {
    const dir = mkdtempSync(join(tmpdir(), 'paput-export-skill-test-'));
    tempDirs.push(dir);

    exportSkill(['--output', dir]);

    for (const skill of SKILLS) {
      const entry = readFirstZipEntry(
        readFileSync(join(dir, `${skill.name}.zip`)),
      );
      expect(entry.path).toBe(`${skill.name}/SKILL.md`);
      expect(entry.content).toContain(`name: ${skill.name}`);
    }
  });
});

function readFirstZipEntry(zip: Buffer): { path: string; content: string } {
  expect(zip.readUInt32LE(0)).toBe(0x04034b50);
  const compressionMethod = zip.readUInt16LE(8);
  const compressedSize = zip.readUInt32LE(18);
  const filenameLength = zip.readUInt16LE(26);
  const extraLength = zip.readUInt16LE(28);
  const filenameStart = 30;
  const dataStart = filenameStart + filenameLength + extraLength;
  const dataEnd = dataStart + compressedSize;
  const filename = zip.subarray(filenameStart, dataStart).toString('utf8');
  const compressed = zip.subarray(dataStart, dataEnd);
  const content =
    compressionMethod === 8 ? inflateRawSync(compressed) : compressed;

  return {
    path: filename,
    content: content.toString('utf8'),
  };
}
