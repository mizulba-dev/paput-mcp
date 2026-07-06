import { ApiClient } from './client.js';
import {
  GetSkillSheetResponse,
  GetSkillSheetProject,
  CreateSkillSheetParams,
  CreateSkillSheetResponse,
  UpdateSkillSheetParams,
  UpdateSkillSheetResponse,
  SkillSheetSkill,
  Technology,
  SkillSheetMemo,
  UpsertSkillSheetProjectParams,
  SkillSheetProjectEpisode,
  UpdateSkillSheetProjectEpisodesResponse,
  SkillSheetFaqItemInput,
  UpdateSkillSheetFaqResponse,
} from '../../types/index.js';

export interface UpdateBasicInfoParams {
  nearest_station?: string;
  gender?: number;
  birth_date?: string;
  years_of_experience?: number;
}

export interface UpdateSelfPrParams {
  self_pr?: string;
}

export interface SkillSheetSkillsResponse {
  skills: SkillSheetSkill[];
}

export interface SkillSheetProjectsResponse {
  projects: GetSkillSheetProject[];
}

export interface SkillSheetProjectReference {
  id: number;
  title: string;
  mcp_alias?: string | null;
}

export interface AddSkillSheetProjectResponse {
  id: number;
  type: number;
  title: string;
  start_period: string;
  end_period: string | null;
  description: string;
  role: string;
  scale: string;
  technologies: Technology[];
  processes: number[];
  memos: SkillSheetMemo[];
  achievements?: string[] | null;
}

export async function getSkillSheet(
  client: ApiClient,
): Promise<GetSkillSheetResponse> {
  const data = await client.get<GetSkillSheetResponse>(
    '/api/v1/mcp/skill-sheet',
  );

  if (!data || typeof data.id !== 'number') {
    throw new Error('Invalid skill sheet response format');
  }

  return data;
}

export async function searchSkillSheetProjects(
  client: ApiClient,
  search: string,
): Promise<SkillSheetProjectReference[]> {
  const endpoint = `/api/v1/mcp/skill-sheet/projects?search=${encodeURIComponent(search)}`;
  const projects = await client.get<SkillSheetProjectReference[] | null>(
    endpoint,
  );
  return projects ?? [];
}

export async function getSkillSheetProjectByAlias(
  client: ApiClient,
  alias: string,
): Promise<SkillSheetProjectReference | undefined> {
  const endpoint = `/api/v1/mcp/skill-sheet/projects?mcp_alias=${encodeURIComponent(alias)}`;
  // API は該当なしを JSON null で返すことがある。
  const projects = await client.get<SkillSheetProjectReference[] | null>(
    endpoint,
  );
  return projects?.[0];
}

export async function createSkillSheet(
  client: ApiClient,
  params: CreateSkillSheetParams,
): Promise<CreateSkillSheetResponse> {
  try {
    const data = await client.post<CreateSkillSheetResponse>(
      '/api/v1/mcp/skill-sheet',
      {
        nearest_station: params.nearest_station,
        gender: params.gender,
        birth_date: params.birth_date,
        years_of_experience: params.years_of_experience,
        self_pr: params.self_pr,
        skills: params.skills,
        projects: params.projects,
      },
    );

    return {
      success: true,
      id: data.id,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function updateSkillSheet(
  client: ApiClient,
  params: UpdateSkillSheetParams,
): Promise<UpdateSkillSheetResponse> {
  try {
    await client.put('/api/v1/mcp/skill-sheet', {
      nearest_station: params.nearest_station,
      gender: params.gender,
      birth_date: params.birth_date,
      years_of_experience: params.years_of_experience,
      self_pr: params.self_pr,
      skills: params.skills,
      projects: params.projects,
    });

    return {
      success: true,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function updateSkillSheetBasicInfo(
  client: ApiClient,
  params: UpdateBasicInfoParams,
): Promise<void> {
  await client.put('/api/v1/mcp/skill-sheet/basic-info', params);
}

export async function updateSkillSheetSelfPr(
  client: ApiClient,
  params: UpdateSelfPrParams,
): Promise<void> {
  await client.put('/api/v1/mcp/skill-sheet/self-pr', params);
}

export async function getSkillSheetSkills(
  client: ApiClient,
): Promise<SkillSheetSkillsResponse> {
  return client.get('/api/v1/mcp/skill-sheet/skills');
}

export async function updateSkillSheetSkills(
  client: ApiClient,
  params: { skills: SkillSheetSkill[] },
): Promise<void> {
  await client.put('/api/v1/mcp/skill-sheet/skills', params);
}

export async function addSkillSheetSkill(
  client: ApiClient,
  skill: SkillSheetSkill,
): Promise<void> {
  await client.post('/api/v1/mcp/skill-sheet/skill', skill);
}

export async function updateSkillSheetSkill(
  client: ApiClient,
  id: number,
  skill: SkillSheetSkill,
): Promise<void> {
  await client.put('/api/v1/mcp/skill-sheet/skill', { ...skill, id });
}

export async function deleteSkillSheetSkill(
  client: ApiClient,
  skillId: number,
): Promise<void> {
  await client.delete(`/api/v1/mcp/skill-sheet/skill/${skillId}`);
}

export async function getSkillSheetProjects(
  client: ApiClient,
  search?: string,
): Promise<SkillSheetProjectsResponse> {
  const queryParams = search ? `?search=${encodeURIComponent(search)}` : '';
  return client.get(`/api/v1/mcp/skill-sheet/projects${queryParams}`);
}

export async function addSkillSheetProject(
  client: ApiClient,
  project: UpsertSkillSheetProjectParams,
): Promise<AddSkillSheetProjectResponse> {
  return client.post('/api/v1/mcp/skill-sheet/project', project);
}

export async function updateSkillSheetProject(
  client: ApiClient,
  project: UpsertSkillSheetProjectParams & { id: number },
): Promise<void> {
  await client.put('/api/v1/mcp/skill-sheet/project', project);
}

export async function deleteSkillSheetProject(
  client: ApiClient,
  projectId: number,
): Promise<void> {
  await client.delete(`/api/v1/mcp/skill-sheet/project/${projectId}`);
}

export async function updateSkillSheetProjectEpisodes(
  client: ApiClient,
  projectId: number,
  episodes: SkillSheetProjectEpisode[],
): Promise<UpdateSkillSheetProjectEpisodesResponse> {
  return client.put(`/api/v1/mcp/skill-sheet/projects/${projectId}/episodes`, {
    episodes,
  });
}

export async function updateSkillSheetFaq(
  client: ApiClient,
  faq: SkillSheetFaqItemInput[],
): Promise<UpdateSkillSheetFaqResponse> {
  return client.put('/api/v1/mcp/skill-sheet/faq', { faq });
}
