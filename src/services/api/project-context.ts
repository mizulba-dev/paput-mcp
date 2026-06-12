import { ApiClient } from './client.js';

export interface ProjectSummary {
  id: number;
  title: string;
}

export interface ProjectDocumentIndexItem {
  id: number;
  kind: string;
  title: string;
  summary: string;
  created_at: string;
}

export interface ProjectContextResponse {
  project: ProjectSummary;
  instructions: string | null;
  documents: ProjectDocumentIndexItem[];
  proposals: ProjectDocumentIndexItem[];
  matched_projects?: ProjectSummary[];
}

export interface ProjectDocumentDetail {
  id: number;
  skill_sheet_project_id: number;
  kind: string;
  status: string;
  title: string;
  summary: string;
  body: string;
  promoted_to: string | null;
  decided_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SimilarProjectDocumentItem {
  id: number;
  kind: string;
  title: string;
  summary: string;
  score: number;
}

export interface AddProjectDocumentParams {
  skill_sheet_project_id: number;
  kind: string;
  title: string;
  summary?: string;
  body: string;
  decided_at?: string;
}

export interface AddProjectDocumentResponse {
  document: ProjectDocumentDetail | null;
  duplicate: boolean;
  promoted_to?: string | null;
  similar_documents: SimilarProjectDocumentItem[];
  skill_proposal?: ProjectDocumentDetail | null;
}

export interface ProjectInstructionsResponse {
  skill_sheet_project_id: number;
  body: string;
  updated_at: string;
}

export async function getProjectContext(
  client: ApiClient,
  project: string,
): Promise<ProjectContextResponse> {
  const queryParams = new URLSearchParams();
  queryParams.append('project', project);

  return client.get<ProjectContextResponse>(
    `/api/v1/mcp/project-context?${queryParams.toString()}`,
  );
}

export async function getProjectDocument(
  client: ApiClient,
  id: number,
): Promise<ProjectDocumentDetail> {
  return client.get<ProjectDocumentDetail>(
    `/api/v1/mcp/project-document/${id}`,
  );
}

export async function addProjectDocument(
  client: ApiClient,
  params: AddProjectDocumentParams,
): Promise<AddProjectDocumentResponse> {
  return client.post<AddProjectDocumentResponse>(
    '/api/v1/mcp/project-document',
    params,
  );
}

export async function updateProjectInstructions(
  client: ApiClient,
  params: { skill_sheet_project_id: number; body: string },
): Promise<ProjectInstructionsResponse> {
  return client.put<ProjectInstructionsResponse>(
    '/api/v1/mcp/project-instructions',
    params,
  );
}

export async function discardProjectProposal(
  client: ApiClient,
  params: { id: number; reason: string },
): Promise<{ success: boolean }> {
  return client.put<{ success: boolean }>(
    '/api/v1/mcp/project-proposal/discard',
    params,
  );
}

export async function promoteProjectDocuments(
  client: ApiClient,
  params: { ids: number[]; promoted_to: string },
): Promise<{ success: boolean }> {
  return client.put<{ success: boolean }>(
    '/api/v1/mcp/project-documents/promote',
    params,
  );
}
