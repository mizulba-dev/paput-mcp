import { ApiClient } from '../../services/api/client.js';
import { createMemo } from '../../services/api/memo.js';
import { searchSkillSheetProjects } from '../../services/api/skill-sheet.js';
import { CreateMemoParams } from '../../types/index.js';

export async function handleCreateMemo(
  args: Record<string, unknown> | undefined,
  apiClient: ApiClient,
) {
  if (!args) {
    return {
      content: [
        {
          type: 'text',
          text: 'パラメータが不足しています',
        },
      ],
      isError: true,
    };
  }

  // パラメータの検証
  if (typeof args.title !== 'string' || typeof args.body !== 'string') {
    return {
      content: [
        {
          type: 'text',
          text: 'タイトルと本文は文字列で指定してください',
        },
      ],
      isError: true,
    };
  }

  // パラメータの構築
  const params: CreateMemoParams = {
    title: args.title,
    body: args.body,
    is_public: typeof args.is_public === 'boolean' ? args.is_public : false,
  };

  if (typeof args.created_at === 'string') {
    params.created_at = args.created_at;
  }

  // カテゴリの処理
  if (Array.isArray(args.categories)) {
    params.categories = args.categories
      .filter((item): item is string => typeof item === 'string')
      .map((name) => ({ name }));
  }

  // プロジェクトの処理
  if (Array.isArray(args.projects)) {
    params.projects = args.projects.filter(
      (item): item is { id: number; title?: string } =>
        typeof item === 'object' &&
        item !== null &&
        'id' in item &&
        typeof item.id === 'number',
    );
  } else if (!args.projects && process.env.PAPUT_PROJECT_MATCH) {
    // 環境変数が設定されている場合、プロジェクトを検索して自動紐付け
    try {
      const projects = await searchSkillSheetProjects(
        apiClient,
        process.env.PAPUT_PROJECT_MATCH,
      );
      if (projects.length > 0) {
        // 最初にマッチしたプロジェクトを使用
        params.projects = [projects[0]];
      }
    } catch (error) {
      // プロジェクト検索が失敗しても、メモ作成は続行
      console.error('Failed to search projects:', error);
    }
  }

  try {
    const result = await createMemo(apiClient, params);

    if (!result.success) {
      return {
        content: [
          {
            type: 'text',
            text: `メモの作成に失敗しました: ${result.error || '不明なエラー'}`,
          },
        ],
        isError: true,
      };
    }

    let message = `メモ「${params.title}」が正常に作成されました。`;
    if (params.projects && params.projects.length > 0) {
      message += `\nプロジェクト: ${params.projects[0].title || `ID: ${params.projects[0].id}`}`;
    }

    return {
      content: [
        {
          type: 'text',
          text: message,
        },
      ],
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : '不明なエラー';

    return {
      content: [
        {
          type: 'text',
          text: `メモの作成中にエラーが発生しました: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
}
