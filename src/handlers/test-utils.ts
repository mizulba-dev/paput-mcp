import { expect } from 'vitest';
import type { ToolHandler } from '../types/index.js';

export function expectToolDefinition(
  tool: ToolHandler,
  expectedName: string,
): void {
  expect(tool.definition).toMatchObject({
    name: expectedName,
    inputSchema: {
      type: 'object',
    },
  });
  expect(tool.definition.description.length).toBeGreaterThan(0);
  expect(tool.definition.inputSchema.properties).toBeTypeOf('object');
  expect(tool.handler).toBeTypeOf('function');
}
