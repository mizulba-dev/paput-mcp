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

export interface ProjectDocumentCounts {
  design_doc: number;
  procedure: number;
  skill_candidate: number;
}

export interface ProjectContextResponse {
  project: ProjectSummary;
  instructions: string | null;
  document_counts: ProjectDocumentCounts;
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

export interface ProjectDocumentSearchParams {
  query: string;
  limit?: number;
  include_archived?: boolean;
}

export interface ProjectDocumentSearchResult {
  id: number;
  kind: string;
  status: 'active' | 'archived';
  title: string;
  summary: string;
  score: number;
  created_at: string;
}

export interface ProjectDocumentSearchResponse {
  documents: ProjectDocumentSearchResult[];
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

export interface UpdateProjectDocumentParams {
  id: number;
  title: string;
  summary?: string;
  body: string;
  status?: 'active' | 'archived';
}

export interface ProjectInstructionsResponse {
  skill_sheet_project_id: number;
  body: string;
  updated_at: string;
}

export async function getProjectContext(
  client: ApiClient,
  project: string | { project_id: number },
): Promise<ProjectContextResponse> {
  const queryParams = new URLSearchParams();
  if (typeof project === 'string') {
    queryParams.append('project', project);
  } else {
    queryParams.append('project_id', String(project.project_id));
  }

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

export async function searchProjectDocuments(
  client: ApiClient,
  params: ProjectDocumentSearchParams,
): Promise<ProjectDocumentSearchResponse> {
  const queryParams = new URLSearchParams();
  queryParams.append('query', params.query);
  if (params.limit !== undefined) {
    queryParams.append('limit', String(params.limit));
  }
  if (params.include_archived !== undefined) {
    queryParams.append('include_archived', String(params.include_archived));
  }

  return client.get<ProjectDocumentSearchResponse>(
    `/api/v1/mcp/project-documents/search?${queryParams.toString()}`,
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

export async function updateProjectDocument(
  client: ApiClient,
  params: UpdateProjectDocumentParams,
): Promise<ProjectDocumentDetail> {
  return client.put<ProjectDocumentDetail>(
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
