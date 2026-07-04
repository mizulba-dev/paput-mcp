---
description: Use this to source, draft, and optionally save the PaPut skill sheet Q&A (FAQ) section from interview questions, public and private memo clusters, and general technical-interview FAQ research. Trigger when the user asks to build, refresh, or add to their FAQ, interview Q&A, or "frequently asked questions" section.
---

# PaPut Interview Q&A

Source candidate questions, draft first-person answers, and save the skill
sheet's Q&A (FAQ) section. Question and answer are user-authored originals,
not AI-generated artifacts: the AI proposes and drafts, the user decides what
gets asked and what gets said.

## Workflow

1. Call `paput_get_skill_sheet` to see the current `faq`, skills, specialties,
   and projects.
2. Source candidate questions from three channels:
   - **User-reported**: ask the user what they have actually been asked in
     real interviews. This is the highest-authenticity source; prioritize it.
   - **Memo-derived**: call `paput_get_categories` to see category
     distribution, then `paput_search_memo` (prefer `memo_type: decision`,
     `operation`, `principle`; private memos are fine as material) to find
     clusters. For each cluster, propose a question the user could answer with
     that evidence.
   - **General interview FAQ**: search the web for common technical interview
     questions, then filter the results to the user's actual skills and
     domains. If web search is not available in the current client, fall back
     to general model knowledge and explicitly label the suggestions as
     "tentative, not web-verified" so the user knows to treat them with more
     skepticism.
3. Present all candidates as proposals. The user decides what to adopt or
   reject. Mention the target size (10-15 items total) and that items can be
   grouped by `theme`.
4. Draft an answer for each adopted question, grounded in related memos
   (public or private) when they exist. A question with no supporting memo can
   still be adopted (a memo is optional evidence, not a requirement), but the
   answer itself is required by the API. Do not save a question with no
   answer: keep it as a pending candidate in the conversation until the user
   has written or approved an answer for it.
5. Save only after explicit user approval. Because
   `paput_update_skill_sheet_faq` is a full replace, first re-fetch the
   current `faq` with `paput_get_skill_sheet`, merge in the approved
   additions or edits, and then call `paput_update_skill_sheet_faq` with the
   complete list. Report any `dropped_ids` from the response.
6. After saving, run the FAQ-to-capture reverse flow: for each saved answer,
   check whether it clears the `paput-capture` quality bar (reusable,
   non-sensitive, not project-specific). If it does, propose it as a pending
   knowledge candidate through the `paput-capture` workflow. This is a
   proposal only, not an automatic save.

## Drafting Guidance

- Write in first person ("I first check X, then...").
- Where the source material supports it, include the rejected alternative and
  why ("I don't do Y here, because...").
- Prefer concrete thresholds, numbers, and procedures over abstractions.
- If a draft drifts into generic, textbook-level advice with no personal
  judgment, rewrite it or say the material is too thin to support a good
  answer yet.
- Preserve the user's own phrasing where they have already said something
  close to the right answer; do not pad it with invented detail.

## Rules

- Do not save automatically. Present drafts and get explicit approval first.
- Both `question` and `answer` are required by `paput_update_skill_sheet_faq`.
  Never call it with an item that has no answer yet; hold unanswered
  candidates in the conversation instead.
- Do not embed a static list of canonical interview questions in this skill.
  Interview trends change (for example, the recent rise of AI-usage
  questions), and a list baked into a plugin release goes stale between
  updates. Always source channel ③ at run time instead.
- `related_memo_ids` are optional. The public API resolves them to
  `related_memos` and silently drops IDs that are not public or not owned by
  the user; report `dropped_ids` from `paput_update_skill_sheet_faq`.
- Maximum 15 FAQ items. Help the user prioritize rather than keeping
  everything.
- Do not invent or embellish an answer beyond what the user's memos or stated
  words support.
