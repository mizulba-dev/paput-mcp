import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { createApiClient } from './services/api/index.js';
import {
  getGeneratedInputSchema,
  getToolInputZodSchema,
} from './schemas/tool-input.js';
import {
  createMemosTool,
  searchMemoTool,
  findSimilarMemosTool,
  backfillMemoEmbeddingsTool,
  getMemoTool,
  updateMemoTool,
  getCategoriesTool,
  createNoteTool,
  searchNotesTool,
  getNoteTool,
  updateNoteTool,
  getSkillSheetTool,
  updateSkillSheetBasicInfoTool,
  updateSkillSheetSelfPrTool,
  updateSkillSheetPublicProfileTool,
  setSkillSheetSkillsTool,
  upsertSkillSheetProjectTool,
  deleteSkillSheetProjectTool,
  getSkillSheetProjectSummaryContextTool,
  updateSkillSheetProjectAiSummaryTool,
  listGoalsTool,
  createGoalTool,
  updateGoalTool,
  deleteGoalTool,
  getDashboardAnalysisTool,
  updateDashboardAnalysisTool,
  getDashboardAnalysisContextTool,
  getPublicProfileContextTool,
  cacheStatusTool,
  syncRemoteMemosTool,
  scanSessionsTool,
  getSessionTranscriptTool,
  addKnowledgeCandidatesTool,
  listPendingCandidatesTool,
  savePendingCandidateTool,
  discardPendingCandidateTool,
  getCapturePolicyTool,
  getDiscardPolicyContextTool,
  updateCapturePolicyTool,
} from './handlers/index.js';
import type { ToolContext, ToolHandler } from './types/index.js';

interface RegisteredToolsOptions {
  includeLocalTools?: boolean;
}

export function setupTool(
  server: Server,
  apiUrl: string,
  accessToken?: string,
  context: ToolContext = {},
  registeredToolsOptions: RegisteredToolsOptions = {},
): void {
  const apiClient = createApiClient(apiUrl, accessToken);
  const tools = getRegisteredTools(registeredToolsOptions);

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: tools.map((tool) => tool.definition),
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const tool = tools.find((t) => t.definition.name === request.params.name);

    if (!tool) {
      return {
        content: [
          {
            type: 'text',
            text: `Unknown tool: ${request.params.name}`,
          },
        ],
        isError: true,
      };
    }

    // 受信した引数を zod スキーマで実行時バリデーションし、不正な型の
    // 入力が handler（パス埋め込み等）に渡るのを防ぐ。
    const inputSchema = getToolInputZodSchema(request.params.name);
    if (inputSchema) {
      const parsed = inputSchema.safeParse(request.params.arguments ?? {});
      if (!parsed.success) {
        return {
          content: [
            {
              type: 'text',
              text: `Invalid arguments for ${request.params.name}: ${parsed.error.issues
                .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
                .join('; ')}`,
            },
          ],
          isError: true,
        };
      }
    }

    return await tool.handler(request.params.arguments, apiClient, context);
  });

  // Handler that lists resources
  server.setRequestHandler(ListResourcesRequestSchema, async () => ({
    resources: [
      {
        uri: 'paput://tools',
        name: 'PaPut MCP tools',
        description: 'Details of available PaPut MCP tools',
        mimeType: 'application/json',
      },
    ],
  }));

  // Handler that reads resource content
  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    if (request.params.uri !== 'paput://tools') {
      return {
        contents: [
          {
            uri: request.params.uri,
            mimeType: 'text/plain',
            text: `Resource not found: ${request.params.uri}`,
          },
        ],
      };
    }

    const toolsInfo = tools.map((tool) => ({
      name: tool.definition.name,
      description: tool.definition.description,
      annotations: tool.definition.annotations,
      inputSchema: tool.definition.inputSchema,
    }));

    return {
      contents: [
        {
          uri: 'paput://tools',
          mimeType: 'application/json',
          text: JSON.stringify(toolsInfo, null, 2),
        },
      ],
    };
  });
}

export function getRegisteredTools(
  options: RegisteredToolsOptions = {},
): ToolHandler[] {
  const includeLocalTools = options.includeLocalTools ?? true;
  const tools = [
    createMemosTool,
    searchMemoTool,
    findSimilarMemosTool,
    backfillMemoEmbeddingsTool,
    getMemoTool,
    updateMemoTool,
    getCategoriesTool,
    createNoteTool,
    searchNotesTool,
    getNoteTool,
    updateNoteTool,
    getSkillSheetTool,
    updateSkillSheetBasicInfoTool,
    updateSkillSheetSelfPrTool,
    updateSkillSheetPublicProfileTool,
    setSkillSheetSkillsTool,
    upsertSkillSheetProjectTool,
    deleteSkillSheetProjectTool,
    getSkillSheetProjectSummaryContextTool,
    updateSkillSheetProjectAiSummaryTool,
    listGoalsTool,
    createGoalTool,
    updateGoalTool,
    deleteGoalTool,
    getDashboardAnalysisTool,
    updateDashboardAnalysisTool,
    getDashboardAnalysisContextTool,
    getPublicProfileContextTool,
    cacheStatusTool,
    syncRemoteMemosTool,
    scanSessionsTool,
    getSessionTranscriptTool,
    addKnowledgeCandidatesTool,
    listPendingCandidatesTool,
    savePendingCandidateTool,
    discardPendingCandidateTool,
    getCapturePolicyTool,
    getDiscardPolicyContextTool,
    updateCapturePolicyTool,
  ];

  return tools
    .filter(
      (tool) => includeLocalTools || !isLocalOnlyTool(tool.definition.name),
    )
    .map(withToolAnnotations);
}

function withToolAnnotations(tool: ToolHandler): ToolHandler {
  const name = tool.definition.name;
  const readOnly = isReadOnlyTool(name);
  const destructive = isDestructiveTool(name);
  const inputSchema = getGeneratedInputSchema(name);

  if (!inputSchema) {
    throw new Error(`inputSchema is not defined for tool: ${name}`);
  }

  return {
    ...tool,
    definition: {
      ...tool.definition,
      title: getToolTitle(name),
      inputSchema,
      annotations: {
        ...tool.definition.annotations,
        title: tool.definition.annotations?.title ?? getToolTitle(name),
        readOnlyHint: readOnly,
        destructiveHint: readOnly ? false : destructive,
        idempotentHint: isIdempotentTool(name),
        openWorldHint: false,
      },
    },
  };
}

function getToolTitle(name: string): string {
  return name
    .replace(/^paput_/, '')
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function isReadOnlyTool(name: string): boolean {
  return (
    name.includes('_get_') ||
    name.includes('_search_') ||
    name.includes('_list_') ||
    name === 'paput_get_categories' ||
    name === 'paput_cache_status' ||
    name === 'paput_scan_sessions' ||
    name === 'paput_get_capture_policy' ||
    name === 'paput_get_discard_policy_context'
  );
}

function isDestructiveTool(name: string): boolean {
  return (
    name.includes('_delete_') ||
    name === 'paput_discard_pending_candidate' ||
    name === 'paput_update_capture_policy' ||
    name === 'paput_set_skill_sheet_skills' ||
    name === 'paput_upsert_skill_sheet_project' ||
    name.startsWith('paput_update_')
  );
}

function isIdempotentTool(name: string): boolean {
  return (
    isReadOnlyTool(name) ||
    name.startsWith('paput_update_') ||
    name === 'paput_set_skill_sheet_skills'
  );
}

function isLocalOnlyTool(name: string): boolean {
  return (
    name === 'paput_cache_status' ||
    name === 'paput_sync_remote_memos' ||
    name === 'paput_scan_sessions' ||
    name === 'paput_get_session_transcript' ||
    name === 'paput_add_knowledge_candidates' ||
    name === 'paput_list_pending_candidates' ||
    name === 'paput_save_pending_candidate' ||
    name === 'paput_discard_pending_candidate' ||
    name === 'paput_get_capture_policy' ||
    name === 'paput_get_discard_policy_context' ||
    name === 'paput_update_capture_policy'
  );
}
