import { describe, expect, it } from 'vitest';
import { expectToolDefinition } from '../test-utils.js';
import { markProcessedSessionTool } from './tool.js';

describe('markProcessedSessionTool', () => {
  it('defines paput_mark_processed_session', () => {
    expectToolDefinition(
      markProcessedSessionTool,
      'paput_mark_processed_session',
    );
    expect(markProcessedSessionTool.definition.inputSchema.required).toEqual([
      'source',
      'session_id',
    ]);
  });
});
