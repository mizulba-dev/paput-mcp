import { ToolHandler } from '../../types/index.js';
import { handleUpdateProjectInstructions } from './handler.js';

export const updateProjectInstructionsTool: ToolHandler = {
  definition: {
    name: 'paput_update_project_instructions',
    description:
      'Overwrite the always-applied private instructions of a PaPut skill sheet project. Instructions are loaded in full at session start, so keep them small (max 8000 characters). Because they affect every future session, ask the user for explicit approval before calling this tool.',
    inputSchema: {
      type: 'object',
      properties: {
        skill_sheet_project_id: {
          type: 'number',
          description:
            'Skill sheet project ID (resolve via paput_get_project_context)',
        },
        body: {
          type: 'string',
          description:
            'Full instructions body in Markdown (overwrites the previous version, max 8000 characters)',
        },
      },
      required: ['skill_sheet_project_id', 'body'],
    },
  },
  handler: handleUpdateProjectInstructions,
};
