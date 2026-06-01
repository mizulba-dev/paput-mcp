import { ApiClient } from '../../services/api/client.js';
import { addKnowledgeCandidates } from '../../services/local-cache/index.js';
import { resolveProjectsForCwd } from '../../services/project-match/index.js';
import { scanSessions } from '../../services/session/index.js';
import {
  KnowledgeCandidateInput,
  SessionSource,
} from '../../types/knowledge.js';

export async function handleAddKnowledgeCandidates(
  args: Record<string, unknown> | undefined,
  apiClient: ApiClient,
) {
  if (!args || typeof args.session_id !== 'string') {
    return {
      content: [{ type: 'text', text: 'session_id is required' }],
      isError: true,
    };
  }

  if (args.source !== 'claude' && args.source !== 'codex') {
    return {
      content: [
        {
          type: 'text',
          text: 'source must be claude or codex',
        },
      ],
      isError: true,
    };
  }

  if (!Array.isArray(args.candidates)) {
    return {
      content: [{ type: 'text', text: 'candidates must be an array' }],
      isError: true,
    };
  }

  const candidates = args.candidates.flatMap(
    (candidate): KnowledgeCandidateInput[] => {
      if (
        typeof candidate !== 'object' ||
        candidate === null ||
        !('title' in candidate) ||
        !('body' in candidate) ||
        typeof candidate.title !== 'string' ||
        typeof candidate.body !== 'string'
      ) {
        return [];
      }

      const rawCandidate = candidate as Record<string, unknown>;
      const categories = Array.isArray(rawCandidate.categories)
        ? rawCandidate.categories.filter(
            (category): category is string => typeof category === 'string',
          )
        : [];

      return [
        {
          title: candidate.title,
          body: candidate.body,
          categories,
          confidence:
            typeof rawCandidate.confidence === 'number'
              ? rawCandidate.confidence
              : undefined,
          is_public:
            typeof rawCandidate.is_public === 'boolean'
              ? rawCandidate.is_public
              : false,
        },
      ];
    },
  );

  const source = args.source as SessionSource;
  const sourceSession = scanSessions([source], true).find(
    (session) => session.session_id === args.session_id,
  );
  const sourceSessionUpdatedAt = sourceSession?.updated_at;
  const projects = await resolveProjects(apiClient, sourceSession?.cwd);

  const result = addKnowledgeCandidates(
    source,
    args.session_id,
    candidates.map((candidate) => ({
      ...candidate,
      projects,
    })),
    sourceSessionUpdatedAt,
  );

  const response = {
    added: result.added.length,
    duplicates: result.duplicates.length,
    candidates: result.added,
    duplicate_details: result.duplicates,
  };

  return {
    structuredContent: response,
    content: [
      {
        type: 'text',
        text: JSON.stringify(response, null, 2),
      },
    ],
  };
}

async function resolveProjects(
  apiClient: ApiClient,
  cwd: string | undefined,
): Promise<Array<{ id: number; title?: string }>> {
  try {
    return await resolveProjectsForCwd(apiClient, cwd);
  } catch (error) {
    console.error('Failed to resolve projects for pending candidate:', error);
    return [];
  }
}
