import { ToolHandler } from '../../types/index.js';
import { handleGetPublicProfileContext } from './handler.js';

export const getPublicProfileContextTool: ToolHandler = {
  definition: {
    name: 'paput_get_public_profile_context',
    description:
      'Get the skill sheet, public memos, category map, and growth context so the MCP client AI model can generate a public AI summary (headline, profile summary, strength labels) for the AI Summary tab. Uses public materials only and excludes private dashboard analysis and goals.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  handler: handleGetPublicProfileContext,
};
