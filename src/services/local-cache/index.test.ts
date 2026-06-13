import { appendFileSync, mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  addKnowledgeCandidates,
  createFingerprint,
  getCacheDir,
  normalizeText,
  readCache,
  readCapturePolicy,
  updatePendingCandidate,
  writeCapturePolicy,
} from './index.js';

describe('local cache', () => {
  const originalCacheDir = process.env.PAPUT_CACHE_DIR;
  let cacheDir: string;

  beforeEach(() => {
    cacheDir = mkdtempSync(join(tmpdir(), 'paput-cache-test-'));
    process.env.PAPUT_CACHE_DIR = cacheDir;
  });

  afterEach(() => {
    if (originalCacheDir === undefined) {
      delete process.env.PAPUT_CACHE_DIR;
    } else {
      process.env.PAPUT_CACHE_DIR = originalCacheDir;
    }
    rmSync(cacheDir, { force: true, recursive: true });
  });

  describe('normalizeText', () => {
    it('lowercases, strips punctuation, and collapses whitespace', () => {
      expect(normalizeText('  **Go の Context！**  \n キャンセル伝搬。 ')).toBe(
        'go の context キャンセル伝搬',
      );
    });

    it('keeps plain words unchanged', () => {
      expect(normalizeText('atomic write pattern')).toBe(
        'atomic write pattern',
      );
    });
  });

  describe('createFingerprint', () => {
    it('matches when texts only differ in formatting', () => {
      expect(createFingerprint('Goのcontext', 'Body text.')).toBe(
        createFingerprint('# goのcontext!', '  body   text  '),
      );
    });

    it('differs when the body differs', () => {
      expect(createFingerprint('Title', 'Body A')).not.toBe(
        createFingerprint('Title', 'Body B'),
      );
    });
  });

  describe('addKnowledgeCandidates', () => {
    it('adds candidates, persists them, and marks the session processed', () => {
      const result = addKnowledgeCandidates('claude', 'session-1', [
        { title: 'Title A', body: 'Body A' },
        { title: 'Title B', body: 'Body B', categories: ['Go'] },
      ]);

      expect(result.added).toHaveLength(2);
      expect(result.duplicates).toHaveLength(0);
      expect(result.added[0]).toMatchObject({
        title: 'Title A',
        body: 'Body A',
        status: 'pending',
        source: 'claude',
        session_id: 'session-1',
        is_public: false,
        categories: [],
        projects: [],
      });

      const cache = readCache();
      expect(cache.pending).toHaveLength(2);
      expect(cache.sessions).toEqual([
        expect.objectContaining({ session_id: 'session-1', source: 'claude' }),
      ]);
    });

    it('detects duplicates against existing pending candidates', () => {
      addKnowledgeCandidates('claude', 'session-1', [
        { title: 'Title', body: 'Body' },
      ]);

      const result = addKnowledgeCandidates('claude', 'session-2', [
        { title: '# title!', body: ' body ' },
      ]);

      expect(result.added).toHaveLength(0);
      expect(result.duplicates).toEqual([
        expect.objectContaining({
          title: '# title!',
          reason: 'Exact match with a pending candidate',
        }),
      ]);
      expect(readCache().pending).toHaveLength(1);
    });

    it('detects duplicates within a single batch', () => {
      const result = addKnowledgeCandidates('claude', 'session-1', [
        { title: 'Title', body: 'Body' },
        { title: 'Title', body: 'Body' },
      ]);

      expect(result.added).toHaveLength(1);
      expect(result.duplicates).toHaveLength(1);
    });

    it('allows re-adding a candidate that was discarded', () => {
      const first = addKnowledgeCandidates('claude', 'session-1', [
        { title: 'Title', body: 'Body' },
      ]);
      updatePendingCandidate(first.added[0].id, (candidate) => ({
        ...candidate,
        status: 'discarded',
      }));

      const result = addKnowledgeCandidates('claude', 'session-2', [
        { title: 'Title', body: 'Body' },
      ]);

      expect(result.added).toHaveLength(1);
      expect(result.duplicates).toHaveLength(0);
    });
  });

  describe('readCache', () => {
    it('skips broken JSONL lines in pending.jsonl', () => {
      addKnowledgeCandidates('claude', 'session-1', [
        { title: 'Valid', body: 'Body' },
      ]);
      appendFileSync(join(getCacheDir(), 'pending.jsonl'), '{broken json\n');

      const cache = readCache();

      expect(cache.pending).toHaveLength(1);
      expect(cache.pending[0].title).toBe('Valid');
    });

    it('returns empty data when cache files do not exist', () => {
      expect(readCache()).toEqual({ pending: [], sessions: [] });
    });
  });

  describe('capture policy (atomic write)', () => {
    it('writes the policy with a trailing newline and leaves no tmp file', () => {
      const policy = writeCapturePolicy('# Policy');

      expect(policy.exists).toBe(true);
      expect(policy.markdown).toBe('# Policy\n');
      expect(policy.updated_at).not.toBeNull();
      expect(
        readdirSync(getCacheDir()).filter((f) => f.endsWith('.tmp')),
      ).toEqual([]);
    });

    it('does not duplicate the trailing newline', () => {
      expect(writeCapturePolicy('# Policy\n').markdown).toBe('# Policy\n');
    });

    it('reports a missing policy file', () => {
      const policy = readCapturePolicy();

      expect(policy.exists).toBe(false);
      expect(policy.markdown).toBe('');
      expect(policy.updated_at).toBeNull();
    });
  });
});
