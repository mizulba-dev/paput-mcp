import { describe, it } from 'vitest';
import { expectToolDefinition } from '../test-utils.js';
import { createNoteTool } from './tool.js';

describe('createNoteTool', () => {
  it('defines paput_create_note', () => {
    expectToolDefinition(createNoteTool, 'paput_create_note');
  });
});
