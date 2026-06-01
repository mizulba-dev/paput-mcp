import { describe, it } from 'vitest';
import { expectToolDefinition } from '../test-utils.js';
import { scanSessionsTool } from './tool.js';

describe('scanSessionsTool', () => {
  it('defines paput_scan_sessions', () => {
    expectToolDefinition(scanSessionsTool, 'paput_scan_sessions');
  });
});
