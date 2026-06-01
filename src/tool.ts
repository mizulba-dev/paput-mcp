import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { createApiClient } from './services/api/index.js';
import { getGeneratedInputSchema } from './schemas/tool-input.js';
import {
  createMemoTool,
  searchMemoTool,
  getMemoTool,
  updateMemoTool,
  getCategoriesTool,
  createNoteTool,
  searchNotesTool,
  getNoteTool,
  updateNoteTool,
  listIdeasTool,
  createIdeaTool,
  updateIdeaTool,
  deleteIdeaTool,
  getSkillSheetTool,
  updateSkillSheetBasicInfoTool,
  updateSkillSheetSelfPrTool,
  setSkillSheetSkillsTool,
  upsertSkillSheetProjectTool,
  deleteSkillSheetProjectTool,
  cacheStatusTool,
  syncRemoteMemosTool,
  scanSessionsTool,
  getSessionTranscriptTool,
  addKnowledgeCandidatesTool,
  listPendingCandidatesTool,
  savePendingCandidateTool,
  discardPendingCandidateTool,
} from './handlers/index.js';
import { ToolHandler } from './types/index.js';

export function setupTool(
  server: Server,
  apiUrl: string,
  apiKey: string,
): void {
  const apiClient = createApiClient(apiUrl, apiKey);

  const tools: ToolHandler[] = [
    createMemoTool,
    searchMemoTool,
    getMemoTool,
    updateMemoTool,
    getCategoriesTool,
    createNoteTool,
    searchNotesTool,
    getNoteTool,
    updateNoteTool,
    listIdeasTool,
    createIdeaTool,
    updateIdeaTool,
    deleteIdeaTool,
    getSkillSheetTool,
    updateSkillSheetBasicInfoTool,
    updateSkillSheetSelfPrTool,
    setSkillSheetSkillsTool,
    upsertSkillSheetProjectTool,
    deleteSkillSheetProjectTool,
    cacheStatusTool,
    syncRemoteMemosTool,
    scanSessionsTool,
    getSessionTranscriptTool,
    addKnowledgeCandidatesTool,
    listPendingCandidatesTool,
    savePendingCandidateTool,
    discardPendingCandidateTool,
  ].map(withToolAnnotations);

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
            text: `未知のツールです: ${request.params.name}`,
          },
        ],
        isError: true,
      };
    }

    return await tool.handler(request.params.arguments, apiClient);
  });

  // リソース一覧を返すハンドラー
  server.setRequestHandler(ListResourcesRequestSchema, async () => ({
    resources: [
      {
        uri: 'paput://tools',
        name: 'PaPut MCP ツール一覧',
        description: '利用可能なPaPut MCPツールの詳細情報',
        mimeType: 'application/json',
      },
    ],
  }));

  // リソースコンテンツを返すハンドラー
  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    if (request.params.uri !== 'paput://tools') {
      return {
        contents: [
          {
            uri: request.params.uri,
            mimeType: 'text/plain',
            text: `リソースが見つかりません: ${request.params.uri}`,
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
      inputSchema,
      annotations: {
        ...tool.definition.annotations,
        readOnlyHint: readOnly,
        destructiveHint: readOnly ? false : destructive,
        idempotentHint: isIdempotentTool(name),
        openWorldHint: false,
      },
    },
  };
}

function isReadOnlyTool(name: string): boolean {
  return (
    name.includes('_get_') ||
    name.includes('_search_') ||
    name.includes('_list_') ||
    name === 'paput_get_categories' ||
    name === 'paput_cache_status' ||
    name === 'paput_scan_sessions'
  );
}

function isDestructiveTool(name: string): boolean {
  return (
    name.includes('_delete_') ||
    name === 'paput_discard_pending_candidate' ||
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
