# WP5 request 8: content gaps the Join and News templates can already show

- File(s): `content/pages/join.yml`, `content/opportunities/urap.md`, `content/news/*.md` (talk items) (WP7; lab answers where marked)
- Why: found in the WP5 adversarial review (2026-10-20). The templates render these fields as soon as content has them; today they are missing or typed in a way that reads badly.
  1. **Join, partners (brief §D11):** "collaboration types and a data-handling statement written by the PI". `join.yml` has no `data_statement`, so the "How we handle data" panel is hidden. Lab decision (PI text); add to `docs/CONTENT-QUESTIONS.md`.
  2. **Join, students (brief §D11):** "what to send" (CV, transcript, interests…) is not stated anywhere. Lab decision; one sentence in `join.yml → students` or in the opportunity bodies.
  3. **`opportunities/urap.md → route`** uses an ASCII hyphen as a dash ("Program - apply to") and "9-11 hours". On `/join/` the card wraps so a line starts with "- apply". Suggested:
     ```diff
     -route: UC Berkeley Undergraduate Research Apprentice Program - apply to one of the lab's four project tracks (…). About 9-11 hours a week; remote possible.
     +route: UC Berkeley Undergraduate Research Apprentice Program. Apply to one of the lab's four project tracks (…). About 9–11 hours a week; remote possible.
     ```
  4. **Talk news items have no `event_date` / `location`**, although their summaries give the date, so the "Event: …" line, the event box on the item page and the computed "Upcoming talks" block (brief §D10) never show. Dates stated in the summaries (verify against the source before adding):
     - `2023-08-30-nasa-symposium.md`: September 22, 2023, NASA Ames
     - `2023-10-07-mit-ide-seminar.md`: November 15, 2023, MIT Initiative on the Digital Economy
     - `2023-12-31-stanford-seminar.md`: March 6, 2024, Stanford GSB
     - `2025-10-20-cscw-bergen.md`: October 20–21, 2025, Bergen (use the first day)
     - `2026-05-08-msom-three-papers.md`: July 13–14, 2026, Harvard Business School (use the first day)
       Example:
     ```diff
      type: talk
      title: MIT IDE seminar on human-AI decision-making
     +event_date: "2023-11-15"
     +location: MIT Initiative on the Digital Economy, Cambridge, MA
     ```
     Future talks then appear under "Upcoming talks" on `/news/` automatically until the day after `event_date`.
- Blocking? no (sections are hidden or render the text as typed).
- Test that proves it: `npm run validate` stays at 0 errors; `tests/e2e/news.spec.ts` checks every item's event line and full dates; `/join/` shows the partners data panel once `data_statement` is set (`tests/e2e/pages.spec.ts` "Join › three audiences…").

Status: Applied in integration commit "integration: apply change requests" (2026-10-20): item 3 (URAP route text) and item 4 (`event_date`/`location` on the five talk items, dates taken from the items' own summaries; flagged for confirmation in CONTENT-QUESTIONS F5). Items 1 and 2 are lab decisions, tracked as CONTENT-QUESTIONS G7 and G8.
