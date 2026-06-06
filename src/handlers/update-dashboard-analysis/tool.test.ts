import { describe, it } from 'vitest';
import { expectToolDefinition } from '../test-utils.js';
import { updateDashboardAnalysisTool } from './tool.js';

describe('updateDashboardAnalysisTool', () => {
  it('defines paput_update_dashboard_analysis', () => {
    expectToolDefinition(
      updateDashboardAnalysisTool,
      'paput_update_dashboard_analysis',
    );
  });
});
