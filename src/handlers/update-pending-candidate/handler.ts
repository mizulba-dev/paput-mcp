import { ApiClient } from '../../services/api/client.js';
import {
  createFingerprint,
  readCache,
  updatePendingCandidate,
} from '../../services/local-cache/index.js';
import { PendingKnowledgeCandidate } from '../../types/knowledge.js';

export async function handleUpdatePendingCandidate(
  args: Record<string, unknown> | undefined,
  _apiClient: ApiClient,
) {
  if (!args || typeof args.candidate_id !== 'string') {
    return {
      content: [{ type: 'text', text: 'candidate_id is required' }],
      isError: true,
    };
  }

  const candidate = readCache().pending.find(
    (item) => item.id === args.candidate_id,
  );
  if (!candidate) {
    return {
      content: [
        { type: 'text', text: 'Pending candidate to update was not found' },
      ],
      isError: true,
    };
  }

  if (candidate.status !== 'pending') {
    return {
      content: [
        {
          type: 'text',
          text: `Only pending candidates can be updated (current status: ${candidate.status})`,
        },
      ],
      isError: true,
    };
  }

  const patch = buildPatch(args);
  if ('error' in patch) {
    return {
      content: [{ type: 'text', text: patch.error }],
      isError: true,
    };
  }

  if (Object.keys(patch.fields).length === 0) {
    return {
      content: [
        {
          type: 'text',
          text: 'No updatable fields were provided. Provide at least one of title, body, categories, memo_type_keys, confidence, is_public, or projects.',
        },
      ],
      isError: true,
    };
  }

  const changedFields = Object.keys(patch.fields);
  const updated = updatePendingCandidate(candidate.id, (item) => {
    const next: PendingKnowledgeCandidate = {
      ...item,
      ...patch.fields,
      updated_at: new Date().toISOString(),
    };
    next.fingerprint = createFingerprint(next.title, next.body);
    return next;
  });

  const result = {
    updated: true,
    candidate_id: updated?.id,
    title: updated?.title,
    changed_fields: changedFields,
    candidate: updated,
  };

  return {
    structuredContent: result,
    content: [
      {
        type: 'text',
        text: JSON.stringify(result, null, 2),
      },
    ],
  };
}

type Patch = { fields: Partial<PendingKnowledgeCandidate> } | { error: string };

function buildPatch(args: Record<string, unknown>): Patch {
  const fields: Partial<PendingKnowledgeCandidate> = {};

  if ('title' in args) {
    if (typeof args.title !== 'string' || args.title.trim() === '') {
      return { error: 'title must be a non-empty string' };
    }
    fields.title = args.title;
  }

  if ('body' in args) {
    if (typeof args.body !== 'string' || args.body.trim() === '') {
      return { error: 'body must be a non-empty string' };
    }
    fields.body = args.body;
  }

  if ('categories' in args) {
    if (!Array.isArray(args.categories)) {
      return { error: 'categories must be an array of strings' };
    }
    fields.categories = args.categories.filter(
      (category): category is string => typeof category === 'string',
    );
  }

  if ('memo_type_keys' in args) {
    if (!Array.isArray(args.memo_type_keys)) {
      return { error: 'memo_type_keys must be an array of strings' };
    }
    fields.memo_type_keys = args.memo_type_keys.filter(
      (key): key is string => typeof key === 'string',
    );
  }

  if ('projects' in args) {
    if (!Array.isArray(args.projects)) {
      return { error: 'projects must be an array of project references' };
    }
    fields.projects = args.projects.filter(
      (project): project is { id: number; title?: string } =>
        typeof project === 'object' &&
        project !== null &&
        'id' in project &&
        typeof (project as { id: unknown }).id === 'number',
    );
  }

  if ('confidence' in args) {
    if (typeof args.confidence !== 'number') {
      return { error: 'confidence must be a number' };
    }
    fields.confidence = args.confidence;
  }

  if ('is_public' in args) {
    if (typeof args.is_public !== 'boolean') {
      return { error: 'is_public must be a boolean' };
    }
    fields.is_public = args.is_public;
  }

  return { fields };
}
