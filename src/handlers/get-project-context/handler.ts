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
  try {
    const project = await getProjectSelector(args, context);
    if (!project) {
      return {
        content: [
          {
            type: 'text',
            text: 'project is required when no MCP project_alias is configured.',
          },
        ],
        isError: true,
      };
    }

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

async function getProjectSelector(
  args: Record<string, unknown> | undefined,
  context?: ToolContext,
): Promise<string | { project_id: number } | undefined> {
  if (context?.projectId) {
    return { project_id: context.projectId };
  }

  if (context?.resolveProject) {
    const resolved = await context.resolveProject();
    if (!resolved) {
      throw new Error(
        `project_alias "${context.projectAlias ?? ''}" was not found. Check the alias in the MCP URL or set it on the skill sheet project.`,
      );
    }
    return { project_id: resolved.projectId };
  }

  const explicit =
    args && typeof args.project === 'string' ? args.project.trim() : '';
  return explicit || undefined;
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
  lines.push('## Project documents');
  const counts = result.document_counts;
  if (counts) {
    lines.push(
      `Active documents: ${counts.design_doc} design decisions, ${counts.procedure} procedures, ${counts.skill_candidate} skill candidates.`,
    );
  }
  lines.push(
    'Search past design decisions and rejected alternatives with paput_search_project_documents before drafting a new one.',
  );

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
