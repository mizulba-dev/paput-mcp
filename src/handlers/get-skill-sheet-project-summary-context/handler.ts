import { ApiClient } from '../../services/api/client.js';
import { getMemo } from '../../services/api/memo.js';
import { getSkillSheet } from '../../services/api/skill-sheet.js';

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

  const memos = await Promise.all(
    project.memos.map((memo) => getMemo(apiClient, { id: memo.id })),
  );

  const memoText =
    memos.length > 0
      ? memos
          .map((memo) => `---\nTitle: ${memo.title}\nBody:\n${memo.body}`)
          .join('\n\n')
      : 'None';

  const prompt = `Analyze the following project information and related memos, then summarize what was learned and what was improved in 3 to 5 Japanese bullet points.

Project:
Title: ${project.title}
Description: ${project.description}
Role: ${project.role}

Related memos:
${memoText}

Output format:
・[learning or improvement 1]
・[learning or improvement 2]
・[learning or improvement 3]

Keep the summary technically specific and understandable to a third party.`;

  return {
    structuredContent: {
      project,
      memos,
      prompt,
    },
    content: [
      {
        type: 'text',
        text: `Project summary context:
Project: ${project.title} (ID: ${project.id})
Current AI summary: ${project.ai_summary || 'Not set'}
Related memo count: ${memos.length}

${prompt}`,
      },
    ],
  };
}
