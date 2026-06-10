import { ApiClient } from '../../services/api/client.js';
import { getSkillSheet } from '../../services/api/skill-sheet.js';
import { GENDER, PROJECT_TYPE, CATEGORY_TYPE } from '../../types/index.js';

export async function handleGetSkillSheet(
  _args: Record<string, unknown> | undefined,
  apiClient: ApiClient,
) {
  try {
    const skillSheet = await getSkillSheet(apiClient);

    // Format skills
    const skillsText =
      skillSheet.skills.length > 0
        ? skillSheet.skills
            .map((skill) => {
              const categoryType =
                CATEGORY_TYPE[
                  skill.category_type as keyof typeof CATEGORY_TYPE
                ] || `Type ${skill.category_type}`;
              return `  - ${skill.category.name} (${categoryType}): ${skill.level} (${skill.years}year(s))`;
            })
            .join('\n')
        : '  None';

    // Format projects
    const projectsText =
      skillSheet.projects.length > 0
        ? skillSheet.projects
            .map((project) => {
              const period = project.end_period
                ? `${project.start_period} - ${project.end_period}`
                : `${project.start_period} - Present`;
              const projectType =
                PROJECT_TYPE[project.type as keyof typeof PROJECT_TYPE] ||
                `Type ${project.type}`;
              const techNames = project.technologies
                .map((t) => t.name)
                .join(', ');
              const memoNames = project.memos.map((m) => m.title).join(', ');

              return `  【${project.title}】(ID: ${project.id}, ${projectType})
    Period: ${period}
    Role: ${project.role}
    Scale: ${project.scale}
    Description: ${project.description}
    Technologies: ${techNames || 'None'}
    Memos: ${memoNames || 'None'}`;
            })
            .join('\n\n')
        : '  None';

    // Format gender
    const genderText =
      GENDER[skillSheet.gender as keyof typeof GENDER] || `Other`;

    // Format strength labels
    const strengthLabelsText =
      skillSheet.strength_labels && skillSheet.strength_labels.length > 0
        ? skillSheet.strength_labels
            .map((sl) => {
              const parts = [`  - ${sl.label}`];
              if (sl.description) {
                parts.push(`    ${sl.description}`);
              }
              if (sl.category_names && sl.category_names.length > 0) {
                parts.push(`    Categories: ${sl.category_names.join(', ')}`);
              }
              return parts.join('\n');
            })
            .join('\n')
        : '  None';

    const content = `Skill sheet:
ID: ${skillSheet.id}
Nearest station: ${skillSheet.nearest_station || 'Not set'}
Gender: ${genderText}
Birth date: ${skillSheet.birth_date}
Years of experience: ${skillSheet.years_of_experience} year(s)

Self PR:
${skillSheet.self_pr || 'Not set'}

Public Profile:
Headline: ${skillSheet.headline || 'Not set'}
Profile Summary:
${skillSheet.profile_summary || 'Not set'}

Strength Labels:
${strengthLabelsText}

Skills:
${skillsText}

Projects:
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
      error instanceof Error ? error.message : 'Unknown error';

    // Message when the skill sheet does not exist
    if (errorMessage.includes('404') || errorMessage.includes('not found')) {
      return {
        content: [
          {
            type: 'text',
            text: 'Skill sheet has not been created yet.',
          },
        ],
      };
    }

    return {
      content: [
        {
          type: 'text',
          text: `Error while fetching skill sheet: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
}
