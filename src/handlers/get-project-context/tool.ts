import { ToolHandler } from '../../types/index.js';
import { handleGetProjectContext } from './handler.js';

export const getProjectContextTool: ToolHandler = {
  definition: {
    name: 'paput_get_project_context',
    description:
      'Get the private project context (always-applied instructions, pending skill proposals, and document counts by kind) for a PaPut skill sheet project, resolved from the MCP URL project_alias or a fuzzy project name. Call this at session start when working on a known project. Before drafting a design decision, implementation plan, or refactor, search past decisions and rejected alternatives with paput_search_project_documents.',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description:
            'Project name to resolve (partial match allowed). Required only when no MCP project_alias is configured.',
        },
      },
    },
  },
  handler: handleGetProjectContext,
};
