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
  getProjectContextTool,
  getProjectDocumentTool,
  addProjectDocumentTool,
  updateProjectDocumentTool,
  updateProjectInstructionsTool,
  discardProjectProposalTool,
  promoteProjectDocumentsTool,
  cacheStatusTool,
  scanSessionsTool,
  getSessionTranscriptTool,
  addKnowledgeCandidatesTool,
  listPendingCandidatesTool,
  updatePendingCandidateTool,
  savePendingCandidateTool,
  discardPendingCandidateTool,
  getCapturePolicyTool,
  getDiscardPolicyContextTool,
  updateCapturePolicyTool,
} from './handlers/index.js';
import type { ToolContext, ToolHandler } from './types/index.js';

interface RegisteredToolsOptions {
  includeLocalTools?: boolean;
  projectMatchConfigured?: boolean;
}

export function setupTool(
  server: Server,
  apiUrl: string,
  accessToken?: string,
  context: ToolContext = {},
  registeredToolsOptions: RegisteredToolsOptions = {},
): void {
  const apiClient = createApiClient(apiUrl, accessToken);
  const includeLocalTools = registeredToolsOptions.includeLocalTools ?? true;
  const projectMatchConfigured = Boolean(
    context.projectMatch?.trim() ||
      (includeLocalTools && process.env.PAPUT_PROJECT_MATCH?.trim()),
  );
  const tools = getRegisteredTools({
    ...registeredToolsOptions,
    projectMatchConfigured,
  });

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

    return await tool.handler(request.params.arguments, apiClient, context);
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
  const projectMatchConfigured = options.projectMatchConfigured ?? false;
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
    getProjectContextTool,
    getProjectDocumentTool,
    addProjectDocumentTool,
    updateProjectDocumentTool,
    updateProjectInstructionsTool,
    discardProjectProposalTool,
    promoteProjectDocumentsTool,
    cacheStatusTool,
    scanSessionsTool,
    getSessionTranscriptTool,
    addKnowledgeCandidatesTool,
    listPendingCandidatesTool,
    updatePendingCandidateTool,
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
    .map(withToolAnnotations)
    .map((tool) =>
      projectMatchConfigured ? withConfiguredProjectMatch(tool) : tool,
    );
}

const PROJECT_CONTEXT_CONFIGURED_DESCRIPTION =
  'Get the private project context (always-applied instructions and an index of accumulated project documents) for the project configured by PAPUT_PROJECT_MATCH. The project is resolved automatically from configuration, so call this with no arguments at session start. Document bodies are not included; fetch them on demand with paput_get_project_document.';

function withConfiguredProjectMatch(tool: ToolHandler): ToolHandler {
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
  const generatedInputSchema = getGeneratedInputSchema(name);

  if (!generatedInputSchema) {
    throw new Error(`inputSchema is not defined for tool: ${name}`);
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
    name === 'paput_discard_project_proposal' ||
    name === 'paput_promote_project_documents' ||
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
    name === 'paput_scan_sessions' ||
    name === 'paput_get_session_transcript' ||
    name === 'paput_add_knowledge_candidates' ||
    name === 'paput_list_pending_candidates' ||
    name === 'paput_update_pending_candidate' ||
    name === 'paput_save_pending_candidate' ||
    name === 'paput_discard_pending_candidate' ||
    name === 'paput_get_capture_policy' ||
    name === 'paput_get_discard_policy_context' ||
    name === 'paput_update_capture_policy'
  );
}
