import { ApiClient } from '../services/api/client.js';

export type ToolResult = Record<string, unknown>;

export interface ToolContext {
  projectMatch?: string;
}

export interface ToolDefinition {
  name: string;
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
