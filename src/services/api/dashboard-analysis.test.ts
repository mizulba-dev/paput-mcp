import { describe, expect, it, vi } from 'vitest';
import type { ApiClient } from './client.js';
import {
  getDashboardAnalysis,
  updateDashboardAnalysis,
} from './dashboard-analysis.js';

describe('dashboard analysis API service', () => {
  it('uses the MCP dashboard-analysis endpoints', async () => {
    const client = {
      get: vi.fn().mockResolvedValue(null),
      put: vi.fn().mockResolvedValue({ id: 1 }),
    } as unknown as ApiClient;

    await getDashboardAnalysis(client);
    await updateDashboardAnalysis(client, {
      current_summary: 'Current',
      strengths: [],
      growing_areas: [],
      weak_areas: [],
      next_knowledge_suggestions: [],
      analyzed_at: '2026-06-06T00:00:00Z',
    });

    expect(client.get).toHaveBeenCalledWith('/api/v1/mcp/dashboard-analysis');
    expect(client.put).toHaveBeenCalledWith('/api/v1/mcp/dashboard-analysis', {
      current_summary: 'Current',
      strengths: [],
      growing_areas: [],
      weak_areas: [],
      next_knowledge_suggestions: [],
      analyzed_at: '2026-06-06T00:00:00Z',
    });
  });
});
