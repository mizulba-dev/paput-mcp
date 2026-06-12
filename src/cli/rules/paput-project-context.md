## PaPut Project Context Rules

At the start of a session, when the current project is known or can be inferred from the repository or the user's request, call `paput_get_project_context` with the project name. Apply the returned instructions throughout the session. Use the document index only as a table of contents, and fetch bodies on demand with `paput_get_project_document` instead of reading everything upfront.

When a design decision is settled or a repeatable work procedure is completed during the session, save it with `paput_add_project_document` (kind `design_doc` or `procedure`) and briefly report what was saved. For design decisions, include the decision, the reasons, and the rejected alternatives. Do not save repository conventions or anything that belongs in CLAUDE.md / AGENTS.md, and do not save secrets or customer data.

Before calling `paput_update_project_instructions`, always get explicit user approval in the conversation, because instructions are applied to every future session.

When a response from `paput_add_project_document` or `paput_get_project_context` contains a skill proposal, ask the user whether to turn the repeated procedure into a skill. On approval, create the skill first, then call `paput_promote_project_documents` with the proposal and related document IDs. On rejection, call `paput_discard_project_proposal` with the user's reason.
