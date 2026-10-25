# Redesign CONTENT request 1: keep the importer's drafted copy in step with content/

> **Status: APPLIED (integration, 2026-10-24),** together with content-3 and pages-2. `scripts/import/copy.mjs` now matches `content/` exactly for every direction body and the home, about, join and accessibility fields (checked by script); `_emphasis_` follows prettier's form. `tests/unit/wp7` passes.

- File(s): `scripts/import/copy.mjs`, `scripts/import/import-dataset.mjs` (not owned by CONTENT)
- Why: D-13 item 7 (copy cleanup). CONTENT rewrote the machine-voiced passages in
  `content/directions/*.md`, `content/pages/{home,about,join,accessibility}.yml` and the URAP
  route in `content/opportunities/urap.md` (every passage, before and after, is in
  `docs/CONTENT-QUESTIONS.md` § "Redesign copy changes: PI to approve"). The importer's own
  copy table still holds the old wording, so re-running `node scripts/import/import-dataset.mjs`
  would put "listed by title only", "This direction collects…", "BOBALAB studies…" and the
  "pause button on the figure" sentence (no longer true after D-13 item 6) back into content/.
- Workaround used: none needed; content/ is already rewritten. Nothing reads copy.mjs at build time.
- Blocking? No. It only matters if the importer is run again.
- Checked against the importer's own rules in `tests/unit/wp7/import-lib.test.ts` (by hand,
  not by editing the file): every direction body is 80 to 150 words (ai-at-work 112,
  algorithmic-advice 108, learning-on-the-job 115, platform-work 114, pricing-experimentation 94,
  cities-communities 88); no findings verbs; no "the PI"; American spelling; the archived bodies
  do not say "archived"; About names OITM once; `JOIN.intro` has no "journalist" or "industry";
  the mission is 186 characters (limit 240).
- Test that proves it: `npx vitest run tests/unit/wp7/import-lib.test.ts`; then a dry import
  diff against content/ shows no copy changes for these fields.
- Proposed change (exact patch):

```diff
--- a/scripts/import/copy.mjs
+++ b/scripts/import/copy.mjs
@@ -43,44 +43,36 @@
 /** Direction bodies: 80–150 words, describing what the listed papers study (no findings). */
 export const DIRECTION_BODIES = {
   "algorithmic-advice": `
-This direction gathers the lab's work on how algorithms should advise people who make a series of connected decisions.
-
 A published study develops a reinforcement-learning method that reads logs of people's step-by-step choices and condenses the costliest gap from a strong policy into one short tip, then tests the tips with participants in a virtual-kitchen game. A working paper compares two ways of phrasing advice, an exact next action or a broader rule of thumb, in experiments on electric-vehicle charging routes, and asks how each shapes what people do once the advice is taken away. A second working paper looks at why people in the virtual-kitchen task pass over tips that are known to be good.

-Work in progress on compliance-aware reinforcement learning is listed by title only; no public draft exists yet.
+Work in progress develops compliance-aware reinforcement learning for managing human agents.
 `,
   "ai-at-work": `
-This direction collects studies of generative and agentic AI in professional work.
-
 A published study follows K-12 teachers as they use ChatGPT on their own tasks and sorts the kinds of help they ask for. A working paper treats lesson preparation as a choice among tasks and draws on a year-long case study of teachers to examine how generative AI changes their productivity. A game-theoretic preprint models a professional advisor whose clients can also consult a personal AI.

-Three further items are listed by title only, because no abstract has been reviewed yet: a preprint on where an AI assistant's memory of its user breaks down, a submitted paper on when an AI agent in a service workflow should act, ask or defer, and work in progress on how AI changes which tasks people plan and which they carry out.
+Newer work asks where an AI assistant's memory of its user breaks down (a preprint), when an AI agent in a service workflow should act, ask or defer (a submitted paper), and how AI changes which tasks people plan and which they carry out (in progress).
 `,
   "learning-on-the-job": `
-This direction asks how people build skill while they work alongside algorithms, so far mostly on gig and delivery platforms.
+So far most of this work comes from gig and delivery platforms. A published study uses more than a million delivery orders to follow how couriers' speed and punctuality change with experience, and how their use of the app's job recommendations shifts as they gain it. A working paper studies how a platform should offer jobs when workers can turn offers down and get better at the work at different rates that the platform cannot see in advance; it proposes learning algorithms and tests them on delivery-platform data.

-A published study uses more than a million delivery orders to follow how couriers' speed and punctuality change with experience, and how their use of the app's job recommendations shifts as they gain it. A working paper studies how a platform should offer jobs when workers can turn offers down and get better at the work at different rates that the platform cannot see in advance; it proposes learning algorithms and tests them on delivery-platform data.
-
-Two related items are listed by title only until the lab describes them: a second working paper on SSRN, Dispatching to Develop, and work in progress on whether skill learned in one job carries over to another.
+Newer work includes a second working paper on SSRN, *Dispatching to Develop*, and work in progress on whether skill learned in one job carries over to another.
 `,
   "platform-work": `
-This direction studies when flexible workers choose to work and how platforms pay, motivate and staff them.
-
 A published study uses ride-hailing data to model drivers' decisions to start and stop working, looking at pay alongside habits such as earnings targets and the momentum of a long shift. A working paper combines one platform's records with public New York City trip data to estimate how drivers split their time between competing apps, and uses the estimates to compare pay designs such as hourly guarantees, streak bonuses and wage floors.

-Two works in progress are listed by title only: one on designing and sequencing incentives for platform workers, and one on staffing fluid teams in a fragmented labor market. Park Sinchaisri's doctoral dissertation on managing the gig economy is also filed here.
+Work in progress looks at designing and sequencing incentives for platform workers, and at staffing fluid teams in a fragmented labor market. Park Sinchaisri's 2021 doctoral dissertation at the University of Pennsylvania, on managing the gig economy, belongs to this line too.
 `,
   // Archived directions: the template's "Archived" badge and notice already say
   // so, so the body starts with the research itself (VIS-13).
   "pricing-experimentation": `
 A working paper models shoppers who read a higher price as a sign of higher quality and who react to the size of a discount compared with what they expected. It builds this behavior into a retailer's markdown plan and calibrates the model with a consumer study. The paper grew out of Park Sinchaisri's 2016 MIT master's thesis on pricing with quality perception, which pairs a model with an experiment.

-Two further items are listed by title only, since no public drafts exist yet: a submitted paper on generative-AI simulation for pricing operations, guided by economic mechanisms, and work in progress titled Experimentation without Experiments.
+Newer work includes a submitted paper on generative-AI simulation for pricing operations, guided by economic mechanisms, and work in progress titled *Experimentation without Experiments*.
 `,
   "cities-communities": `
 A paper published in PLOS ONE in 2021 uses block-party permits issued in Philadelphia to build two measures of neighborhood vibrancy: how many gatherings a neighborhood holds, and what share of them are spontaneous. It then relates these measures to crime across the city's neighborhoods over time.

-The study predates the lab; it was carried out during Park Sinchaisri's doctoral studies at the University of Pennsylvania. It is filed here so that the paper has a home on the site. New work in this area, if the lab takes it up again, would be listed on this page.
+The study predates the lab: Park Sinchaisri carried it out during his doctoral studies at the University of Pennsylvania. It is still the lab's only paper in this area, and the lab has no current project on neighborhoods or civic data.
 `,
 };

@@ -95,7 +87,7 @@
   // Paraphrase of the lab's URAP framing ("Improving Human-AI Interactions in the
   // Future of Work") and its URAP description. PI to rewrite or approve (brief §D3).
   mission:
-    "BOBALAB studies how people learn, decide and work alongside algorithms and AI, to help improve human–AI interaction in the future of work.",
+    "We study how people learn, decide and work alongside algorithms and AI, with field data from gig platforms and controlled experiments, to improve human–AI interaction in the future of work.",
   featured_findings: [],
   draft: true,
 };
@@ -107,11 +99,11 @@
   body: `
 ## What we study

-The lab studies how people learn, decide and get work done alongside algorithms and AI. Its projects draw on operations management, behavioral science, economics, computer science and human–computer interaction. The lab's undergraduate research projects run under the title "Improving Human-AI Interactions in the Future of Work" in UC Berkeley's Undergraduate Research Apprentice Program (URAP).
+Our projects draw on operations management, behavioral science, economics, computer science and human–computer interaction. Undergraduates join them through UC Berkeley's Undergraduate Research Apprentice Program (URAP), where the lab's projects run under the title "Improving Human-AI Interactions in the Future of Work".

 ## Principal investigator

-Park Sinchaisri is an Assistant Professor in the Operations & Information Technology Management (OITM) group at Berkeley Haas, where he has been on the faculty since 2021.
+Park Sinchaisri is an Assistant Professor in the Operations & Information Technology Management (OITM) group at Berkeley Haas. He joined the faculty in 2021.
 `,
   // WP5 request 3: the PI links and the contact list are not repeated here; the
   // About fact sheet renders them from site.yml and the PI's person record.
@@ -120,21 +112,21 @@

 export const JOIN = {
   // CON-14: no claim of work with journalists or industry partners (none is documented).
-  intro: `BOBALAB welcomes Berkeley students, research collaborators and press inquiries. One address reaches the lab: ${MAILTO}.`,
+  intro: `Students, collaborators and the press can all reach the lab at one address: ${MAILTO}.`,
   students: `
-Undergraduates join through UC Berkeley's [Undergraduate Research Apprentice Program (URAP)](${URAP_LIST}). The lab offers four tracks:
+Undergraduates join through UC Berkeley's [Undergraduate Research Apprentice Program (URAP)](${URAP_LIST}), in one of four tracks:

 - Mathematical modeling and theory
 - Experimental systems and game building
 - Research generalist and research operations
 - Data science, econometrics and algorithms

-Apprentices commit about 9–11 hours a week, and remote work is possible.
+Apprentices work about 9–11 hours a week, and remote work is possible.

 Check the [URAP listing](${URAP_LIST}) for the current term, or email ${MAILTO}.
 `,
   // WP5 request 4: the open/closed status lives in opportunities/urap.md only.
-  partners: `The lab welcomes academic and industry collaborators. To talk about a project, email ${MAILTO}.`,
+  partners: `We welcome academic and industry collaborators. To talk about a project, email ${MAILTO}.`,
   press: `For media requests, email ${MAILTO}.`,
   draft: true,
 };
@@ -145,13 +137,13 @@
   body: `
 ## Our target

-This site aims to conform to the Web Content Accessibility Guidelines (WCAG) 2.2 at level AA.
+We aim for this site to meet the Web Content Accessibility Guidelines (WCAG) 2.2 at level AA.

 ## How the site is built

 - Every page works without JavaScript and with a keyboard alone.
 - The research figure on the home page has a plain list alternative with the same information.
-- Motion is gentle and optional. The site follows your device's reduced-motion setting, and the "Reduce motion" control in the footer, or the pause button on the figure, turns animation off.
+- Motion is brief and optional: nothing moves in a loop. The site follows your device's reduced-motion setting, and the "Reduce motion" switch in the footer turns animation off.
 - Color is never the only way information is shown, and text meets contrast requirements in light and dark mode.
 - Images have text alternatives.

```

And for the URAP route (`scripts/import/import-dataset.mjs`, opportunity mapping, about line 686):

```diff
--- a/scripts/import/import-dataset.mjs
+++ b/scripts/import/import-dataset.mjs
@@
     audience: "students",
     status: "closed",
-    // WP5 request 8 item 3: the ASCII " - " separator wrapped to a line starting "- apply".
-    route: (r) => r.replace(/ Program - apply to/, " Program. Apply to"),
+    // Redesign CONTENT request 1: the same facts as the dataset route, in plain sentences.
+    route: () =>
+      "Apply through URAP to one of four tracks: mathematical modeling and theory; experimental systems and game building; research generalist and research operations; or data science, econometrics and algorithms. About 9–11 hours a week; remote work is possible.",
   },
```
