import { createHash, randomUUID } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import {
  CachedMemo,
  KnowledgeCandidateInput,
  PendingKnowledgeCandidate,
  ProcessedSession,
  SessionSource,
  SimilarMemo,
} from '../../types/knowledge.js';

interface CacheConfig {
  last_remote_sync_at?: string;
}

interface CacheData {
  memos: CachedMemo[];
  pending: PendingKnowledgeCandidate[];
  sessions: ProcessedSession[];
  config: CacheConfig;
}

const SIMILARITY_THRESHOLD = 0.78;

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

export function toCachedMemo(memo: {
  id: number;
  title: string;
  body: string;
  categories?: Array<{ name: string }>;
  is_public?: boolean;
  created_at?: string;
  updated_at?: string;
}): CachedMemo {
  return {
    id: memo.id,
    title: memo.title,
    body: memo.body,
    categories: memo.categories?.map((category) => category.name) || [],
    is_public: memo.is_public ?? false,
    created_at: memo.created_at,
    updated_at: memo.updated_at,
    fingerprint: createFingerprint(memo.title, memo.body),
  };
}

export function readCache(): CacheData {
  ensureCacheDir();

  return {
    memos: readJsonFile<CachedMemo[]>('memos.json', []),
    pending: readJsonlFile<PendingKnowledgeCandidate>('pending.jsonl'),
    sessions: readJsonFile<ProcessedSession[]>('sessions.json', []),
    config: readJsonFile<CacheConfig>('config.json', {}),
  };
}

export function writeMemos(memos: CachedMemo[]): void {
  writeJsonFile('memos.json', dedupeMemos(memos));
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

export function writeConfig(config: CacheConfig): void {
  writeJsonFile('config.json', config);
}

export function upsertCachedMemos(newMemos: CachedMemo[]): CachedMemo[] {
  const cache = readCache();
  const byId = new Map(cache.memos.map((memo) => [memo.id, memo]));
  for (const memo of newMemos) {
    byId.set(memo.id, memo);
  }
  const memos = [...byId.values()].sort((a, b) => b.id - a.id);
  writeMemos(memos);
  return memos;
}

export function addKnowledgeCandidates(
  source: SessionSource,
  sessionId: string,
  candidates: KnowledgeCandidateInput[],
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
  const memoFingerprints = new Set(cache.memos.map((memo) => memo.fingerprint));
  const added: PendingKnowledgeCandidate[] = [];
  const duplicates: Array<{
    title: string;
    reason: string;
    similar_memos: SimilarMemo[];
  }> = [];

  for (const candidate of candidates) {
    const fingerprint = createFingerprint(candidate.title, candidate.body);
    const similarMemos = findSimilarMemos(
      candidate.title,
      candidate.body,
      cache.memos,
    );

    if (memoFingerprints.has(fingerprint)) {
      duplicates.push({
        title: candidate.title,
        reason: '既存メモと完全一致しました',
        similar_memos: similarMemos,
      });
      continue;
    }

    if (pendingFingerprints.has(fingerprint)) {
      duplicates.push({
        title: candidate.title,
        reason: 'pending 候補と完全一致しました',
        similar_memos: similarMemos,
      });
      continue;
    }

    const now = new Date().toISOString();
    const pendingCandidate: PendingKnowledgeCandidate = {
      id: randomUUID(),
      session_id: sessionId,
      source,
      title: candidate.title,
      body: candidate.body,
      categories: candidate.categories || [],
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

export function findSimilarMemos(
  title: string,
  body: string,
  memos: CachedMemo[],
): SimilarMemo[] {
  const target = `${title} ${body}`;
  return memos
    .map((memo) => ({
      id: memo.id,
      title: memo.title,
      score: jaccardSimilarity(target, `${memo.title} ${memo.body}`),
    }))
    .filter((memo) => memo.score >= SIMILARITY_THRESHOLD)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
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

function dedupeMemos(memos: CachedMemo[]): CachedMemo[] {
  const byId = new Map<number, CachedMemo>();
  for (const memo of memos) {
    byId.set(memo.id, memo);
  }
  return [...byId.values()];
}

function jaccardSimilarity(left: string, right: string): number {
  const leftTokens = new Set(tokenize(left));
  const rightTokens = new Set(tokenize(right));
  if (leftTokens.size === 0 || rightTokens.size === 0) return 0;

  let intersection = 0;
  for (const token of leftTokens) {
    if (rightTokens.has(token)) intersection++;
  }

  const union = new Set([...leftTokens, ...rightTokens]).size;
  return intersection / union;
}

function tokenize(text: string): string[] {
  return normalizeText(text)
    .split(' ')
    .filter((token) => token.length >= 2);
}
