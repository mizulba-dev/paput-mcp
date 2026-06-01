import { ApiClient } from './client.js';
import {
  CreateNoteParams,
  CreateNoteResponse,
  SearchNotesParams,
  SearchNotesResponse,
  GetNoteParams,
  GetNoteResponse,
  UpdateNoteParams,
  UpdateNoteResponse,
} from '../../types/index.js';

interface CreateNoteApiResponse {
  id: number;
}

interface SearchNotesApiResponse {
  notes: NonNullable<SearchNotesResponse['notes']>;
  total: number;
}

export async function createNote(
  client: ApiClient,
  params: CreateNoteParams,
): Promise<CreateNoteResponse> {
  try {
    const data = await client.post<CreateNoteApiResponse>('/api/v1/mcp/note', {
      title: params.title,
      is_public: params.is_public || false,
      memos: params.memos || [],
    });

    return {
      success: true,
      id: data.id,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '不明なエラー',
    };
  }
}

export async function searchNotes(
  client: ApiClient,
  params: SearchNotesParams,
): Promise<SearchNotesResponse> {
  try {
    const queryParams = new URLSearchParams();

    if (params.word) queryParams.append('word', params.word);
    if (params.is_public !== undefined)
      queryParams.append('is_public', params.is_public.toString());
    if (params.page !== undefined)
      queryParams.append('page', params.page.toString());
    if (params.limit !== undefined)
      queryParams.append('limit', params.limit.toString());

    const endpoint = `/api/v1/mcp/notes${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    const data = await client.get<SearchNotesApiResponse>(endpoint);

    return {
      success: true,
      notes: data.notes,
      total: data.total,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '不明なエラー',
    };
  }
}

export async function getNote(
  client: ApiClient,
  params: GetNoteParams,
): Promise<GetNoteResponse> {
  return client.get<GetNoteResponse>(`/api/v1/mcp/note/${params.id}`);
}

export async function updateNote(
  client: ApiClient,
  params: UpdateNoteParams,
): Promise<UpdateNoteResponse> {
  try {
    await client.put('/api/v1/mcp/note', {
      id: params.id,
      title: params.title,
      is_public: params.is_public,
      memos: params.memos,
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
