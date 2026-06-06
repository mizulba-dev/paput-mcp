import { ApiClient } from './client.js';
import type {
  DashboardAnalysis,
  UpdateDashboardAnalysisParams,
} from '../../types/index.js';

export async function getDashboardAnalysis(
  client: ApiClient,
): Promise<DashboardAnalysis | null> {
  return client.get<DashboardAnalysis | null>('/api/v1/mcp/dashboard-analysis');
}

export async function updateDashboardAnalysis(
  client: ApiClient,
  params: UpdateDashboardAnalysisParams,
): Promise<DashboardAnalysis> {
  return client.put<DashboardAnalysis>(
    '/api/v1/mcp/dashboard-analysis',
    params,
  );
}
