import { ToolHandler } from '../../types/index.js';
import { handleAddProjectDocument } from './handler.js';

export const addProjectDocumentTool: ToolHandler = {
  definition: {
    name: 'paput_add_project_document',
    description:
      'Save a private project document (design decision, procedure record, or skill candidate) linked to a PaPut skill sheet project. The server deduplicates against active documents of the same kind and returns similar existing documents; if similar procedure records repeat, consider proposing to turn them into a reusable skill. Documents saved here are never exposed publicly.',
    inputSchema: {
      type: 'object',
      properties: {
        skill_sheet_project_id: {
          type: 'number',
          description:
            'Skill sheet project ID (resolve via paput_get_project_context)',
        },
        kind: {
          type: 'string',
          enum: ['design_doc', 'procedure', 'skill_candidate'],
          description:
            'design_doc: design decision with rationale and rejected alternatives; procedure: repeatable work steps; skill_candidate: a proposal to turn repeated procedures into a skill',
        },
        title: {
          type: 'string',
          description: 'Concise, searchable title',
        },
        summary: {
          type: 'string',
          description:
            'One-line summary shown in the document index (keep it short)',
        },
        body: {
          type: 'string',
          description:
            'Markdown body. For design decisions include the decision, reasons, and rejected alternatives.',
        },
        decided_at: {
          type: 'string',
          description: 'Decision date in YYYY-MM-DD format (design_doc only)',
        },
      },
      required: ['skill_sheet_project_id', 'kind', 'title', 'body'],
    },
  },
  handler: handleAddProjectDocument,
};
