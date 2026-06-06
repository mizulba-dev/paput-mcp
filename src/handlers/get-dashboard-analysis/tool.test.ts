import { describe, it } from 'vitest';
import { expectToolDefinition } from '../test-utils.js';
import { getDashboardAnalysisTool } from './tool.js';

describe('getDashboardAnalysisTool', () => {
  it('defines paput_get_dashboard_analysis', () => {
    expectToolDefinition(
      getDashboardAnalysisTool,
      'paput_get_dashboard_analysis',
    );
  });
});
