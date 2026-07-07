## PaPut Project Context Rules

At the start of a session, when the current project is known or can be inferred from the repository or the user's request, call `paput_get_project_context` with the project name. Apply the returned instructions throughout the session.

Before drafting a design decision, implementation plan, or refactor direction, search past decisions and rejected alternatives with `paput_search_project_documents` so you do not re-propose a rejected alternative or contradict a settled decision. Fetch a document body on demand with `paput_get_project_document` only for the results that matter.

This section is the procedure for Check 1 of the PaPut Completion Checklist. When a design decision is settled or a repeatable procedure is completed, save it with `paput_add_project_document` (kind `design_doc` or `procedure`) and report what you saved. For design decisions, include the decision, the reasons, and the rejected alternatives. Do not save repository conventions or anything that belongs in CLAUDE.md / AGENTS.md, and do not save secrets or customer data. Follow the `paput-project-document` skill for the full procedure.

Before calling `paput_update_project_instructions`, always get explicit user approval in the conversation, because instructions are applied to every future session.

When a response from `paput_add_project_document` or `paput_get_project_context` contains a skill proposal, ask the user whether to turn the repeated procedure into a skill. On approval, create the skill first, then call `paput_promote_project_documents` with the proposal and related document IDs. On rejection, call `paput_discard_project_proposal` with the user's reason.
