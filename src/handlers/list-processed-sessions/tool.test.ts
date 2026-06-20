import { describe, expect, it } from 'vitest';
import { expectToolDefinition } from '../test-utils.js';
import { listProcessedSessionsTool } from './tool.js';

describe('listProcessedSessionsTool', () => {
  it('defines paput_list_processed_sessions', () => {
    expectToolDefinition(
      listProcessedSessionsTool,
      'paput_list_processed_sessions',
    );
    expect(
      listProcessedSessionsTool.definition.inputSchema.properties,
    ).toHaveProperty('source');
  });
});
