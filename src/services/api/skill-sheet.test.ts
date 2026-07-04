import { describe, expect, it, vi } from 'vitest';
import type { ApiClient } from './client.js';
import {
  deleteSkillSheetProject,
  deleteSkillSheetSkill,
  getSkillSheet,
  getSkillSheetProjects,
  searchSkillSheetProjects,
  updateSkillSheetBasicInfo,
  updateSkillSheetFaq,
  updateSkillSheetProjectEpisodes,
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

    it('passes through a faq list with resolved related memos', async () => {
      const faq = [
        {
          question: 'What do you check first when the database is slow?',
          answer: 'I start with the slow query log, then check indexes.',
          theme: 'Database',
          related_memos: [{ id: 42, title: 'Slow query triage' }],
        },
      ];
      const client = createMockClient({
        get: vi.fn().mockResolvedValue({
          id: 1,
          skills: [],
          projects: [],
          faq,
        }),
      });

      await expect(getSkillSheet(client)).resolves.toMatchObject({ faq });
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

    it('puts episodes for a specific project', async () => {
      const client = createMockClient();
      const episodes = [
        {
          claim: 'Chose incremental replacement over a full rewrite',
          situation: 'The legacy flow was still serving active users.',
          decision: 'Replaced the risky boundary first.',
          reason: 'It reduced release risk while preserving delivery speed.',
          supporting_memo_ids: [10, 11],
        },
      ];

      await updateSkillSheetProjectEpisodes(client, 5, episodes);

      expect(client.put).toHaveBeenCalledWith(
        '/api/v1/mcp/skill-sheet/projects/5/episodes',
        { episodes },
      );
    });

    it('puts the whole faq list as a full replace', async () => {
      const client = createMockClient();
      const faq = [
        {
          question: 'What do you check first when the database is slow?',
          answer: 'I start with the slow query log, then check indexes.',
          theme: 'Database',
          related_memo_ids: [42],
        },
      ];

      await updateSkillSheetFaq(client, faq);

      expect(client.put).toHaveBeenCalledWith('/api/v1/mcp/skill-sheet/faq', {
        faq,
      });
    });
  });
});
