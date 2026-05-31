import { ApiClient } from './client.js';
import {
  CreateMemoParams,
  CreateMemoResponse,
  SearchMemoParams,
  SearchMemoResponse,
  GetMemoParams,
  GetMemoResponse,
  UpdateMemoParams,
  UpdateMemoResponse,
  DeleteMemoParams,
  DeleteMemoResponse,
} from '../../types/index.js';

export async function createMemo(
  client: ApiClient,
  params: CreateMemoParams,
): Promise<CreateMemoResponse> {
  try {
    await client.post('/api/v1/mcp/memo', {
      title: params.title,
      body: params.body,
      is_public: params.is_public || false,
      created_at: params.created_at,
      categories: params.categories || [],
      projects: params.projects || [],
    });

    return {
      success: true,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '不明なエラー',
    };
  }
}

export async function searchMemos(
  client: ApiClient,
  params: SearchMemoParams,
): Promise<SearchMemoResponse> {
  try {
    const queryParams = new URLSearchParams();

    if (params.word) queryParams.append('word', params.word);
    if (params.category_id !== undefined)
      queryParams.append('category_id', params.category_id.toString());
    if (params.ids && params.ids.length > 0) {
      params.ids.forEach((id) => queryParams.append('ids[]', id.toString()));
    }
    if (params.is_public !== undefined)
      queryParams.append('is_public', params.is_public.toString());
    if (params.page !== undefined)
      queryParams.append('page', params.page.toString());
    if (params.limit !== undefined)
      queryParams.append('limit', params.limit.toString());

    const endpoint = `/api/v1/mcp/memos${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    const data = await client.get<any>(endpoint);

    return {
      success: true,
      memos: data.memos,
      total: data.total,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '不明なエラー',
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
      projects: params.projects,
    });

    return {
      success: true,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '不明なエラー',
    };
  }
}

export async function deleteMemo(
  client: ApiClient,
  params: DeleteMemoParams,
): Promise<DeleteMemoResponse> {
  try {
    await client.delete(`/api/v1/mcp/memo/${params.id}`);

    return {
      success: true,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '不明なエラー',
    };
  }
}
