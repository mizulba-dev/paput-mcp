import { ApiClient } from '../services/api/client.js';

export type ToolResult = Record<string, unknown>;

export interface ResolvedProjectContext {
  projectId: number;
  projectTitle: string;
  projectAlias: string;
}

export interface ToolContext {
  projectId?: number;
  projectTitle?: string;
  projectAlias?: string;
  // project_alias は handshake でなくツール呼び出し時に解決する契約。
  resolveProject?: () => Promise<ResolvedProjectContext | null>;
}

export interface ToolDefinition {
  name: string;
  title?: string;
  description: string;
  annotations?: {
    title?: string;
    readOnlyHint?: boolean;
    destructiveHint?: boolean;
    idempotentHint?: boolean;
    openWorldHint?: boolean;
  };
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export interface ToolHandler {
  definition: ToolDefinition;
  handler: (
    args: Record<string, unknown> | undefined,
    apiClient: ApiClient,
    context?: ToolContext,
  ) => Promise<ToolResult>;
}
