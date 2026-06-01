import { ApiClient } from '../../services/api/client.js';
import { getSkillSheet } from '../../services/api/skill-sheet.js';
import { GENDER, PROJECT_TYPE, CATEGORY_TYPE } from '../../types/index.js';

export async function handleGetSkillSheet(
  _args: Record<string, unknown> | undefined,
  apiClient: ApiClient,
) {
  try {
    const skillSheet = await getSkillSheet(apiClient);

    // スキル情報のフォーマット
    const skillsText =
      skillSheet.skills.length > 0
        ? skillSheet.skills
            .map((skill) => {
              const categoryType =
                CATEGORY_TYPE[
                  skill.category_type as keyof typeof CATEGORY_TYPE
                ] || `タイプ${skill.category_type}`;
              return `  - ${skill.category.name} (${categoryType}): ${skill.level} (${skill.years}年)`;
            })
            .join('\n')
        : '  なし';

    // プロジェクト情報のフォーマット
    const projectsText =
      skillSheet.projects.length > 0
        ? skillSheet.projects
            .map((project) => {
              const period = project.end_period
                ? `${project.start_period} - ${project.end_period}`
                : `${project.start_period} - 現在`;
              const projectType =
                PROJECT_TYPE[project.type as keyof typeof PROJECT_TYPE] ||
                `タイプ${project.type}`;
              const techNames = project.technologies
                .map((t) => t.name)
                .join(', ');
              const memoNames = project.memos.map((m) => m.title).join(', ');

              return `  【${project.title}】(ID: ${project.id}, ${projectType})
    期間: ${period}
    役割: ${project.role}
    規模: ${project.scale}
    説明: ${project.description}
    技術: ${techNames || 'なし'}
    メモ: ${memoNames || 'なし'}`;
            })
            .join('\n\n')
        : '  なし';

    // 性別の表示
    const genderText =
      GENDER[skillSheet.gender as keyof typeof GENDER] || `その他`;

    const content = `スキルシート:
ID: ${skillSheet.id}
最寄り駅: ${skillSheet.nearest_station || '未設定'}
性別: ${genderText}
生年月日: ${skillSheet.birth_date}
経験年数: ${skillSheet.years_of_experience}年

自己PR:
${skillSheet.self_pr || '未設定'}

スキル:
${skillsText}

プロジェクト:
${projectsText}`;

    return {
      structuredContent: {
        skill_sheet: skillSheet,
      },
      content: [
        {
          type: 'text',
          text: content,
        },
      ],
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : '不明なエラー';

    // スキルシートが存在しない場合のメッセージ
    if (errorMessage.includes('404') || errorMessage.includes('not found')) {
      return {
        content: [
          {
            type: 'text',
            text: 'スキルシートがまだ作成されていません。',
          },
        ],
      };
    }

    return {
      content: [
        {
          type: 'text',
          text: `スキルシートの取得中にエラーが発生しました: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
}
