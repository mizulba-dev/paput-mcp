import { ApiClient } from './client.js';
import type {
  CreateGoalParams,
  Goal,
  UpdateGoalParams,
} from '../../types/index.js';

export async function listGoals(client: ApiClient): Promise<Goal[]> {
  return client.get<Goal[]>('/api/v1/mcp/goals');
}

export async function createGoal(
  client: ApiClient,
  params: CreateGoalParams,
): Promise<Goal> {
  return client.post<Goal>('/api/v1/mcp/goal', params);
}

export async function updateGoal(
  client: ApiClient,
  params: UpdateGoalParams,
): Promise<void> {
  await client.put('/api/v1/mcp/goal', params);
}

export async function deleteGoal(client: ApiClient, id: number): Promise<void> {
  await client.delete(`/api/v1/mcp/goal/${id}`);
}
