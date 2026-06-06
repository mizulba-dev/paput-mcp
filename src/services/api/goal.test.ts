import { describe, expect, it, vi } from 'vitest';
import type { ApiClient } from './client.js';
import { createGoal, deleteGoal, listGoals, updateGoal } from './goal.js';

describe('goal API service', () => {
  it('uses the MCP goal endpoints', async () => {
    const client = {
      get: vi.fn().mockResolvedValue([]),
      post: vi.fn().mockResolvedValue({ id: 1, title: 'Goal' }),
      put: vi.fn().mockResolvedValue({}),
      delete: vi.fn().mockResolvedValue({}),
    } as unknown as ApiClient;

    await listGoals(client);
    await createGoal(client, {
      title: 'Goal',
      description: null,
      category: 'learning',
      status: 'active',
      priority: 1,
      target_date: null,
    });
    await updateGoal(client, {
      id: 1,
      title: 'Goal',
      description: null,
      category: 'learning',
      status: 'active',
      priority: 1,
      target_date: null,
    });
    await deleteGoal(client, 1);

    expect(client.get).toHaveBeenCalledWith('/api/v1/mcp/goals');
    expect(client.post).toHaveBeenCalledWith('/api/v1/mcp/goal', {
      title: 'Goal',
      description: null,
      category: 'learning',
      status: 'active',
      priority: 1,
      target_date: null,
    });
    expect(client.put).toHaveBeenCalledWith('/api/v1/mcp/goal', {
      id: 1,
      title: 'Goal',
      description: null,
      category: 'learning',
      status: 'active',
      priority: 1,
      target_date: null,
    });
    expect(client.delete).toHaveBeenCalledWith('/api/v1/mcp/goal/1');
  });
});
