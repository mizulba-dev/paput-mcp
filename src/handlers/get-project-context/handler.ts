import { ApiClient } from '../../services/api/client.js';
import {
  getProjectContext,
  ProjectContextResponse,
} from '../../services/api/project-context.js';
import type { ToolContext } from '../../types/index.js';

export async function handleGetProjectContext(
  args: Record<string, unknown> | undefined,
  apiClient: ApiClient,
  context?: ToolContext,
) {
  const project = getProjectMatch(args, context);
  if (!project) {
    return {
      content: [
        {
          type: 'text',
          text: 'project is required when PAPUT_PROJECT_MATCH is not configured.',
        },
      ],
      isError: true,
    };
  }

  try {
    const result = await getProjectContext(apiClient, project);

    return {
      structuredContent: result as unknown as Record<string, unknown>,
      content: [
        {
          type: 'text',
          text: buildContextText(result),
        },
      ],
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';

    return {
      content: [
        {
          type: 'text',
          text: `Failed to get project context: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
}

function getProjectMatch(
  args: Record<string, unknown> | undefined,
  context?: ToolContext,
): string | undefined {
  const explicit =
    args && typeof args.project === 'string' ? args.project.trim() : '';
  if (explicit) return explicit;

  if (context?.projectMatch) return context.projectMatch;

  const envProjectMatch = process.env.PAPUT_PROJECT_MATCH?.trim();
  return envProjectMatch || undefined;
}

function buildContextText(result: ProjectContextResponse): string {
  const lines: string[] = [];

  lines.push(`Project: ${result.project.title} (ID: ${result.project.id})`);

  if (result.matched_projects && result.matched_projects.length > 1) {
    const candidates = result.matched_projects
      .map((p) => `${p.title} (ID: ${p.id})`)
      .join(', ');
    lines.push(
      `Note: multiple projects matched, the first one was selected. Candidates: ${candidates}`,
    );
  }

  lines.push('');
  if (result.instructions) {
    lines.push('## Instructions (always apply)');
    lines.push(result.instructions);
  } else {
    lines.push('## Instructions');
    lines.push('(not set — use paput_update_project_instructions to set them)');
  }

  lines.push('');
  lines.push('## Document index');
  if (result.documents.length === 0) {
    lines.push('(no documents yet)');
  } else {
    for (const doc of result.documents) {
      const summary = doc.summary ? ` — ${doc.summary}` : '';
      lines.push(`- [${doc.id}] (${doc.kind}) ${doc.title}${summary}`);
    }
    lines.push('');
    lines.push(
      'Fetch a document body on demand with paput_get_project_document.',
    );
  }

  if (result.proposals.length > 0) {
    lines.push('');
    lines.push('## Pending skill proposals');
    for (const proposal of result.proposals) {
      const summary = proposal.summary ? ` — ${proposal.summary}` : '';
      lines.push(`- [${proposal.id}] ${proposal.title}${summary}`);
    }
    lines.push('');
    lines.push(
      'Ask the user whether to turn these into skills. On approval, create the skill and call paput_promote_project_documents; on rejection, call paput_discard_project_proposal with the reason.',
    );
  }

  return lines.join('\n');
}
