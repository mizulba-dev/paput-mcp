import { describe, expect, it, vi } from 'vitest';
import type { ApiClient } from './client.js';
import { getDashboardSummary } from './dashboard.js';

describe('dashboard API service', () => {
  it('uses the MCP dashboard endpoint', async () => {
    const client = {
      get: vi.fn().mockResolvedValue({ total_memo_count: 0 }),
    } as unknown as ApiClient;

    await getDashboardSummary(client);

    expect(client.get).toHaveBeenCalledWith('/api/v1/mcp/dashboard');
  });
});
