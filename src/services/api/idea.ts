import { ApiClient } from './client.js';
import {
  ListIdeasResponse,
  CreateIdeaParams,
  CreateIdeaResponse,
  DeleteIdeaParams,
  DeleteIdeaResponse,
} from '../../types/index.js';

type IdeaListApiResponse = ListIdeasResponse['ideas'];

export async function listIdeas(client: ApiClient): Promise<ListIdeasResponse> {
  try {
    const data = await client.get<IdeaListApiResponse>('/api/v1/mcp/ideas');

    return {
      success: true,
      ideas: data,
    };
  } catch (error) {
    return {
      success: false,
      ideas: [],
      error: error instanceof Error ? error.message : '不明なエラー',
    };
  }
}

export async function createIdea(
  client: ApiClient,
  params: CreateIdeaParams,
): Promise<CreateIdeaResponse> {
  try {
    await client.post('/api/v1/mcp/idea', {
      title: params.title,
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

export interface UpdateIdeaParams {
  id: number;
  title: string;
}

export interface UpdateIdeaResponse {
  success: boolean;
  error?: string;
}

export async function updateIdea(
  client: ApiClient,
  params: UpdateIdeaParams,
): Promise<UpdateIdeaResponse> {
  try {
    await client.put('/api/v1/mcp/idea', {
      id: params.id,
      title: params.title,
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

export async function deleteIdea(
  client: ApiClient,
  params: DeleteIdeaParams,
): Promise<DeleteIdeaResponse> {
  try {
    await client.delete(`/api/v1/mcp/idea/${params.id}`);

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
