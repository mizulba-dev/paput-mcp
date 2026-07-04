import { ApiClient } from '../../services/api/client.js';
import { searchMemos } from '../../services/api/memo.js';
import { getSkillSheet } from '../../services/api/skill-sheet.js';
import type { Memo } from '../../types/index.js';

const MEMO_PAGE_LIMIT = 100;

export async function handler(
  params: Record<string, unknown> | undefined,
  apiClient: ApiClient,
): Promise<Record<string, unknown>> {
  if (!params || typeof params.project_id !== 'number') {
    return {
      content: [
        {
          type: 'text',
          text: 'Project ID is required',
        },
      ],
      isError: true,
    };
  }

  const projectId = params.project_id;
  const skillSheet = await getSkillSheet(apiClient);
  const project = skillSheet.projects.find((item) => item.id === projectId);

  if (!project) {
    return {
      content: [
        {
          type: 'text',
          text: `Project was not found: ${projectId}`,
        },
      ],
      isError: true,
    };
  }

  const publicMemos = await fetchProjectMemos(apiClient, projectId, true);
  const privateMemoCount = await countProjectMemos(apiClient, projectId, false);

  const memoText =
    publicMemos.length > 0
      ? publicMemos
          .map((memo) => {
            const memoTypes =
              memo.memo_types && memo.memo_types.length > 0
                ? memo.memo_types.map((type) => type.key).join(', ')
                : 'none';
            return `---\nID: ${memo.id}\nTitle: ${memo.title}\nTypes: ${memoTypes}\nBody:\n${memo.body}`;
          })
          .join('\n\n')
      : 'None';

  const prompt = `Generate project design-and-judgment episode drafts from the project information and public linked memo bodies in structuredContent. Write the draft in the user's language and match the user's tone when possible. Do not save anything automatically.

Project:
ID: ${project.id}
Title: ${project.title}
Description: ${project.description}
Role: ${project.role}
Scale: ${project.scale}
Technologies: ${project.technologies.map((technology) => technology.name).join(', ') || 'None'}
Achievements: ${(project.achievements ?? []).join('; ') || 'None'}
Existing episodes: ${(project.episodes ?? []).length}

Public linked memos:
${memoText}

Private linked memo count: ${privateMemoCount}

Episode requirements:
- Generate 2-3 episodes when the material supports them; generate fewer, or none, when the public memos are thin.
- Prefer decision and operation memos. Use knowledge memos only as background.
- Each episode must have claim, situation, decision, reason, and supporting_memo_ids.
- The claim is the visible lead line. Keep it understandable to a recruiter or interviewer, and preserve the meaningful contrast ("chose B over A") when the source material supports it.
- Keep situation, decision, and reason to 1-2 sentences each.
- supporting_memo_ids must use only IDs from the public linked memos above. Never invent IDs and never use private memo IDs.
- Do not claim anything that is not backed by at least one public linked memo.
- Do not treat memo count as proof of ability.
- If the material is too thin, report what is missing instead of forcing episodes.

Achievements draft (always include):
- Alongside the episodes, always draft an updated "achievements" list: 3-5 factual bullets (max 100 characters each, max 10 total) describing what was built and is running, grounded in the project description and public linked memos.
- Achievements are user-owned source material, not generated evidence. Keep them factual: no judgment narrative (that belongs to episodes) and no invented metrics.
- Present the achievements draft for the user to edit and approve. Save only after explicit approval via paput_upsert_skill_sheet_project. Omit the achievements field to keep existing bullets; pass an empty array only when the user wants to clear them.

Present both drafts (episodes and achievements) to the user first. Save episodes only after the user explicitly approves them by calling paput_update_skill_sheet_project_episodes with project_id and the approved episodes. Report any dropped_ids from the save response.`;

  return {
    structuredContent: {
      project,
      public_memos: publicMemos,
      private_memo_count: privateMemoCount,
      prompt,
    },
    content: [
      {
        type: 'text',
        text: `Project episodes context:
Project: ${project.title} (ID: ${project.id})
Current episode count: ${(project.episodes ?? []).length}
Current achievement count: ${(project.achievements ?? []).length}
Public linked memo count: ${publicMemos.length}
Private linked memo count: ${privateMemoCount}

${prompt}`,
      },
    ],
  };
}

async function fetchProjectMemos(
  apiClient: ApiClient,
  projectId: number,
  isPublic: boolean,
): Promise<Memo[]> {
  const memos: Memo[] = [];
  let page = 1;
  let total: number | undefined;

  do {
    const result = await searchMemos(apiClient, {
      project_id: projectId,
      is_public: isPublic,
      page,
      limit: MEMO_PAGE_LIMIT,
    });

    if (!result.success) {
      throw new Error(result.error || 'Failed to search project memos');
    }

    const pageMemos = result.memos || [];
    memos.push(...pageMemos);
    total = result.total;

    if (pageMemos.length === 0) break;
    page += 1;
  } while (total === undefined || memos.length < total);

  return memos;
}

async function countProjectMemos(
  apiClient: ApiClient,
  projectId: number,
  isPublic: boolean,
): Promise<number> {
  const result = await searchMemos(apiClient, {
    project_id: projectId,
    is_public: isPublic,
    page: 1,
    limit: 1,
  });

  if (!result.success) {
    throw new Error(result.error || 'Failed to count project memos');
  }

  return result.total ?? result.memos?.length ?? 0;
}
