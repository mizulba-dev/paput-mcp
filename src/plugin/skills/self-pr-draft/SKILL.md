---
name: paput-self-pr-draft
description: Use this to draft a first-person self PR for the PaPut skill sheet from existing profile, skills, projects, project episodes, achievements, and public decision/operation/principle memos. It presents a draft first and saves only when the user explicitly asks.
---

# PaPut Self PR Draft

Draft the `self_pr` section of the PaPut skill sheet. This skill is draft-first: it does not save unless the user explicitly asks to save, update, or apply the final text.

## Workflow

1. Call `paput_get_skill_sheet`.
2. Review the basic profile, skills, projects, project `episodes`, project `achievements`, and current `self_pr`.
3. Gather additional public memo evidence only when needed:
   - Use `paput_search_memo` with `is_public: true` and `memo_type: decision`, `operation`, or `principle`.
   - Fetch full bodies with `paput_get_memo` only for the memos you actually need.
4. Draft a first-person self PR in the user's language.
5. Present the draft and ask the user to edit or approve it.
6. Do not save unless the user explicitly asks to save, update, or apply it.
7. If the user asks to save, call `paput_update_skill_sheet_self_pr` with the approved text.
8. Verify the saved result with `paput_get_skill_sheet`.

## Drafting Guidance

- Target a recruiter or interviewer reading the skill sheet.
- In Japanese, aim for about 300-600 characters unless the user asks for a different length. Use a comparable short professional length in other languages.
- Write in first person when that fits the user's language and tone.
- Anchor the text in projects, episodes, achievements, and public decision/operation/principle memos.
- Emphasize judgment, trade-offs, and operating practices when the evidence supports them.
- Keep technologies and domains concrete, but do not turn the self PR into a stack inventory.

## Rules

- Do not use private dashboard analysis, goals, or private memos unless the user explicitly provides them in the conversation.
- Do not invent outcomes, metrics, responsibilities, or years of experience.
- Do not present memo counts as proof of ability.
- Do not save automatically.
- If the material is thin, produce a conservative draft and say what evidence would improve it.
