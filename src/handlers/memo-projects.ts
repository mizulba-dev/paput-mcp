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

  const projectMatch = getProjectMatch(args, context);
  if (!projectMatch) return undefined;

  try {
    const projects = await searchSkillSheetProjects(apiClient, projectMatch);
    return projects.length > 0 ? [projects[0]] : undefined;
  } catch (error) {
    console.error('Failed to search projects:', error);
    return undefined;
  }
}

function getProjectMatch(
  args: Record<string, unknown>,
  context?: ToolContext,
): string | undefined {
  const explicit =
    typeof args.project_match === 'string' ? args.project_match.trim() : '';
  if (explicit) return explicit;

  if (context?.projectMatch) return context.projectMatch;
  return process.env.PAPUT_PROJECT_MATCH;
}
