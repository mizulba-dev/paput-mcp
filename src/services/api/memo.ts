import { ApiClient } from './client.js';
import {
  CreateMemoParams,
  CreateMemoResponse,
  SearchMemoParams,
  SearchMemoResponse,
  SearchMode,
  GetMemoParams,
  GetMemoResponse,
  UpdateMemoParams,
  UpdateMemoResponse,
  Memo,
  CreateMemosParams,
  CreateMemosResponse,
} from '../../types/index.js';

interface SearchMemosApiResponse {
  memos: Memo[];
  total: number;
  search_mode: SearchMode;
}

export async function createMemo(
  client: ApiClient,
  params: CreateMemoParams,
): Promise<CreateMemoResponse> {
  const result = await createMemos(client, { memos: [params] });
  if (!result.success) {
    return {
      success: false,
      error: result.failed[0]?.error || 'Unknown error',
    };
  }

  return {
    success: true,
    id: result.created[0]?.id,
  };
}

export async function createMemos(
  client: ApiClient,
  params: CreateMemosParams,
): Promise<CreateMemosResponse> {
  try {
    return await client.post<CreateMemosResponse>('/api/v1/mcp/memos', {
      memos: params.memos.map((memo) => ({
        title: memo.title,
        body: memo.body,
        is_public: memo.is_public || false,
        created_at: memo.created_at,
        categories: memo.categories || [],
        memo_type_keys: memo.memo_type_keys || [],
        projects: memo.projects || [],
      })),
    });
  } catch (error) {
    return {
      success: false,
      created_count: 0,
      failed_count: params.memos.length,
      created: [],
      failed: params.memos.map((memo, index) => ({
        index,
        title: memo.title,
        error: error instanceof Error ? error.message : 'Unknown error',
      })),
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function searchMemos(
  client: ApiClient,
  params: SearchMemoParams,
): Promise<SearchMemoResponse> {
  try {
    const queryParams = new URLSearchParams();

    if (params.query) queryParams.append('query', params.query);
    if (params.category_id !== undefined)
      queryParams.append('category_id', params.category_id.toString());
    if (params.memo_type) queryParams.append('memo_type', params.memo_type);
    if (params.ids && params.ids.length > 0) {
      params.ids.forEach((id) => queryParams.append('ids[]', id.toString()));
    }
    if (params.is_public !== undefined)
      queryParams.append('is_public', params.is_public.toString());
    if (params.project_id !== undefined)
      queryParams.append('project_id', params.project_id.toString());
    if (params.page !== undefined)
      queryParams.append('page', params.page.toString());
    if (params.limit !== undefined)
      queryParams.append('limit', params.limit.toString());
    if (params.date) queryParams.append('date', params.date);

    const endpoint = `/api/v1/mcp/memos${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    const data = await client.get<SearchMemosApiResponse>(endpoint);

    return {
      success: true,
      memos: data.memos,
      total: data.total,
      search_mode: data.search_mode,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function getMemo(
  client: ApiClient,
  params: GetMemoParams,
): Promise<GetMemoResponse> {
  return client.get<GetMemoResponse>(`/api/v1/mcp/memo/${params.id}`);
}

export async function updateMemo(
  client: ApiClient,
  params: UpdateMemoParams,
): Promise<UpdateMemoResponse> {
  try {
    await client.put('/api/v1/mcp/memo', {
      id: params.id,
      title: params.title,
      body: params.body,
      is_public: params.is_public,
      categories: params.categories,
      memo_type_keys: params.memo_type_keys || [],
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
