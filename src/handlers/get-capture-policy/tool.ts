import { ToolHandler } from '../../types/index.js';
import { handleGetCapturePolicy } from './handler.js';

export const getCapturePolicyTool: ToolHandler = {
  definition: {
    name: 'paput_get_capture_policy',
    description:
      'Get the local PaPut capture policy document generated from discarded knowledge candidates.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  handler: handleGetCapturePolicy,
};
