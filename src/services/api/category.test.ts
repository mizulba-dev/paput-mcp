import { describe, expect, it, vi } from 'vitest';
import type { ApiClient } from './client.js';
import { getCategories } from './category.js';

describe('category API service', () => {
  it('uses the MCP categories endpoint', async () => {
    const client = {
      get: vi.fn().mockResolvedValue({ categories: [] }),
    } as unknown as ApiClient;

    await expect(getCategories(client)).resolves.toEqual({ categories: [] });
    expect(client.get).toHaveBeenCalledWith('/api/v1/mcp/categories');
  });
});
