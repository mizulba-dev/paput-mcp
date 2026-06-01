import { describe, it } from 'vitest';
import { expectToolDefinition } from '../test-utils.js';
import { cacheStatusTool } from './tool.js';

describe('cacheStatusTool', () => {
  it('defines paput_cache_status', () => {
    expectToolDefinition(cacheStatusTool, 'paput_cache_status');
  });
});
