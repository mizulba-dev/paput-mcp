import { createHash, randomUUID } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import {
  CapturePolicy,
  KnowledgeCandidateInput,
  PendingKnowledgeCandidate,
  ProcessedSession,
  SessionSource,
  SimilarMemo,
} from '../../types/knowledge.js';

interface CacheData {
  pending: PendingKnowledgeCandidate[];
  sessions: ProcessedSession[];
}

const CAPTURE_POLICY_FILE = 'capture-policy.md';

export function getCacheDir(): string {
  return expandHome(
    process.env.PAPUT_CACHE_DIR ||
      `${process.env.PAPUT_HOME || '~/.paput'}/cache`,
  );
}

export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[`*_#>\-\[\]().,、。！？!?:：;；"'“”‘’]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function createFingerprint(title: string, body: string): string {
  return createHash('sha256')
    .update(`${normalizeText(title)}\n${normalizeText(body)}`)
    .digest('hex');
}

export function readCache(): CacheData {
  ensureCacheDir();

  return {
    pending: readJsonlFile<PendingKnowledgeCandidate>('pending.jsonl'),
    sessions: readJsonFile<ProcessedSession[]>('sessions.json', []),
  };
}

export function readCapturePolicy(): CapturePolicy {
  ensureCacheDir();
  const path = cachePath(CAPTURE_POLICY_FILE);

  if (!existsSync(path)) {
    return {
      path,
      markdown: '',
      exists: false,
      updated_at: null,
    };
  }

  return {
    path,
    markdown: readFileSync(path, 'utf8'),
    exists: true,
    updated_at: statSync(path).mtime.toISOString(),
  };
}

export function writeCapturePolicy(markdown: string): CapturePolicy {
  const path = cachePath(CAPTURE_POLICY_FILE);
  mkdirSync(dirname(path), { recursive: true });
  atomicWrite(path, markdown.endsWith('\n') ? markdown : `${markdown}\n`);
  return readCapturePolicy();
}

export function getDiscardedCandidates(
  limit = 50,
): PendingKnowledgeCandidate[] {
  return readCache()
    .pending.filter((candidate) => candidate.status === 'discarded')
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
    .slice(0, limit);
}

export function writePending(pending: PendingKnowledgeCandidate[]): void {
  writeJsonlFile('pending.jsonl', pending);
}

export function writeSessions(sessions: ProcessedSession[]): void {
  const unique = new Map<string, ProcessedSession>();
  for (const session of sessions) {
    unique.set(`${session.source}:${session.session_id}`, session);
  }
  writeJsonFile('sessions.json', [...unique.values()]);
}

export function addKnowledgeCandidates(
  source: SessionSource,
  sessionId: string,
  candidates: Array<
    KnowledgeCandidateInput & { similar_memos?: SimilarMemo[] }
  >,
  sourceSessionUpdatedAt?: string,
): {
  added: PendingKnowledgeCandidate[];
  duplicates: Array<{
    title: string;
    reason: string;
    similar_memos: SimilarMemo[];
  }>;
} {
  const cache = readCache();
  const pendingFingerprints = new Set(
    cache.pending
      .filter((candidate) => candidate.status !== 'discarded')
      .map((candidate) => candidate.fingerprint),
  );
  const added: PendingKnowledgeCandidate[] = [];
  const duplicates: Array<{
    title: string;
    reason: string;
    similar_memos: SimilarMemo[];
  }> = [];

  for (const candidate of candidates) {
    const fingerprint = createFingerprint(candidate.title, candidate.body);
    const similarMemos = candidate.similar_memos || [];

    if (pendingFingerprints.has(fingerprint)) {
      duplicates.push({
        title: candidate.title,
        reason: 'Exact match with a pending candidate',
        similar_memos: similarMemos,
      });
      continue;
    }

    const now = new Date().toISOString();
    const pendingCandidate: PendingKnowledgeCandidate = {
      id: randomUUID(),
      session_id: sessionId,
      source,
      source_session_updated_at: sourceSessionUpdatedAt,
      title: candidate.title,
      body: candidate.body,
      categories: candidate.categories || [],
      projects: candidate.projects || [],
      confidence: candidate.confidence,
      is_public: candidate.is_public ?? false,
      status: 'pending',
      fingerprint,
      similar_memos: similarMemos,
      created_at: now,
      updated_at: now,
    };

    added.push(pendingCandidate);
    pendingFingerprints.add(fingerprint);
  }

  writePending([...cache.pending, ...added]);
  markSessionProcessed(source, sessionId, '');

  return { added, duplicates };
}

export function markSessionProcessed(
  source: SessionSource,
  sessionId: string,
  path: string,
): void {
  const cache = readCache();
  const sessions = cache.sessions.filter(
    (session) =>
      !(session.source === source && session.session_id === sessionId),
  );
  sessions.push({
    session_id: sessionId,
    source,
    path,
    processed_at: new Date().toISOString(),
  });
  writeSessions(sessions);
}

export function updatePendingCandidate(
  candidateId: string,
  updater: (candidate: PendingKnowledgeCandidate) => PendingKnowledgeCandidate,
): PendingKnowledgeCandidate | undefined {
  const cache = readCache();
  let updated: PendingKnowledgeCandidate | undefined;
  const pending = cache.pending.map((candidate) => {
    if (candidate.id !== candidateId) return candidate;
    updated = updater(candidate);
    return updated;
  });

  if (updated) {
    writePending(pending);
  }

  return updated;
}

function expandHome(path: string): string {
  if (path === '~') return homedir();
  if (path.startsWith('~/')) return join(homedir(), path.slice(2));
  return path;
}

function ensureCacheDir(): void {
  mkdirSync(getCacheDir(), { recursive: true });
}

function cachePath(fileName: string): string {
  return join(getCacheDir(), fileName);
}

function readJsonFile<T>(fileName: string, defaultValue: T): T {
  const path = cachePath(fileName);
  if (!existsSync(path)) return defaultValue;

  try {
    return JSON.parse(readFileSync(path, 'utf8')) as T;
  } catch {
    return defaultValue;
  }
}

function readJsonlFile<T>(fileName: string): T[] {
  const path = cachePath(fileName);
  if (!existsSync(path)) return [];

  return readFileSync(path, 'utf8')
    .split('\n')
    .filter(Boolean)
    .flatMap((line) => {
      try {
        return [JSON.parse(line) as T];
      } catch {
        return [];
      }
    });
}

function writeJsonFile(fileName: string, value: unknown): void {
  const path = cachePath(fileName);
  mkdirSync(dirname(path), { recursive: true });
  atomicWrite(path, `${JSON.stringify(value, null, 2)}\n`);
}

function writeJsonlFile(fileName: string, values: unknown[]): void {
  const path = cachePath(fileName);
  mkdirSync(dirname(path), { recursive: true });
  atomicWrite(
    path,
    values.map((value) => JSON.stringify(value)).join('\n') + '\n',
  );
}

function atomicWrite(path: string, content: string): void {
  const tmpPath = `${path}.tmp`;
  writeFileSync(tmpPath, content, 'utf8');
  renameSync(tmpPath, path);
}
