import { describe, it } from 'vitest';
import { expectToolDefinition } from '../test-utils.js';
import { getNoteTool } from './tool.js';

describe('getNoteTool', () => {
  it('defines paput_get_note', () => {
    expectToolDefinition(getNoteTool, 'paput_get_note');
  });
});
