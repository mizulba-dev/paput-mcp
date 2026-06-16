import { ApiClient } from '../../services/api/client.js';
import { CreateMemoParams, type ToolContext } from '../../types/index.js';
import { resolveMemoProjects } from '../memo-projects.js';

export async function buildCreateMemoParams(
  args: Record<string, unknown>,
  apiClient: ApiClient,
  context?: ToolContext,
): Promise<CreateMemoParams> {
  const params: CreateMemoParams = {
    title: args.title as string,
    body: args.body as string,
    is_public: typeof args.is_public === 'boolean' ? args.is_public : false,
  };

  if (typeof args.created_at === 'string') {
    params.created_at = args.created_at;
  }

  if (Array.isArray(args.categories)) {
    params.categories = args.categories
      .filter((item): item is string => typeof item === 'string')
      .map((name) => ({ name }));
  }

  if (Array.isArray(args.memo_type_keys)) {
    params.memo_type_keys = args.memo_type_keys.filter(
      (item): item is string => typeof item === 'string',
    );
  }

  params.projects = await resolveMemoProjects(args, apiClient, context);

  return params;
}
