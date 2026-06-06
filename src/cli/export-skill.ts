import { deflateRawSync } from 'node:zlib';
import { homedir } from 'node:os';
import { dirname, extname, join, resolve } from 'node:path';
import { mkdirSync, writeFileSync } from 'node:fs';
import { findSkill, renderSkill, SKILLS } from './setup-ai.js';

interface ExportSkillOptions {
  skillName?: string;
  output: string;
}

interface ZipEntry {
  path: string;
  data: Buffer;
}

export function exportSkill(args: string[]): void {
  const options = parseOptions(args);
  const skills = options.skillName
    ? [findSkill(options.skillName)]
    : [...SKILLS];

  if (skills.some((skill) => !skill)) {
    throw new Error(`Unknown skill: ${options.skillName}`);
  }
  if (!options.skillName && extname(resolve(options.output)) === '.zip') {
    throw new Error(
      '--output must be a directory when exporting all skills. Omit the skill name and use --output ~/Downloads.',
    );
  }

  const outputPaths = skills.map((skill) => {
    if (!skill) throw new Error('Unexpected missing skill');

    const outputPath = resolveOutputPath(options.output, skill.name);
    const skillMarkdown = renderSkill(skill);
    const zip = createZip([
      {
        path: `${skill.name}/SKILL.md`,
        data: Buffer.from(skillMarkdown, 'utf8'),
      },
    ]);

    mkdirSync(dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, zip);
    return outputPath;
  });

  console.log(`Exported ${outputPaths.length} skill ZIP(s):`);
  for (const outputPath of outputPaths) {
    console.log(`- ${outputPath}`);
  }
}

function parseOptions(args: string[]): ExportSkillOptions {
  let skillName: string | undefined;
  let output = expandHome('~/Downloads');

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--output' || arg === '-o') {
      const value = args[index + 1];
      if (!value) {
        throw new Error(`${arg} requires a file path`);
      }
      output = expandHome(value);
      index += 1;
      continue;
    }

    if (!arg.startsWith('-') && !skillName) {
      skillName = arg;
      continue;
    }

    throw new Error(`Unknown option for export-skill: ${arg}`);
  }

  return {
    skillName,
    output,
  };
}

function resolveOutputPath(output: string, skillName: string): string {
  const resolved = resolve(output);
  const looksLikeZipFile = extname(resolved) === '.zip';

  if (looksLikeZipFile) {
    return resolved;
  }

  return join(resolved, `${skillName}.zip`);
}

function expandHome(path: string): string {
  if (path === '~') return homedir();
  if (path.startsWith('~/')) return join(homedir(), path.slice(2));
  return path;
}

export function createZip(entries: ZipEntry[]): Buffer {
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let offset = 0;

  for (const entry of entries) {
    const filename = Buffer.from(entry.path, 'utf8');
    const compressed = deflateRawSync(entry.data);
    const crc = crc32(entry.data);
    const localHeader = createLocalFileHeader({
      filename,
      crc,
      compressedSize: compressed.length,
      uncompressedSize: entry.data.length,
    });
    const centralHeader = createCentralDirectoryHeader({
      filename,
      crc,
      compressedSize: compressed.length,
      uncompressedSize: entry.data.length,
      localHeaderOffset: offset,
    });

    localParts.push(localHeader, filename, compressed);
    centralParts.push(centralHeader, filename);
    offset += localHeader.length + filename.length + compressed.length;
  }

  const centralDirectory = Buffer.concat(centralParts);
  const endOfCentralDirectory = createEndOfCentralDirectory({
    entryCount: entries.length,
    centralDirectorySize: centralDirectory.length,
    centralDirectoryOffset: offset,
  });

  return Buffer.concat([
    ...localParts,
    centralDirectory,
    endOfCentralDirectory,
  ]);
}

function createLocalFileHeader(params: {
  filename: Buffer;
  crc: number;
  compressedSize: number;
  uncompressedSize: number;
}): Buffer {
  const header = Buffer.alloc(30);
  header.writeUInt32LE(0x04034b50, 0);
  header.writeUInt16LE(20, 4);
  header.writeUInt16LE(0, 6);
  header.writeUInt16LE(8, 8);
  header.writeUInt16LE(0, 10);
  header.writeUInt16LE(0, 12);
  header.writeUInt32LE(params.crc, 14);
  header.writeUInt32LE(params.compressedSize, 18);
  header.writeUInt32LE(params.uncompressedSize, 22);
  header.writeUInt16LE(params.filename.length, 26);
  header.writeUInt16LE(0, 28);
  return header;
}

function createCentralDirectoryHeader(params: {
  filename: Buffer;
  crc: number;
  compressedSize: number;
  uncompressedSize: number;
  localHeaderOffset: number;
}): Buffer {
  const header = Buffer.alloc(46);
  header.writeUInt32LE(0x02014b50, 0);
  header.writeUInt16LE(20, 4);
  header.writeUInt16LE(20, 6);
  header.writeUInt16LE(0, 8);
  header.writeUInt16LE(8, 10);
  header.writeUInt16LE(0, 12);
  header.writeUInt16LE(0, 14);
  header.writeUInt32LE(params.crc, 16);
  header.writeUInt32LE(params.compressedSize, 20);
  header.writeUInt32LE(params.uncompressedSize, 24);
  header.writeUInt16LE(params.filename.length, 28);
  header.writeUInt16LE(0, 30);
  header.writeUInt16LE(0, 32);
  header.writeUInt16LE(0, 34);
  header.writeUInt16LE(0, 36);
  header.writeUInt32LE(0, 38);
  header.writeUInt32LE(params.localHeaderOffset, 42);
  return header;
}

function createEndOfCentralDirectory(params: {
  entryCount: number;
  centralDirectorySize: number;
  centralDirectoryOffset: number;
}): Buffer {
  const record = Buffer.alloc(22);
  record.writeUInt32LE(0x06054b50, 0);
  record.writeUInt16LE(0, 4);
  record.writeUInt16LE(0, 6);
  record.writeUInt16LE(params.entryCount, 8);
  record.writeUInt16LE(params.entryCount, 10);
  record.writeUInt32LE(params.centralDirectorySize, 12);
  record.writeUInt32LE(params.centralDirectoryOffset, 16);
  record.writeUInt16LE(0, 20);
  return record;
}

function crc32(data: Buffer): number {
  let crc = 0xffffffff;

  for (const byte of data) {
    crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ byte) & 0xff];
  }

  return (crc ^ 0xffffffff) >>> 0;
}

const CRC_TABLE = new Uint32Array(256);
for (let index = 0; index < 256; index += 1) {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) {
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }
  CRC_TABLE[index] = value >>> 0;
}
