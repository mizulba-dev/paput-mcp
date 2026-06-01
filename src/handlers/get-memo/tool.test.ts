import { describe, it } from 'vitest';
import { expectToolDefinition } from '../test-utils.js';
import { getMemoTool } from './tool.js';

describe('getMemoTool', () => {
  it('defines paput_get_memo', () => {
    expectToolDefinition(getMemoTool, 'paput_get_memo');
  });
});
