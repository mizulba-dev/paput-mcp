import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { createApiClient, type ApiClient } from './services/api/index.js';
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
  getSkillSheetSkillsTool,
  updateSkillSheetSkillsTool,
  addSkillSheetSkillTool,
  updateSkillSheetSkillTool,
  deleteSkillSheetSkillTool,
  getSkillSheetProjectsTool,
  addSkillSheetProjectTool,
  updateSkillSheetProjectTool,
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
    getSkillSheetSkillsTool,
    updateSkillSheetSkillsTool,
    addSkillSheetSkillTool,
    updateSkillSheetSkillTool,
    deleteSkillSheetSkillTool,
    getSkillSheetProjectsTool,
    addSkillSheetProjectTool,
    updateSkillSheetProjectTool,
    deleteSkillSheetProjectTool,
    cacheStatusTool,
    syncRemoteMemosTool,
    scanSessionsTool,
    getSessionTranscriptTool,
    addKnowledgeCandidatesTool,
    listPendingCandidatesTool,
    savePendingCandidateTool,
    discardPendingCandidateTool,
  ];

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
