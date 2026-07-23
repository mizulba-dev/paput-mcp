---
name: paput-skill-sheet-import
description: Use this to build or extend the PaPut skill sheet from sources the user already has — an existing skill-sheet file (Excel / PDF / spreadsheet / text) and/or local repositories. It extracts and merges in the AI client, presents one review manifest, and saves approved values with the existing skill-sheet tools while preserving current data.
---

# PaPut Skill Sheet Import

Build a PaPut skill-sheet foundation from sources the user already has: an
existing skill-sheet file (Excel, PDF, spreadsheet, or plain text) and/or one
or more local repositories. Extraction and analysis happen in the AI client;
PaPut MCP is used only to read the current sheet, resolve categories, and save
approved values.

## Capability check

Judge capabilities, not client names. Decide per source, at the start:

- Local file, shell, and git access (e.g. Claude Code or Codex CLI): every
  source below is available.
- Conversation clients without local file access: only files the user attaches
  (Excel / PDF uploads) and text they paste are available. Repository analysis
  is unavailable — say so explicitly and continue with the remaining sources.

Never reject the whole import because one source is unavailable; exclude that
source, state why, and proceed with the rest.

## Workflow

1. Fetch the current state with `paput_get_skill_sheet`. Note existing basic
   information, skills, and projects. Import adds values and fills gaps; it
   never erases or replaces existing values unless the user explicitly asks
   for a replacement.
2. Ask one inventory question covering all source kinds:
   - existing skill-sheet files: Excel / PDF / spreadsheet / plain text, as a
     local path or an attachment;
   - repositories to analyze: one or more local paths. Do not clone remote
     repositories; when a repository exists only remotely, ask the user to
     clone it first;
   - other free text: resume, career summary, or anything the user pastes.
     Read only what the user names here. Naming a file or repository is the
     consent to read it; there is no separate read-consent gate.
3. Extract from sheet sources. Excel files are not directly readable — convert
   them to tabular text with tooling available in the environment (for
   example, a small script that dumps each worksheet as CSV). When no tooling
   is available, ask the user to re-export the sheet as CSV or PDF. Keep
   conversion intermediates in a temporary directory and delete them when the
   import finishes. Sheet layouts vary; map cells by meaning, never by assumed
   column names or positions.
4. Analyze each named repository. Derive the technology stack from dependency
   and configuration files, the README, and the directory shape. Derive
   project track record — role, period, and scale hints — from `git log`
   restricted to the user's own author identity; confirm the author email or
   name with the user before filtering. Do not read the whole tree; sample the
   key files. Every repository-derived value is an inference: mark it as
   uncertain in the manifest instead of stating it as fact.
5. Merge across sources. Sheet values are self-declared and form the base;
   repository findings add new items and corroborate existing ones. When they
   clearly conflict (for example on a skill level or a project period), list
   both readings in the manifest and let the user choose — do not silently
   pick one.
6. Map extracted skills onto the PaPut schema before presenting them. Resolve
   categories with `paput_get_categories` and use real category IDs only;
   when a skill has no matching category, mark it as unsupported instead of
   inventing an ID. Assign `category_type` (1 language, 2 framework,
   3 database, 4 infrastructure) and `level` (A–E), and show the conversion
   rationale next to each value whose source wording differs (marks such as
   ○/△, or years of use). `years` is required for every skill on save: derive
   it from the source evidence, and when no year information exists, propose
   an estimate marked as uncertain in the manifest instead of omitting it.
7. Prepare one numbered review manifest containing every proposed
   basic-information field, the merged final skill list (existing skills plus
   additions), and each proposed project. State that skills and projects may
   appear on the public skill sheet. Personal basic information (nearest
   station, birth date, gender) is proposed only with explicit per-field
   confirmation, even when the sheet contains it.
8. One batch approval gate. The default review action may be "approve all";
   allow exclusions or corrections by item number. Approval applies only to
   the manifest shown. Do not save an item that was not shown and approved.
9. Save the approved values: `paput_update_skill_sheet_basic_info` for
   approved fields, `paput_set_skill_sheet_skills` for the skill list, and
   `paput_upsert_skill_sheet_project` per project.
   `paput_set_skill_sheet_skills` REPLACES the full list — always pass the
   merged result of the existing skills and the approved additions, never the
   additions alone. Fetch `paput_get_skill_sheet` afterward to verify the
   saved result, including that pre-existing values survived.
10. Offer these follow-ups without running them automatically:
    - `paput-project-episodes` for evidence-backed project judgment stories;
    - `paput-self-pr-draft` for a first-person profile summary;
    - `paput-interview-qa` for the skill-sheet Q&A section.

## Rules

- Read only sources the user named in the inventory step.
- Preserve existing skill-sheet data; import is additive unless the user
  explicitly requests a replacement.
- Do not generate memos or knowledge candidates here — that is the
  `paput-capture` / `paput-harvest` job. Do not draft the self PR, FAQ, or
  project episodes here; their own skills are draft-first follow-ups.
- Mark uncertain or unsupported values instead of inventing them.
- Match the user's language.
