import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { basename, join } from 'node:path';
import { readCache } from '../local-cache/index.js';
import { SessionSource, SessionSummary } from '../../types/knowledge.js';

interface SessionMessage {
  role: 'user' | 'assistant';
  text: string;
}

type JsonObject = Record<string, unknown>;

export function scanSessions(
  sources: SessionSource[] = ['claude', 'codex'],
  includeProcessed = false,
): SessionSummary[] {
  const processed = new Set(
    readCache().sessions.map(
      (session) => `${session.source}:${session.session_id}`,
    ),
  );
  const sessions = sources.flatMap((source) => {
    const paths =
      source === 'claude' ? findClaudeSessionFiles() : findCodexSessionFiles();
    return paths.map((path) => {
      const sessionId = basename(path, '.jsonl');
      return {
        session_id: sessionId,
        source,
        path,
        cwd: readSessionCwd(source, path),
        updated_at: statSync(path).mtime.toISOString(),
        message_count: readSessionMessages(source, path).length,
        processed: processed.has(`${source}:${sessionId}`),
      };
    });
  });

  return sessions
    .filter((session) => includeProcessed || !session.processed)
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at));
}

function readSessionCwd(
  source: SessionSource,
  path: string,
): string | undefined {
  const lines = readFileSync(path, 'utf8').split('\n').filter(Boolean);
  for (const line of lines) {
    try {
      const item = parseJsonObject(line);
      if (!item) continue;
      const cwd =
        source === 'codex'
          ? getPath(item, ['payload', 'cwd'])
          : getPath(item, ['cwd']) ||
            getPath(item, ['message', 'cwd']) ||
            getPath(item, ['payload', 'cwd']);
      if (typeof cwd === 'string' && cwd) return cwd;
    } catch {
      continue;
    }
  }

  return undefined;
}

export function getSessionTranscript(
  source: SessionSource,
  sessionId: string,
  maxChars = 20000,
): string | undefined {
  const session = scanSessions([source], true).find(
    (item) => item.session_id === sessionId,
  );
  if (!session) return undefined;

  const messages = readSessionMessages(source, session.path);
  const transcript = messages
    .map(
      (message) =>
        `${message.role === 'user' ? 'User' : 'Assistant'}:\n${message.text}`,
    )
    .join('\n\n---\n\n');

  if (transcript.length <= maxChars) return transcript;
  return transcript.slice(Math.max(0, transcript.length - maxChars));
}

function findClaudeSessionFiles(): string[] {
  return findJsonlFiles(join(homedir(), '.claude', 'projects'));
}

function findCodexSessionFiles(): string[] {
  return findJsonlFiles(join(homedir(), '.codex', 'sessions'));
}

function findJsonlFiles(root: string): string[] {
  if (!existsSync(root)) return [];

  const results: string[] = [];
  const visit = (path: string) => {
    const stat = statSync(path);
    if (stat.isDirectory()) {
      for (const entry of readdirSync(path)) {
        visit(join(path, entry));
      }
      return;
    }

    if (path.endsWith('.jsonl')) {
      results.push(path);
    }
  };

  visit(root);
  return results;
}

export function readSessionMessages(
  source: SessionSource,
  path: string,
): SessionMessage[] {
  const lines = readFileSync(path, 'utf8').split('\n').filter(Boolean);
  return lines.flatMap((line) => {
    try {
      const item = parseJsonObject(line);
      if (!item) return [];
      return source === 'claude'
        ? parseClaudeMessage(item)
        : parseCodexMessage(item);
    } catch {
      return [];
    }
  });
}

function parseClaudeMessage(item: JsonObject): SessionMessage[] {
  if (item.type !== 'user' && item.type !== 'assistant') return [];
  const role = getPath(item, ['message', 'role']);
  if (role !== 'user' && role !== 'assistant') return [];

  const text = extractContentText(getPath(item, ['message', 'content']), role);
  if (!text) return [];

  return [{ role, text }];
}

function parseCodexMessage(item: JsonObject): SessionMessage[] {
  if (item.type !== 'response_item') return [];
  if (getPath(item, ['payload', 'type']) !== 'message') return [];
  const role = getPath(item, ['payload', 'role']);
  if (role !== 'user' && role !== 'assistant') return [];

  const text = extractContentText(getPath(item, ['payload', 'content']), role);
  if (!text) return [];

  return [{ role, text }];
}

function extractContentText(
  content: unknown,
  role: 'user' | 'assistant',
): string {
  if (typeof content === 'string') return content.trim();
  if (!Array.isArray(content)) return '';

  return content
    .flatMap((item) => {
      if (typeof item === 'string') return [item];
      if (!item || typeof item !== 'object') return [];
      const object = item as JsonObject;
      if (object.type === 'text' && typeof object.text === 'string')
        return [object.text];
      if (object.type === 'input_text' && typeof object.text === 'string')
        return [object.text];
      if (object.type === 'output_text' && typeof object.text === 'string')
        return [object.text];
      if (role === 'assistant' && typeof object.summary === 'string')
        return [object.summary];
      return [];
    })
    .join('\n')
    .trim();
}

function parseJsonObject(line: string): JsonObject | undefined {
  const value = JSON.parse(line);
  return isJsonObject(value) ? value : undefined;
}

function getPath(object: JsonObject, path: string[]): unknown {
  let current: unknown = object;
  for (const key of path) {
    if (!isJsonObject(current)) return undefined;
    current = current[key];
  }
  return current;
}

function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
