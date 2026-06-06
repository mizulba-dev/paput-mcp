import { ApiClient } from './client.js';
import type { DashboardSummary } from '../../types/index.js';

export async function getDashboardSummary(
  client: ApiClient,
): Promise<DashboardSummary> {
  return client.get<DashboardSummary>('/api/v1/mcp/dashboard');
}
