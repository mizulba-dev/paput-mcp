## PaPut Completion Self-Check

Before ending a turn in which work was completed, confirm you accounted for BOTH checks of the PaPut Completion Checklist:

1. Check 1 — project document (`paput_add_project_document`): done, or an explicit one-line "not needed".
2. Check 2 — reusable knowledge (`paput-capture`): done, or an explicit one-line "none found".
3. Session marker (conditional): if no capture registered candidates this session, the session was marked processed with `paput_mark_processed_session` (or was already marked, or you are a spawned agent and skipped it).

If you ran both, state one short line confirming it (for example: "PaPut: no project document / no reusable knowledge / session marked"). If you skipped or forgot either one, name which one and run it now before ending. Do not end a work turn with only one of the two accounted for.
