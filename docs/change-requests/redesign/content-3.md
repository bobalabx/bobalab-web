# Redesign CONTENT request 3: review delta to request 1 (importer copy table)

> **Status: APPLIED (integration, 2026-10-24)** on top of content-1. See content-1's status.

- File(s): `scripts/import/copy.mjs` (not owned by CONTENT). Apply **after** `content-1.md`.
- Why: the CONTENT review (2026-10-24) changed five passages again after `content-1.md` was
  written. Each is logged in `docs/CONTENT-QUESTIONS.md` § "Redesign copy changes: PI to
  approve" (rows R-2, R-9, R-13, R-14, R-18):
  - R-9: "Newer work … (a preprint) … (a submitted paper) … (in progress)" had no date behind
    "newer" for the "Act, Ask, or Defer?" entry, and the bracketed status tags read like a template.
  - R-14: "Park Sinchaisri carried it out" credited a co-authored PLOS ONE paper to one person.
  - R-2: the About heading "What we study" no longer described its paragraph and sat under
    "Mission: We study…".
  - R-13: varied so two direction pages do not end on the same stock phrase.
  - R-18: the accessibility claim "a plain list alternative with the same information" stopped
    being exact once Fig. 1 began placing papers by year.
- Workaround used: none needed; `content/` already carries the new wording (DECISIONS D-11:
  `content/` is the source of truth and the importer is not run with `--write` again).
- Blocking? No. It only keeps the importer's table from drifting.
- Checked against `tests/unit/wp7/import-lib.test.ts` rules by hand: bodies 80–150 words
  (ai-at-work 117, pricing-experimentation 96, cities-communities 82, counted with the
  validator's `wordCount`); no findings verbs; no "the PI"; the archived bodies do not say
  "archived".
- Test that proves it: `npx vitest run tests/unit/wp7`.
- Proposed change (on top of `content-1.md`):

```diff
--- a/scripts/import/copy.mjs
+++ b/scripts/import/copy.mjs
@@ DIRECTION_BODIES["ai-at-work"]
-Newer work asks where an AI assistant's memory of its user breaks down (a preprint), when an AI agent in a service workflow should act, ask or defer (a submitted paper), and how AI changes which tasks people plan and which they carry out (in progress).
+A second preprint asks where an AI assistant's memory of its user breaks down, and a submitted paper asks when an AI agent in a service workflow should act, ask or defer. Work in progress studies how AI changes which tasks people plan and which they carry out.
@@ DIRECTION_BODIES["pricing-experimentation"]
-Newer work includes a submitted paper on generative-AI simulation for pricing operations, guided by economic mechanisms, and work in progress titled *Experimentation without Experiments*.
+Later work includes a submitted paper on generative-AI simulation for pricing operations, guided by economic mechanisms, and work in progress titled *Experimentation without Experiments*.
@@ DIRECTION_BODIES["cities-communities"]
-The study predates the lab: Park Sinchaisri carried it out during his doctoral studies at the University of Pennsylvania. It is still the lab's only paper in this area, and the lab has no current project on neighborhoods or civic data.
+The study predates the lab: it comes from Park Sinchaisri's doctoral studies at the University of Pennsylvania. It remains the lab's only paper on neighborhoods and civic data, and no current project continues it.
@@ ABOUT.body
-## What we study
+## How we work

-Our projects draw on operations management, behavioral science, economics, computer science and human–computer interaction. Undergraduates join them through UC Berkeley's Undergraduate Research Apprentice Program (URAP), where the lab's projects run under the title "Improving Human-AI Interactions in the Future of Work".
+Our projects draw on operations management, behavioral science, economics, computer science and human–computer interaction. Undergraduates join them through UC Berkeley's Undergraduate Research Apprentice Program (URAP), where our projects run under the title "Improving Human-AI Interactions in the Future of Work".
@@ ACCESSIBILITY.body
-- The research figure on the home page has a plain list alternative with the same information.
+- The research figure on the home page is built on a plain list of the research directions, with each direction's counts and shared papers written out. Every paper it draws is also listed, by year, on the Publications page.
```

R-19 (the Precise or Broad? news summary) comes from the research dataset, not from
`copy.mjs`, so there is nothing to change in the importer for it.
