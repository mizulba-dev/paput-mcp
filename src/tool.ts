import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  McpError,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { createApiClient } from './services/api/index.js';
import {
  getGeneratedInputSchema,
  getToolInputZodSchema,
} from './schemas/tool-input.js';
import { getToolOutputSchema } from './schemas/tool-output.js';
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
  setSkillSheetSkillsTool,
  upsertSkillSheetProjectTool,
  deleteSkillSheetProjectTool,
  getSkillSheetProjectEpisodesContextTool,
  updateSkillSheetProjectEpisodesTool,
  updateSkillSheetFaqTool,
  listGoalsTool,
  createGoalTool,
  updateGoalTool,
  deleteGoalTool,
  getDashboardAnalysisTool,
  updateDashboardAnalysisTool,
  getDashboardAnalysisContextTool,
  getProjectContextTool,
  getProjectDocumentTool,
  searchProjectDocumentsTool,
  addProjectDocumentTool,
  updateProjectDocumentTool,
  updateProjectInstructionsTool,
  discardProjectProposalTool,
  promoteProjectDocumentsTool,
  addKnowledgeCandidatesTool,
  listProcessedSessionsTool,
  markProcessedSessionTool,
  listPendingCandidatesTool,
  updatePendingCandidateTool,
  savePendingCandidateTool,
  discardPendingCandidateTool,
  getCapturePolicyTool,
  getDiscardPolicyContextTool,
  updateCapturePolicyTool,
} from './handlers/index.js';
import type { ToolContext, ToolHandler } from './types/index.js';

const ONBOARDING_STATUS_INVALIDATING_TOOLS = new Set([
  'paput_create_memos',
  'paput_save_pending_candidate',
  'paput_update_skill_sheet_basic_info',
  'paput_set_skill_sheet_skills',
  'paput_upsert_skill_sheet_project',
]);

const ONBOARDING_SKILL_HINT =
  ' I can guide you through initial setup; in Claude Code, use the /paput:onboarding skill.';

interface RegisteredToolsOptions {
  projectContextConfigured?: boolean;
}

export function setupTool(
  server: Server,
  apiUrl: string,
  accessToken?: string,
  context: ToolContext = {},
  registeredToolsOptions: RegisteredToolsOptions = {},
): void {
  const apiClient = createApiClient(apiUrl, accessToken);
  // alias は未解決のまま渡る（実在確認はツール呼び出し時）ので、設定の有無だけで判定する。
  const projectContextConfigured = Boolean(
    context.projectId ?? context.projectAlias,
  );
  const tools = getRegisteredTools({
    ...registeredToolsOptions,
    projectContextConfigured,
  });

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: tools.map((tool) => tool.definition),
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const tool = tools.find((t) => t.definition.name === request.params.name);

    if (!tool) {
      // 未知ツールは仕様上 JSON-RPC の -32602 プロトコルエラーで返す。
      throw new McpError(
        ErrorCode.InvalidParams,
        `Unknown tool: ${request.params.name}`,
      );
    }

    // 引数を zod スキーマで実行時検証し不正型を handler に渡さない。
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

    const result = await tool.handler(
      request.params.arguments,
      apiClient,
      context,
    );

    return await processToolResult(request.params.name, result, context);
  });

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
      outputSchema: tool.definition.outputSchema,
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

export async function processToolResult(
  toolName: string,
  result: Record<string, unknown>,
  context: ToolContext,
): Promise<Record<string, unknown>> {
  const invalidated = shouldInvalidateOnboardingStatus(toolName, result);
  if (invalidated) {
    context.onboarding?.invalidateStatus();
  }

  if (invalidated || result.isError === true) return result;

  return await appendOnboardingNudge(result, context);
}

function shouldInvalidateOnboardingStatus(
  toolName: string,
  result: Record<string, unknown>,
): boolean {
  if (!ONBOARDING_STATUS_INVALIDATING_TOOLS.has(toolName)) return false;
  if (result.isError !== true) return true;

  const structuredContent = result.structuredContent;
  if (toolName === 'paput_save_pending_candidate') {
    return (
      typeof structuredContent === 'object' &&
      structuredContent !== null &&
      'action' in structuredContent &&
      structuredContent.action === 'save_candidate_failed_after_memo_created'
    );
  }
  if (toolName !== 'paput_create_memos') return false;

  return (
    typeof structuredContent === 'object' &&
    structuredContent !== null &&
    'created_count' in structuredContent &&
    typeof structuredContent.created_count === 'number' &&
    structuredContent.created_count > 0
  );
}

export async function appendOnboardingNudge(
  result: Record<string, unknown>,
  context: ToolContext,
): Promise<Record<string, unknown>> {
  if (
    result.isError === true ||
    !context.onboarding ||
    !Array.isArray(result.content)
  ) {
    return result;
  }

  try {
    const status = await context.onboarding.getStatus();
    const text = getOnboardingNudge(status);
    if (!text || !context.onboarding.claimNudge()) return result;

    return {
      ...result,
      content: [...result.content, { type: 'text', text }],
    };
  } catch {
    // オンボーディング判定の失敗で本来のツール応答を壊さない。
    return result;
  }
}

function getOnboardingNudge(status: {
  memo_count: number;
  has_skill_sheet: boolean;
}): string | undefined {
  if (status.memo_count === 0 && !status.has_skill_sheet) {
    return `Your PaPut account is empty.${ONBOARDING_SKILL_HINT}`;
  }
  if (!status.has_skill_sheet) {
    return `Your PaPut skill sheet has not been set up yet.${ONBOARDING_SKILL_HINT}`;
  }
  if (status.memo_count === 0) {
    return `Your PaPut account has no memos yet.${ONBOARDING_SKILL_HINT}`;
  }
  return undefined;
}

export function getRegisteredTools(
  options: Pick<RegisteredToolsOptions, 'projectContextConfigured'> = {},
): ToolHandler[] {
  const projectContextConfigured = options.projectContextConfigured ?? false;
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
    setSkillSheetSkillsTool,
    upsertSkillSheetProjectTool,
    deleteSkillSheetProjectTool,
    getSkillSheetProjectEpisodesContextTool,
    updateSkillSheetProjectEpisodesTool,
    updateSkillSheetFaqTool,
    listGoalsTool,
    createGoalTool,
    updateGoalTool,
    deleteGoalTool,
    getDashboardAnalysisTool,
    updateDashboardAnalysisTool,
    getDashboardAnalysisContextTool,
    getProjectContextTool,
    getProjectDocumentTool,
    searchProjectDocumentsTool,
    addProjectDocumentTool,
    updateProjectDocumentTool,
    updateProjectInstructionsTool,
    discardProjectProposalTool,
    promoteProjectDocumentsTool,
    addKnowledgeCandidatesTool,
    listProcessedSessionsTool,
    markProcessedSessionTool,
    listPendingCandidatesTool,
    updatePendingCandidateTool,
    savePendingCandidateTool,
    discardPendingCandidateTool,
    getCapturePolicyTool,
    getDiscardPolicyContextTool,
    updateCapturePolicyTool,
  ];

  return tools
    .map(withToolAnnotations)
    .map((tool) =>
      projectContextConfigured ? withConfiguredProjectContext(tool) : tool,
    );
}

const PROJECT_CONTEXT_CONFIGURED_DESCRIPTION =
  'Get the private project context (always-applied instructions, pending skill proposals, and document counts by kind) for the configured project. The project is resolved automatically from the MCP URL project_alias, so call this with no arguments at session start. Before drafting a design decision, implementation plan, or refactor, search past decisions and rejected alternatives with paput_search_project_documents.';

function withConfiguredProjectContext(tool: ToolHandler): ToolHandler {
  if (tool.definition.name !== 'paput_get_project_context') return tool;

  const schema = tool.definition.inputSchema;
  const properties =
    isJsonSchemaObject(schema) && isPropertyMap(schema.properties)
      ? { ...schema.properties }
      : {};
  delete properties.project;

  return {
    ...tool,
    definition: {
      ...tool.definition,
      description: PROJECT_CONTEXT_CONFIGURED_DESCRIPTION,
      inputSchema: {
        type: 'object',
        properties,
      } as ToolHandler['definition']['inputSchema'],
    },
  };
}

function withToolAnnotations(tool: ToolHandler): ToolHandler {
  const name = tool.definition.name;
  const readOnly = isReadOnlyTool(name);
  const destructive = isDestructiveTool(name);
  const openWorld = isOpenWorldTool(name);
  const generatedInputSchema = getGeneratedInputSchema(name);
  const outputSchema = getToolOutputSchema(name);

  if (!generatedInputSchema) {
    throw new Error(`inputSchema is not defined for tool: ${name}`);
  }
  if (!outputSchema) {
    throw new Error(`outputSchema is not defined for tool: ${name}`);
  }

  const inputSchema = mergeToolInputSchema(
    generatedInputSchema,
    tool.definition.inputSchema,
  );

  return {
    ...tool,
    definition: {
      ...tool.definition,
      title: getToolTitle(name),
      inputSchema,
      outputSchema,
      annotations: {
        ...tool.definition.annotations,
        title: tool.definition.annotations?.title ?? getToolTitle(name),
        readOnlyHint: readOnly,
        destructiveHint: readOnly ? false : destructive,
        idempotentHint: isIdempotentTool(name),
        openWorldHint: openWorld,
      },
    },
  };
}

function mergeToolInputSchema(
  generatedInputSchema: ToolHandler['definition']['inputSchema'],
  handlerInputSchema: ToolHandler['definition']['inputSchema'],
): ToolHandler['definition']['inputSchema'] {
  return mergeJsonSchema(
    handlerInputSchema,
    generatedInputSchema,
  ) as ToolHandler['definition']['inputSchema'];
}

function mergeJsonSchema(
  handlerSchema: unknown,
  generatedSchema: unknown,
): unknown {
  if (!isJsonSchemaObject(handlerSchema)) {
    return generatedSchema;
  }

  if (!isJsonSchemaObject(generatedSchema)) {
    return handlerSchema;
  }

  const merged: Record<string, unknown> = {
    ...handlerSchema,
    ...generatedSchema,
  };

  if (
    isPropertyMap(handlerSchema.properties) ||
    isPropertyMap(generatedSchema.properties)
  ) {
    merged.properties = mergeSchemaProperties(
      isPropertyMap(handlerSchema.properties) ? handlerSchema.properties : {},
      isPropertyMap(generatedSchema.properties)
        ? generatedSchema.properties
        : {},
    );
  }

  if (handlerSchema.items || generatedSchema.items) {
    merged.items = mergeJsonSchema(handlerSchema.items, generatedSchema.items);
  }

  if (
    Array.isArray(handlerSchema.required) ||
    Array.isArray(generatedSchema.required)
  ) {
    merged.required = Array.from(
      new Set([
        ...stringArray(handlerSchema.required),
        ...stringArray(generatedSchema.required),
      ]),
    );
  }

  return merged;
}

function mergeSchemaProperties(
  handlerProperties: Record<string, unknown>,
  generatedProperties: Record<string, unknown>,
): Record<string, unknown> {
  const merged: Record<string, unknown> = { ...handlerProperties };

  for (const [key, generatedProperty] of Object.entries(generatedProperties)) {
    merged[key] = mergeJsonSchema(merged[key], generatedProperty);
  }

  return merged;
}

function isJsonSchemaObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isPropertyMap(value: unknown): value is Record<string, unknown> {
  return isJsonSchemaObject(value);
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
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
    name === 'paput_find_similar_memos' ||
    name === 'paput_get_categories' ||
    name === 'paput_get_capture_policy' ||
    name === 'paput_get_discard_policy_context' ||
    name === 'paput_list_processed_sessions'
  );
}

function isDestructiveTool(name: string): boolean {
  return (
    name.includes('_delete_') ||
    name === 'paput_mark_processed_session' ||
    name === 'paput_discard_pending_candidate' ||
    name === 'paput_discard_project_proposal' ||
    name === 'paput_promote_project_documents' ||
    name === 'paput_update_capture_policy' ||
    name === 'paput_set_skill_sheet_skills' ||
    name === 'paput_upsert_skill_sheet_project' ||
    name.startsWith('paput_update_')
  );
}

function isOpenWorldTool(name: string): boolean {
  return (
    name === 'paput_create_memos' ||
    name === 'paput_update_memo' ||
    name === 'paput_create_note' ||
    name === 'paput_update_note' ||
    name === 'paput_update_skill_sheet_basic_info' ||
    name === 'paput_update_skill_sheet_self_pr' ||
    name === 'paput_set_skill_sheet_skills' ||
    name === 'paput_upsert_skill_sheet_project' ||
    name === 'paput_delete_skill_sheet_project' ||
    name === 'paput_update_skill_sheet_project_episodes' ||
    name === 'paput_update_skill_sheet_faq' ||
    name === 'paput_save_pending_candidate'
  );
}

function isIdempotentTool(name: string): boolean {
  return (
    isReadOnlyTool(name) ||
    name.startsWith('paput_update_') ||
    name === 'paput_set_skill_sheet_skills'
  );
}
