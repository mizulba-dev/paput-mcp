import { describe, expect, it, vi } from 'vitest';
import type { ApiClient } from './client.js';
import {
  deleteSkillSheetProject,
  deleteSkillSheetSkill,
  getSkillSheet,
  getSkillSheetProjects,
  getPublicProfileContext,
  searchSkillSheetProjects,
  updateSkillSheetBasicInfo,
  updateSkillSheetProjectAiSummary,
  updateSkillSheetSkills,
} from './skill-sheet.js';

function createMockClient(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    get: vi.fn().mockResolvedValue({}),
    post: vi.fn().mockResolvedValue({}),
    put: vi.fn().mockResolvedValue({}),
    delete: vi.fn().mockResolvedValue({}),
    ...overrides,
  } as unknown as ApiClient;
}

describe('skill sheet API service', () => {
  describe('getSkillSheet', () => {
    it('returns the skill sheet when the response shape is valid', async () => {
      const client = createMockClient({
        get: vi.fn().mockResolvedValue({ id: 1, skills: [], projects: [] }),
      });

      await expect(getSkillSheet(client)).resolves.toMatchObject({ id: 1 });
      expect(client.get).toHaveBeenCalledWith('/api/v1/mcp/skill-sheet');
    });

    it('rejects when the response shape is invalid', async () => {
      const client = createMockClient({
        get: vi.fn().mockResolvedValue({}),
      });

      await expect(getSkillSheet(client)).rejects.toThrow(
        'Invalid skill sheet response format',
      );
    });
  });

  describe('project search', () => {
    it('URL-encodes the search keyword', async () => {
      const client = createMockClient({
        get: vi.fn().mockResolvedValue([]),
      });

      await searchSkillSheetProjects(client, 'PaPut 開発');

      expect(client.get).toHaveBeenCalledWith(
        '/api/v1/mcp/skill-sheet/projects?search=PaPut%20%E9%96%8B%E7%99%BA',
      );
    });

    it('lists projects without a query when no search is given', async () => {
      const client = createMockClient({
        get: vi.fn().mockResolvedValue({ projects: [] }),
      });

      await getSkillSheetProjects(client);
      await getSkillSheetProjects(client, 'api');

      expect(client.get).toHaveBeenNthCalledWith(
        1,
        '/api/v1/mcp/skill-sheet/projects',
      );
      expect(client.get).toHaveBeenNthCalledWith(
        2,
        '/api/v1/mcp/skill-sheet/projects?search=api',
      );
    });
  });

  describe('mutations', () => {
    it('puts basic info to the dedicated endpoint', async () => {
      const client = createMockClient();

      await updateSkillSheetBasicInfo(client, { years_of_experience: 5 });

      expect(client.put).toHaveBeenCalledWith(
        '/api/v1/mcp/skill-sheet/basic-info',
        { years_of_experience: 5 },
      );
    });

    it('puts the whole skills list', async () => {
      const client = createMockClient();
      const skills = [
        {
          category: { id: 1, name: 'Go' },
          category_type: 1,
          level: 'advanced',
          years: 3,
        },
      ];

      await updateSkillSheetSkills(client, { skills });

      expect(client.put).toHaveBeenCalledWith(
        '/api/v1/mcp/skill-sheet/skills',
        {
          skills,
        },
      );
    });

    it('uses ids in delete endpoints', async () => {
      const client = createMockClient();

      await deleteSkillSheetSkill(client, 3);
      await deleteSkillSheetProject(client, 9);

      expect(client.delete).toHaveBeenCalledWith(
        '/api/v1/mcp/skill-sheet/skill/3',
      );
      expect(client.delete).toHaveBeenCalledWith(
        '/api/v1/mcp/skill-sheet/project/9',
      );
    });

    it('puts the AI summary for a specific project', async () => {
      const client = createMockClient();

      await updateSkillSheetProjectAiSummary(client, 5, 'Summary');

      expect(client.put).toHaveBeenCalledWith(
        '/api/v1/mcp/skill-sheet/project/5/ai-summary',
        { ai_summary: 'Summary' },
      );
    });
  });

  it('gets the public profile context', async () => {
    const client = createMockClient();

    await getPublicProfileContext(client);

    expect(client.get).toHaveBeenCalledWith(
      '/api/v1/mcp/skill-sheet/public-profile-context',
    );
  });
});
