---
name: paput-onboarding
description: Use this to guide a new or partially configured PaPut user through initial knowledge capture, skill-sheet setup, and continuous-capture rule installation with two explicit approval gates.
---

# PaPut Onboarding

Guide the user from an empty or partial PaPut account to an initial set of memos,
a skill-sheet foundation, and continuous-capture rules. Resume safely: inspect the
current state first and skip work that is already complete.

## Workflow

1. Inspect the current state with `paput_get_dashboard_analysis_context` and
   `paput_get_skill_sheet`. Note which of these are already present:
   - reusable memos;
   - basic skill-sheet information;
   - skills;
   - projects.
     Continue only with the missing parts. Do not erase or replace existing data
     merely to make onboarding uniform.
2. **Gate 1 — local-session read consent.** This gate covers only the quick
   harvest source in the next step. Explain that the AI client, not the PaPut
   MCP server, would read local Claude or Codex session files, and ask for
   explicit consent before inspecting any local session file. You may present
   this together with the source choice in the next step and ask for consent
   only when the user wants the quick harvest. If the user declines, or the
   client cannot access local files, only the quick harvest becomes
   unavailable — the other sources in the next step remain on offer.
3. Offer the available foundation sources and let the user pick one or both:
   - **Quick harvest** (requires Gate 1 consent): invoke the `paput-harvest`
     skill restricted to at most the 10 newest unprocessed sessions. Use the
     same read pass both to produce pending memo candidates and to collect
     evidence for a draft of the user's basic information, skills, and
     projects. Do not reproduce the harvest extraction and exclusion rules
     here; follow that skill. Do not inspect older sessions during onboarding.
     At completion, offer the regular `paput-harvest` skill for the remainder.
   - **Skill-sheet import**: when the user has an existing skill-sheet file
     (Excel / PDF / spreadsheet / text) or local repositories to analyze,
     invoke the `paput-skill-sheet-import` skill for its inventory,
     extraction, and merge steps, but feed its proposed values into the
     single Gate 2 manifest below instead of running its own approval gate.
     This source does not require Gate 1; naming a file or repository there is
     the consent to read it.
     When neither source is available or wanted, build the foundation only
     from information the user provides in the current conversation.
4. Prepare one numbered review manifest containing both:
   - each pending memo candidate, including title, categories, memo types,
     proposed public/private visibility, and proposed project link when one is
     supported;
   - each proposed basic-information field, skill, and project for the
     skill-sheet foundation.
     Mark uncertain or unsupported values instead of inventing them. Make clear
     that public memos need the correct project link to support later project
     episodes.
5. **Gate 2 — one batch review before saving.** Present the complete manifest
   and ask the user to approve it. The default review action may be "approve all";
   allow exclusions or corrections by item number. Approval applies only to the
   manifest shown. Do not save an item that was not shown or approved.
6. Save the approved memo candidates by invoking the `paput-save` skill and
   following its explicit-approval rules. Save the separately approved
   skill-sheet foundation with `paput_update_skill_sheet_basic_info`,
   `paput_set_skill_sheet_skills`, and `paput_upsert_skill_sheet_project` as
   needed. Preserve existing data that the manifest did not propose changing.
   Fetch `paput_get_skill_sheet` afterward to verify the saved foundation.
7. Propose installing the PaPut continuous-capture rules with:

   ```bash
   npx -y paput-mcp setup-ai
   ```

   Run it only after the user agrees. If PaPut skills already come from an
   installed plugin, use `npx -y paput-mcp setup-ai --rules-only` so the command
   adds the global rules without creating a second skill installation. Explain
   that these rules make the PaPut completion checks and reusable-knowledge
   capture run in future work sessions.

8. Resolve the public profile URL before presenting it:
   - When an owned memo ID is available from the quick harvest, the save result,
     or the current-state lookup, call `paput_get_memo` with that ID and read the
     PaPut user ID from `structuredContent.memo.user.user_id`. Construct the
     profile URL as `https://paput.io/account/<user_id>`.
   - When there is no memo to query, or the user ID is unavailable, ask the user
     for their PaPut user ID or the public account URL shown in PaPut. Construct
     the same `/account/<user_id>` URL when they provide an ID. Do not infer an
     ID from a name, email address, skill-sheet ID, or access token. Ask the user
     to confirm the URL if they provide one directly.
9. Finish by presenting the resolved or user-confirmed public PaPut profile URL
   and a concise summary of what was created. Offer these next steps without
   running them automatically:
   - `paput-project-episodes` for evidence-backed project judgment stories;
   - `paput-self-pr-draft` for a first-person profile summary;
   - `paput-dashboard-analysis` for an assessment of current strengths and gaps;
   - `paput-harvest` for unprocessed sessions beyond the quick-path limit.

## Rules

- Keep both approval gates explicit. Consent to local reading is not consent to
  save, and manifest approval is not consent to install global rules.
- Never read local sessions before Gate 1 or save before Gate 2.
- Never review more than 10 sessions in the onboarding quick harvest.
- Keep memo saving routed through pending candidates and `paput-save`.
- Do not include project episodes or a self PR in the Gate 2 manifest; their own
  skills are draft-first follow-up workflows.
- Match the user's language and keep the process resumable when only memos or
  only the skill sheet is missing.
