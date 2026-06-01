import { ApiClient } from '../../services/api/client.js';
import {
  addSkillSheetProject,
  searchSkillSheetProjects,
  updateSkillSheetProject,
} from '../../services/api/skill-sheet.js';
import type { UpsertSkillSheetProjectParams } from '../../types/index.js';

export async function handler(
  params: Record<string, unknown> | undefined,
  apiClient: ApiClient,
): Promise<Record<string, unknown>> {
  const project = parseProjectParams(params);
  if (!project) {
    return {
      content: [
        {
          type: 'text',
          text: 'Project information is incomplete',
        },
      ],
      isError: true,
    };
  }

  const id =
    typeof project.id === 'number'
      ? project.id
      : await findExistingProjectId(apiClient, project.title);

  if (id) {
    await updateSkillSheetProject(apiClient, { ...project, id });
    return {
      structuredContent: { success: true, action: 'updated', id, project },
      content: [
        {
          type: 'text',
          text: `Project was updated: ${id}`,
        },
      ],
    };
  }

  const response = await addSkillSheetProject(apiClient, project);

  return {
    structuredContent: { success: true, action: 'created', project: response },
    content: [
      {
        type: 'text',
        text: `Project was added: ${response.title} (ID: ${response.id})`,
      },
    ],
  };
}

async function findExistingProjectId(
  apiClient: ApiClient,
  title: unknown,
): Promise<number | undefined> {
  if (typeof title !== 'string' || title.trim().length === 0) {
    return undefined;
  }

  const projects = await searchSkillSheetProjects(apiClient, title.trim());
  const exactMatch = projects.find((project) => project.title === title.trim());

  return exactMatch?.id;
}

function parseProjectParams(
  params: Record<string, unknown> | undefined,
): UpsertSkillSheetProjectParams | undefined {
  if (!params) return undefined;
  if (
    typeof params.type !== 'number' ||
    typeof params.title !== 'string' ||
    typeof params.start_period !== 'string' ||
    typeof params.description !== 'string' ||
    typeof params.role !== 'string' ||
    typeof params.scale !== 'string' ||
    !Array.isArray(params.technologies) ||
    !Array.isArray(params.processes) ||
    !Array.isArray(params.memos)
  ) {
    return undefined;
  }

  const technologies = params.technologies.filter(isTechnology);
  const processes = params.processes.filter(
    (process): process is number => typeof process === 'number',
  );
  const memos = params.memos.filter(isSkillSheetMemo);

  if (
    technologies.length !== params.technologies.length ||
    processes.length !== params.processes.length ||
    memos.length !== params.memos.length
  ) {
    return undefined;
  }

  const project: UpsertSkillSheetProjectParams = {
    type: params.type,
    title: params.title,
    start_period: params.start_period,
    description: params.description,
    role: params.role,
    scale: params.scale,
    technologies,
    processes,
    memos,
  };

  if (typeof params.id === 'number') {
    project.id = params.id;
  }
  if (typeof params.end_period === 'string' || params.end_period === null) {
    project.end_period = params.end_period;
  }

  return project;
}

function isTechnology(value: unknown): value is { id?: number; name: string } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'name' in value &&
    typeof value.name === 'string' &&
    (!('id' in value) || typeof value.id === 'number')
  );
}

function isSkillSheetMemo(
  value: unknown,
): value is { id: number; title: string } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    typeof value.id === 'number' &&
    'title' in value &&
    typeof value.title === 'string'
  );
}
