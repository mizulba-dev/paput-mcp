import { describe, expect, it, vi } from 'vitest';
import type { ApiClient } from './client.js';
import {
  addProjectDocument,
  discardProjectProposal,
  getProjectContext,
  getProjectDocument,
  promoteProjectDocuments,
  updateProjectInstructions,
} from './project-context.js';

function createMockClient(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    get: vi.fn().mockResolvedValue({}),
    post: vi.fn().mockResolvedValue({}),
    put: vi.fn().mockResolvedValue({ success: true }),
    delete: vi.fn().mockResolvedValue({}),
    ...overrides,
  } as unknown as ApiClient;
}

describe('project context API service', () => {
  it('URL-encodes the project name for getProjectContext', async () => {
    const client = createMockClient();

    await getProjectContext(client, 'paput 開発');

    expect(client.get).toHaveBeenCalledWith(
      '/api/v1/mcp/project-context?project=paput+%E9%96%8B%E7%99%BA',
    );
  });

  it('uses the document id in the GET endpoint', async () => {
    const client = createMockClient();

    await getProjectDocument(client, 7);

    expect(client.get).toHaveBeenCalledWith('/api/v1/mcp/project-document/7');
  });

  it('posts a new project document', async () => {
    const client = createMockClient();
    const params = {
      skill_sheet_project_id: 1,
      kind: 'design_doc',
      title: 'Decision',
      body: 'Body',
    };

    await addProjectDocument(client, params);

    expect(client.post).toHaveBeenCalledWith(
      '/api/v1/mcp/project-document',
      params,
    );
  });

  it('puts project instructions', async () => {
    const client = createMockClient();

    await updateProjectInstructions(client, {
      skill_sheet_project_id: 1,
      body: 'Instructions',
    });

    expect(client.put).toHaveBeenCalledWith(
      '/api/v1/mcp/project-instructions',
      { skill_sheet_project_id: 1, body: 'Instructions' },
    );
  });

  it('puts a proposal discard with its reason', async () => {
    const client = createMockClient();

    await discardProjectProposal(client, { id: 3, reason: 'duplicate' });

    expect(client.put).toHaveBeenCalledWith(
      '/api/v1/mcp/project-proposal/discard',
      { id: 3, reason: 'duplicate' },
    );
  });

  it('puts a promotion request for documents', async () => {
    const client = createMockClient();

    await promoteProjectDocuments(client, {
      ids: [1, 2],
      promoted_to: 'skill',
    });

    expect(client.put).toHaveBeenCalledWith(
      '/api/v1/mcp/project-documents/promote',
      { ids: [1, 2], promoted_to: 'skill' },
    );
  });
});
