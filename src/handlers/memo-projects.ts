import { ApiClient } from '../services/api/client.js';
import { searchSkillSheetProjects } from '../services/api/skill-sheet.js';
import type { ToolContext } from '../types/index.js';

type ProjectReference = { id: number; title?: string };

export async function resolveMemoProjects(
  args: Record<string, unknown>,
  apiClient: ApiClient,
  context?: ToolContext,
): Promise<ProjectReference[] | undefined> {
  if (Array.isArray(args.projects)) {
    return args.projects.filter(
      (item): item is ProjectReference =>
        typeof item === 'object' &&
        item !== null &&
        'id' in item &&
        typeof item.id === 'number',
    );
  }

  if (context?.projectId) {
    return [
      {
        id: context.projectId,
        title: context.projectTitle,
      },
    ];
  }

  const projectMatch = getProjectMatch(args, context);
  if (!projectMatch) return undefined;

  try {
    const projects = await searchSkillSheetProjects(apiClient, projectMatch);
    if (projects.length === 0) return undefined;
    if (projects.length > 1) {
      const candidates = projects
        .map((project) => `${project.title} (ID: ${project.id})`)
        .join(', ');
      throw new Error(
        `project_match matched multiple projects. Specify projects explicitly or configure MCP project_alias. Candidates: ${candidates}`,
      );
    }
    return [projects[0]];
  } catch (error) {
    console.error('Failed to search projects:', error);
    throw error;
  }
}

function getProjectMatch(
  args: Record<string, unknown>,
  context?: ToolContext,
): string | undefined {
  const explicit =
    typeof args.project_match === 'string' ? args.project_match.trim() : '';
  if (explicit) return explicit;
  return undefined;
}
