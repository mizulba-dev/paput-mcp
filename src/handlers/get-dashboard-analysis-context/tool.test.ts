import { describe, it } from 'vitest';
import { expectToolDefinition } from '../test-utils.js';
import { getDashboardAnalysisContextTool } from './tool.js';

describe('getDashboardAnalysisContextTool', () => {
  it('defines paput_get_dashboard_analysis_context', () => {
    expectToolDefinition(
      getDashboardAnalysisContextTool,
      'paput_get_dashboard_analysis_context',
    );
  });
});
