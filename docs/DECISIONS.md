# BOBALAB website: decision log

This file records the decisions that bind the build. Each entry gives the decision, why it was made, and how to roll it back. `docs/research/research-brief.md` (the brief) is the design and build spec. Where this file and the brief disagree, **this file wins**. The research reports behind the brief are in `docs/research/` (R3–R6). The content research (R1/R2, the dataset and the audit) stays outside the repo because it mentions people who are not on the public roster. WP7 turns it into `docs/CONTENT-AUDIT.md` and `docs/CONTENT-QUESTIONS.md`.

Labels: DOCUMENTED (primary source), MEASURED (we ran it), HYPOTHESIS, UNKNOWN.

---

## D-01 Working tree stays in OneDrive (owner's choice, 2026-10-20)
- **Decision:** the checkout stays at `C:\Users\jiami\OneDrive\Desktop\Claude\bobalab-website`. The git object store is outside OneDrive at `C:\Users\jiami\src\bobalab-website.git` (`.git` is a gitdir file).
- **Why:** the owner chose this over moving it out. The brief's H-17 recommended moving it. MEASURED: `npm install` took about 35 s with no EPERM.
- **Rules that follow:**
  - Never run two `next dev` or `next build` processes in this tree at the same time; they share `.next/`.
  - During parallel phases the orchestrator runs ONE shared dev server at `http://localhost:3100`. Agents use it and must not start their own `next dev` or run `next build`.
  - If a file lock (EPERM/EBUSY) occurs, wait and retry. Never delete user files to work around it.
- **Rollback:** move the folder. The `.git` gitdir file points at an absolute path, so it keeps working.

## D-02 Motion: keep "alive but calm" (overrides brief §E3 row "None in v1")
- **Decision:** the owner explicitly asked for a site that is *unique and animated*. The critique in R5 removed nearly all motion, so we restore motion with personality, gated:
  1. **Intro "settle":** on the first home visit per session, the pearl groups drop in and settle (the brief's values).
  2. **Idle float:** each direction pearl group bobs gently (translateY within ±3 px, periods 7–11 s, desynchronised, CSS keyframes on ≤ 8 wrappers, transform only). It pauses when the figure is off-screen (IntersectionObserver) and when the document is hidden. WCAG 2.2.2 is met by a visible **Pause/Play motion** button inside the plate, which writes the same preference as the footer "Reduce motion" toggle.
  3. **Pointer buoyancy:** fine pointers only (`(hover: hover) and (pointer: fine)`). Pearls lean up to 4 px toward the pointer, with rAF only while the pointer moves inside the plate. No loop otherwise.
  4. **Seed bloom on hover/focus:** that direction's seed dots spread outward (+10–15 % ring radius, staggered 20 ms) and settle back.
  5. **Morph** pearl → direction header via React `<ViewTransition>` (brief §E5).
  - With `prefers-reduced-motion: reduce` or the toggle set, all of the above are off (brief §E7).
- **Limits:** transform/opacity only; no SVG filters; figure client JS ≤ 4 KB gz; nothing auto-moves without the pause control.
- The exact personality is chosen by the prototype judge (workflow 1) and recorded here as D-02a.

## D-02a Chosen hero: hybrid "c-expressive + b-living" (2026-10-20)
- **Judge scores (weighted /50):** a-calm 37, b-living 39, c-expressive 41. The orchestrator reviewed the screenshots and agrees. Evidence: `docs/design/JUDGE.md`, `docs/design/prototypes/*`, `docs/design/shots/*`.
- **WP1 implements the judge's hybrid exactly as specified in `docs/design/JUDGE.md`** ("Recommendation", "parameters" and the visual-fix checklist):
  - From c: structure, the halo per direction, the intro (sink → halo bloom → seed spread), the destination re-bloom, and a hero wide enough for figure mode.
  - From b: the hairline orbit that seeds sit on, and the caption with a coloured left rule.
  - From a: the site-header view-transition group.
  - **Removed:** c's plate wash (or cap it at a 12% flat tint), the continuous seed orbit (replaced by a bounded ±14° "stir"), and b's inset bezel.
  - **Mobile:** list mode gets halos and a one-shot intro.
- Layout note (MEASURED by prototypes): the brief's 5/12 + 7/12 hero inside 72rem never reaches the 46em container width figure mode needs. Use a wider hero (about 84rem), or stack identity above the figure below about 75rem.
- Hit-area note (b-living): with overlapping rows, only the pearl, label and count are clickable, never the whole grid cell.
- **Rollback:** delete the idle/buoyancy CSS and JS. The brief's calm spec remains valid.

## D-03 Draft, preview and production modes (resolves critic blocker "0 directions")
- Every collection has `draft: boolean`.
  - **Production** build (`npm run build`) excludes drafts.
  - **Preview** (`npm run dev`, and `npm run build:preview`, which sets `INCLUDE_DRAFTS=1`) includes drafts. Each draft item shows a small "Draft · pending lab review" badge, and every page shows a slim preview ribbon.
- `content/site.yml` → `launched: false`. While `launched` is false, the "0 non-draft directions" rule is a **warning**, and the production home shows "Research directions coming soon". After launch it is an error.
- Content that research could not verify is imported with `draft: true`. Nothing is published until the lab flips it.
- **Cross-reference (editor v2, D-17/D-18):** the content manager's live column renders with the **production** rules (`preview: false`): other drafts, unlisted people and switched-off profile pages are left out, as on the live site. Only the entry being edited is drawn while its Draft is on (with a note), unless "Show as visitors see it" is ticked. The preview builds of this decision are unchanged.

## D-04 Default taxonomy (pending PI decision H-1)
- The 4 core directions come from S1 (content audit §7), in this order and these colours: `algorithmic-advice` (Butterfly pea), `ai-at-work` (Lychee), `learning-on-the-job` (Matcha), `platform-work` (Oolong). All are `draft: true`.
- `pricing-experimentation` (Jasmine) and `cities-communities` (Black sesame) are imported with `status: archived` (and `draft: true`). Archived directions are not in Fig. 1. They keep a page with a dated "Archived" note and are listed under "Earlier and related research" on `/research/`.
- **Order lives in `content/site.yml` → `direction_order`** (a reorderable list in the CMS), not in per-file `order` numbers. This fixes the critic's editorial-workflow deadlock. The validator requires each live direction exactly once, and missing ones are appended with a warning.

## D-05 Content model additions (critic gaps)
- **Opportunities** folder collection: title, audience (students/partners/phd-postdoc/press), route, url, apply_url, email, status (open/closed/rolling/unknown), as_of, closes_on, directions, body. The "Open to RAs" badge and the home "Work with us" block derive from open items.
- **External coauthors are not people.** A publication's `authors[]` = {name, person? (slug of a lab person), url?}. People records exist only for the PI, lab members and alumni. Nobody becomes an "affiliate" without consent.
- **Archive and redirects:** `status: archived` on directions and projects. `site.yml` → `redirects[] {from, to}` emits static meta-refresh stubs with `rel=canonical`. The validator requires a redirect when a published slug disappears (best effort: compare against `content/.published-slugs.json`, which the build updates).
- **Publication counting rule:** a publication counts toward seeds and the main list only if it has a public version (DOI, SSRN, arXiv, PDF or publisher link) or a documented conference presentation. `type: work-in-progress` items without one appear only as "In progress" on project and direction pages, plus a collapsed "Work in progress" section on `/publications/`.
- **Slugs (permanent URLs):** publications `{first-author-lastname}-{year}-{short-title}` (kebab, ≤ 60 chars); news `yyyy-mm-dd-{slug}`; people `{first}-{last}`; directions and projects kebab-case.
- **Amendment (editor v2, 2026-10-26, default; owner to confirm, see D-17 open question 1):** the redirect rule applies only when a published entry is **gone**. An entry that still exists but is hidden now (Draft on, Listed off, Profile page off) needs no redirect: the validator emits the warning **W_PUBLISHED_HIDDEN** on the entry's own file ("/x/ was on the live site and is now hidden; visitors get “Page not found” there.") instead of the error E_REDIRECT_MISSING, because a hidden entry can come back and hiding is the lab's privacy action. The validator also gains **E_LINK_HIDDEN** (export-check's hidden-link rule, moved into `validateContent`): a publicly rendered entry may not link to a page that is not on the live site. Code: `src/lib/content/validate.ts`, `src/lib/content/links.ts`; tests: `tests/content/rules.test.ts`, `tests/unit/content-rules/`.

## D-06 People and privacy
- Import the **visible** roster and alumni from the PI site (single public source) as `draft: true`, `listed: true`, `photo_consent: false`, `email_public: false`, `now_at_public: false`. The production build therefore shows only the PI until consent (H-11). Never import the commented-out "hidden" roster cards. A hashed-name test guards this (brief WP7 #6).
- No photos are downloaded. Pearl-initial avatars are used instead.
- **Before the repo is pushed anywhere public, the lab decides H-5/H-11**, because drafts in a public repo are publicly readable.

## D-07 Windows static export
- Next issue #85374 (prefetch files written under backslash paths on Windows; MEASURED present in 16.4.2 as nested `__next.*` folders, WP8 browser probe 2026-10-20) is handled two ways. CI deploys build on `ubuntu-latest`. Locally, `scripts/fix-win-export.mjs` runs after `next build` on win32 and repairs the output; WP8 verifies it by serving `out/` and checking for 404s.

## D-08 Stack
- As in brief §F1: Next 16.4.2 static export, React 19.3.1, TS 6.0.3, Tailwind 4.3.3 via `@tailwindcss/postcss`, Markdoc, zod, yaml, MiniSearch, citation-js, Decap CMS 3.17.1 (vendored), Playwright plus axe, Vitest, ESLint 10, Prettier. No motion library and no d3.
- `cacheComponents`, `partialPrefetching` and `@tailwindcss/turbopack` are removed (H-13).

## D-09 CMS body widget: keep `richtext` with the load-time wrapper (integration, 2026-10-20; WP6 request 3)
- **Decision:** option A. Body fields keep Decap's `richtext` widget (brief §F3, WP6 acceptance #3). `public/admin/cms-widgets.js` wraps it so an entry no longer shows "Unsaved changes" when it is only opened (MEASURED by WP6 review: 8 of 8 entries open clean).
- **Known limit:** saving an entry whose body the editor actually changed rewrites the body in the widget's Markdown style (`*` list markers, loose lists). `docs/EDITING.md` §12 explains it.
- **Re-check at every Decap bump:** if richtext stops normalising on load, delete `cms-widgets.js` and its line in `cms/admin.html`.
- **Rollback (option B):** `widget: "markdown"` in `cms/source.mjs`, `npm run cms:config`, update the body-widget assertion in `tests/unit/cms/config.test.ts`; `cms-widgets.js` can then go.

## D-10 Publish every imported entry (owner decision, 2026-10-20)
- **Decision:** the owner chose "Publish everything" for the live site (https://bobalabx.github.io/bobalab-web/). This supersedes D-03/D-04's default of importing unverified content as `draft: true`. `scripts/import/import-dataset.mjs` sets `PUBLISH_ALL = true`, so every imported entry is written with `draft: false`. That includes the 4 pearl directions, the 2 archived directions, every publication, project, news item, opportunity, page, and the roster.
- **Still protected (consent, not draft):** `listed: false` people (the 4 "Others") never render. No photos, emails or "now at" lines are shown (`photo_consent`, `email_public` and `now_at_public` stay false). `site.yml launched` stays false, because `true` blocks deploys until the CMS sign-in `base_url` is configured.
- **Why:** the owner judged the lab-drafted wording acceptable to show while Park reviews it. Open questions remain in `docs/CONTENT-QUESTIONS.md`, and corrections go through the CMS.
- **Rollback:** set `PUBLISH_ALL = false` and re-run the importer with `--write`. Alternatively, set `draft: true` on individual entries in the CMS.

## D-11 content/ is the source of truth; the dataset importer is retired (2026-10-24)
- **Decision:** from now on, `content/**` is edited directly, through the CMS (`/admin/`) or by hand. `scripts/import/import-dataset.mjs` was the one-time migration (WP7, D-10). **Do not re-run it with `--write`.** It would overwrite every edit made since, including the October 2026 roster and headshots (D-12). `--check` is expected to report differences from now on.
- **Rollback:** none needed. The importer stays in the repo for reference.

## D-12 October 2026 roster and headshots (owner, 2026-10-24)
- **Source:** the owner's roster list (24 names) and the Google Form "Submit a headshot for Park's website" (file responses). Submitting a photo through that form is treated as consent to show it on the lab site (`photo_consent: true`).
- **Roster:**
  - 19 new member records. All are `role: undergrad` (inferred: the list marked only William Deng as "grad"). No program, links or directions until members add them.
  - Display names follow the owner's list. For example, "Haonan (William) Deng" becomes "William Deng" (the slug and paper links are unchanged).
  - Eddie Zhang, Hannah Yu, Marcus Koh and Ryan Xu were current on the PI site but are not on the October 2026 list, so they move to alumni with `end: "2026-09"`. The month is approximate; the site shows only the year. **Confirm with the lab.**
- **Photos:**
  - 21 submitted photos were cropped to 480×480 head-and-shoulders JPEGs with all metadata (EXIF/GPS) stripped and stored in `public/uploads/people/<slug>.jpg`. `npm run media` builds the WebP variants. Three iPhone HEIC files were converted with the Windows codecs first.
  - **Placeholders (pearl initials):**
    - Aaron Tu: he submitted a photo of his student ID card, which shows his ID number. Never publish it; ask him for a regular headshot.
    - Vinayak Sarkar: he submitted a generic silhouette.
    - William Deng: he submitted nothing.
  - One file in the form export ("Jazz Beecham") is not on the roster and was not used.
- **Scheduler link:** `site.yml` → `member_links` (new schema field and CMS list "Links for lab members"). It holds "Lab scheduler" → https://scheduler.bobalab.org/ and is shown in the footer ("Lab members") and at the top of `/people/`. It is a link only: the scheduler sends `frame-ancestors 'none'` and uses Google sign-in, so it cannot be embedded.

## D-13 Redesign: "Lines" hybrid (owner request after PI feedback "looks AI-generated", 2026-10-24)
- **Evidence:**
  - `docs/redesign/AUDIT.md`, `AUDIT-SYSTEM.md`, `IDENTITY-RESEARCH.md`, `DIRECTION.md` (diagnosis, references, 4 concepts and the critique).
  - `docs/redesign/prototypes/` (P0 Control, P1 Notebook, P2 Settle, P3 Lines; `JUDGE.md` plus comparison sheets).
- **Decision (orchestrator, following the judge with changes):** build on **P3 "Lines"** (`docs/redesign/prototypes/p3/`). Apply the judge's refinement list in `prototypes/JUDGE.md`, with these binding changes:
  1. **Navigation:** keep all five sections in the header: Research · Publications · People · News · Join. P3 dropped People, News and Join; they stay. Projects are reached from Research.
  2. **Boba identity stays visible.**
     - The four lanes of Fig. 1 end in a matte black tapioca **pearl at the "now" rule**. That pearl is the morph source into the direction page, where the same pearl heads Figure 2.
     - **Wordmark:** "BOBALAB" set in Archivo (condensed, bold), with the first O replaced by that pearl, built as outlined SVG with the existing script approach.
     - **Favicon:** P2's "shoulder on floor" (four pearls resting on a rule). Fallback: P1's "ruled b". A blind lineup with 3 people is still to run (owner).
  3. **Type:** one family, Archivo (variable width and weight, self-hosted woff2, latin; ≤ 100 KiB total fonts).
     - Condensed (wdth ~68, wght 700): h1, figure lane labels and year headings only.
     - Normal width: everything else (h2 ≤ 2rem, weight 600; body 400).
     - DOI and BibTeX use the system `ui-monospace` stack (no mono webfont).
     - Fraunces, Inter and IBM Plex Mono are removed.
  4. **Colour:** P3's paper, ink, muted, rule and hairline tokens (white paper, near-black ink, no brand accent; links are ink with underline), with the DIRECTION.md §5.0 direction tones.
     - **Light (deep):** #2B4FA8, #A12C5A, #4C7A1E, #6B4500.
     - **Dark (light):** #8EA4F7, #F590AE, #A8DA84, #C4943A.
     - Contrast is recomputed in tests. The swatch enum and CMS stay; each swatch maps to these tones.
  5. **No cards, pills, eyebrows or arrow-on-every-link:**
     - Lists are ruled ledgers in a label-column grid (18rem left label column on desktop).
     - Type and status are plain words. Filters stay real `<button aria-pressed>` styled as text toggles.
     - People are lists with square photos (P1/P2); initials squares where there is no photo.
  6. **Motion:** remove D-02's idle float, pointer buoyancy, stir, halos, gloss, the bounce and the in-figure Pause button (the footer "Reduce motion" switch stays). Keep or replace with purposeful, finite motion:
     - papers arrive year by year on the settle curve;
     - linked highlighting between lede words, lanes, dots and list rows;
     - the React `<ViewTransition name="pearl-{slug}">` morph;
     - the study-design plate's step-through.
     - All transform/opacity only, and off under reduced motion. This supersedes D-02/D-02a.
  7. **Copy cleanup (P0):** remove inline pipeline hedges ("reported by the lab" on every row, "Status not confirmed", "listed by title only", "This direction collects…"). Replace them with one provenance footnote per page where needed. Statuses stay honest. **PI sign-off is needed on the wording.**
  8. **Study-design plates:** a code component per paper (registry keyed by publication slug), shown only when the publication's new `plate_verified` field is true, or in preview mode. Ship the Bastani 2026 plate (design facts only, with a source line). The Learning to Gig plate stays off.
  9. **Unchanged:** all URLs, content, the CMS, the static export, accessibility (WCAG 2.2 AA), budgets and tests. Tests are updated to the new structure, never deleted to make them pass.
- **Not deployed:** the work lives on branch `redesign`. `main` and the live site are untouched until the owner and PI approve.
- **Rollback:** `git checkout main`.

## D-14 Simpler homepage: "the boba cup" (owner feedback on D-13, 2026-10-25)
- **Problem (owner):** the D-13 homepage was too complicated. The research timeline needed a legend: years, dots, cross-links, pearls, rings. The site had also lost BOBALAB's warmth.
- **Evidence:** `docs/simplify/`.
  - `REFS-SIMPLE.md`: 12 clear-and-original reference sites, 10 principles and a first-screen checklist.
  - Four homepage prototypes (`prototypes/a–d`) and `JUDGE.md`.
  - Simulated five-second tests with three no-context personas per design.
  - Measured complexity: the current homepage scores 5/7, every prototype 2/7.
- **Decision:** prototype **C "The beaker"** is the base, with the judge's hybrid refinements R1–R18 in `docs/simplify/JUDGE.md`.
  - **First screen:** the hero is a large plain statement; a "who" line naming Prof. Park Sinchaisri and UC Berkeley Haas; a concrete "why" line (≤ 60 words in all); and two links, "Explore the research" and "Read the papers".
  - **The cup:** a flat, line-drawn boba cup (tea-tinted fill, straw, three faint graduation ticks). The four direction pearls rest on its floor, labelled like a scientific illustration with leader lines. The pearls are flat (no gloss, gradient or shadow), about 56 px on desktop and 36 px on mobile, with ≥ 48 px hit areas.
  - **Labels look clickable at rest** (thin underline in the direction colour). A hint reads "Pick a pearl…" (desktop) or "Tap a pearl…" (touch).
  - **Picking a pearl** (click, tap, Enter or Space) makes it rise (buoyancy, about 350 ms, finite). It reveals at most three items: a short human `home_question` (new optional field, ≤ 90 characters, falling back to `question`); one finding, only when `findings[]` is filled (otherwise "A first read: <a paper>"); and "Explore <direction>" with counts. "Explore" morphs the pearl into the direction page (the existing `pearl-{slug}` view transition).
  - **Closing:** one pearl at a time; Esc, picking it again or tapping outside sinks it and returns focus. Hover only lifts the pearl and underlines its label.
  - **Wordmark:** the O tints to the open direction's colour.
  - **No JS:** the server renders an `<ol>` of links to `/research/<slug>/`.
  - **Geometry** is defined for 3, 4 and 5 live directions, plus an empty state.
  - **Below the fold:** new papers (3 ruled rows) beside news (4 dated lines); then people (round consented photos with first names, counts as a sentence, no initials discs); then the footer.
- **The timeline is not deleted.** It moves to `/research/` as `<section id="map">`, "Explore: how the four directions connect", in a tinted band with a one-sentence key, using the existing `PearlFigure`. The homepage links to it once: "See how the four directions connect".
  - Built (RESEARCH package): open by default, no disclosure; the key is one sentence above the plate; the arrival plays once per session when the map scrolls into view. The live ledger dropped its per-row strips because they duplicated the map (JUDGE.md recommendation; **owner to confirm**, and restore them by passing `strip` to the live `DirectionRow`s in `src/app/research/page.tsx`). The map's lane pearls are the page's only `pearl-{slug}` elements.
- **Tokens:**
  - a scoped `--t-display` for the home h1, about 5–5.5rem desktop and 2.5–2.75rem mobile. This is the only exception to the 2.25rem cap.
  - `--tea` #F4ECE2 and `--tea-dark` #211C17, used for the cup fill only.
  - The rest of D-13 stays: Archivo, ink on white, ledgers, no cards or pills, and real figures.
- **Copy:** new hero lines and the `home_question` texts are paraphrases of existing content. They are logged for PI approval in `CONTENT-QUESTIONS.md`.
- **Not deployed:** this work is on branch `simplify`. Merge only with the owner's explicit approval. **Rollback:** `git checkout main`.

## D-15 Hero figure: restore the original pearl figure, polished (owner, 2026-10-25)
- **Owner feedback on D-14:** "for this part [the hero figure], I like the first version better. The rest I think this version is good. Just polish the first version and make it fit the rest of the website." The owner confirmed "first version" means **the original Fig. 1 pearl figure** from the first live site (commit `4740e10`; spec in `docs/design/JUDGE.md`; the original code is in `git show 4740e10:src/components/figure/*` and `src/lib/figure/*`).
- **Decision:** the boba cup is replaced by the original pearl cluster. Everything else in D-14 stays:
  - the hero text column (h1, who line, why line, two links);
  - the below-the-fold sections;
  - `/research/#map`;
  - the tokens, and the `home_question` field.
- **Polish rules (make it fit D-13/D-14):**
  - **Panel:** flat `--tea` panel. No rounded border, crop marks or cream page.
  - **Labels:** Archivo, in link style with a direction-colour underline; muted paper counts.
  - **Pearls:** matte dark tapioca bodies, keeping the **soft direction-colour halo** and the **hairline orbit with paper seeds** the owner liked. No specular gloss, no index numerals, no bounce.
  - **Layout:** the original fixed slot templates (2×2 offset cluster for 4; templates for 2–8).
- **Interaction:**
  - **Hover or focus:** the pearl lifts slightly, its halo brightens and its seeds bloom; the other pearls dim (graphics only). A live caption shows the direction's `home_question` and its counts.
  - **Default caption:** one plain sentence explaining that each pearl is a direction and each dot is one of its papers.
  - **Click:** the `pearl-{slug}` morph into the direction page.
  - **Wordmark:** the O tints to the direction colour.
  - **Arrival:** a settle animation once per session.
  - **No idle loop, so no Pause button.** Nothing moves under reduced motion. No-JS renders plain links.
  - **Mobile:** a compact 2×2 pearl grid with labels inside the first screen; tap goes to the direction.
  - **Below the figure:** "See how the four directions connect" → `/research/#map`.
- **People (owner, same day):** remove the count sentence ("1 principal investigator, 1 master's student, 23 undergraduate RAs and 25 alumni.") from `/people/`, and the equivalent count sentence in the homepage people section.
- **The cup:** removed from `src/`. It survives in git history and in `docs/simplify/prototypes/c/`.
- **Branch:** `simplify`, not deployed.
- **2026-10-26 (owner):** the home headline is a bit smaller. `--t-display` is now `clamp(2.5rem, 1.75rem + 3vw, 4.25rem)` (68 px at 1440, 40 px on phones), which still passes the 2× hierarchy test.
- **2026-10-26 (owner):** "the bubble is not aligning with the left … they don't start at the same place." Fixed on two lines.
  - **Left edge.** The left pearl's dark disc, its label, its count and the caption text start on one x: the panel's content edge plus `--pl-edge` (12px). In the figure this applies to `data-edge="start"` slots, and `"end"` slots mirror it on the right. Middle pearls keep centred labels. The compact 2-column grid does the same, with odd items on the left and even items on the right. The faint ring and seeds overshoot the line, as round shapes do. `.pl` clips its overflow so the edge halos don't glow onto the page.
  - **Top edge (owner: "I want the title to start at the same place with the bubble picture").** From 48rem the h1 heads the text column again (grid row 1, with the who/why/links in row 2), and the pearl panel spans both rows on the right. The h1's first line is trimmed to its cap height (`text-box: trim-start cap alphabetic`, with an `lh` fallback), so its capitals and the panel's top edge start on one line. From 80rem the text column is 32rem wide, so the statement still sets in two lines (three at most from 768 to 1249px). The hero no longer stretches to fill the first screen: it starts 56px under the header, and the next section shows below it.
  - **How it was chosen.** A workflow made three readings of the owner's screenshots, prototyped variants A (edge hug), B (all labels left-set) and C (vertical only), and had three judges pick; A won 2–1. Verified to ±1px from 320 to 1920px, in WebKit, and on the n=2–8 galleries.

## D-16 New members, photos and "Graduate students" (PI via owner, 2026-10-26)
- **Source:** PI messages relayed by the owner, with photos. The PI sent his own photo, William's, Zhiwei's, Nike's, JJ's and Tom's, and Isabelle posted hers. The PI providing a member's photo for the site, or a member posting their own, is treated as consent (`photo_consent: true`), as with the D-12 form.
- **Photos:** all cropped to 480×480 head-and-shoulders JPEGs with metadata stripped, in `public/uploads/people/<slug>.jpg`.
  - Park Sinchaisri and William Deng: photos added (William was a placeholder in D-12).
  - Jazz Beecham: the D-12 form photo (`squareheadshotJazzBeecham.jpg`), now used because Jazz is on the roster.
- **New members:**
  - Zhiwei Wang: `phd`, program "Economics" ("Berkeley Economics PhD student … part of our lab").
  - Isabelle Cho and Jazz Beecham: `undergrad`, `title: Lab manager`, `rank: 1`, so they lead the undergraduate group. The owner confirmed Isabelle is an undergraduate; Jazz is assumed to be one too. **Confirm.**
  - Nike Naiyarat: `undergrad`, "Chulalongkorn ISE ’28". JJ Srimakut and Tom Jiramate: `undergrad`, "Chulalongkorn BAScii ’28". This is the PI's "Chula ISE '28" / "Chula BAScii '28", with "Chula" spelled out.
- **Graduate students:** PhD and master's students now share one People-page group, "Graduate students" (`groupOf` / `GROUP_LABELS` in `src/lib/content/people.ts`). Each card still names the exact role ("PhD student, Economics", "Master’s student, IEOR"). The role filter chip and the group id are now `graduate` (`#people-graduate`).
- **Undergraduate role line (PI, 2026-10-26):** under an undergraduate's name, show only their title and major ("Lab manager", "EECS"), never "Undergraduate RA". Leave it empty until the major is known. Graduate students keep role and program ("PhD student, Economics"). This applies on People, project team lists and news.
- **Deferred to the dashboard work:** showing majors and graduation years ("EECS ’28") instead of "Undergraduate RA" needs a graduation-year field. Choosing who is visible or featured, and managing papers and projects, are also deferred.

## D-17 Editor v2: "Save goes live" (owner decision, 2026-10-26)

- **Decision (owner):** Save goes live. The content manager uses Decap's `publish_mode: simple` (`scripts/cms/lib/decap-config.mjs`), the button says **Save**, one click saves, the live site updates in about 2 minutes, every save is listed in History with who made it, and a save can be taken back with one click (D-19). This replaces the editorial workflow (branches, pull requests, the Workflow board, "Publish now", waiting for the green check); `squash_merges` and `cms_label_prefix` are gone from the backend.
- **What Save does** (spec `cmsdesign/final/spec.md` §3; files `public/admin/cms-{locale,save,guards,layout}.js` and `cms-{ui,github,history,deploy,dock}.js`):
  - **Commit messages** name the entry and the editor: `Add|Edit|Delete {{collection}} “{{slug}}” (by @{{author-login}})`, `Upload “{{path}}” …`, `Delete file “{{path}}” …` (`cms/source.mjs` `commit_messages`). History, Recent changes and the deploy banner parse them.
  - **One click with a latch.** Decap has no save API and no in-flight guard, so a double click saved twice (MEASURED). `cms-save.js` opens Decap's menu and picks "Save now" itself, swallows clicks while saving, and falls back to Decap's two-click menu if its markup changes. Ctrl/Cmd+S saves. "Save and add another" and "Save and duplicate" are dropped.
  - **Nothing reaches GitHub without Save.** The header Media page and the media library's Delete are hidden (both committed at once), and a same-name upload is refused with "rename your file" (Decap's replace deleted the saved file at once, MEASURED).
  - **Five checks before a save reaches `main`, in this order:** (1) `cms-hooks.js`, unchanged; (2) upload type and size, with the deploy's own limits (`scripts/perf/asset-budget.mjs`); (3) hidden roster names, with the repository's existing public hashes (`tests/content/wp7-hidden-name-hashes.json`); (4) the conflict guard (someone saved after you opened the entry, also after a local backup was restored), with "Bring in their changes"; (5) the **site check**: the deploy's validator (`validateContent` including E_LINK_HIDDEN, plus `copyRuleIssues`) runs in the live column on the saved site with and without the change, and only problems the change **adds**, in any file, block the save.
  - **Why the checks:** in simple mode the commit lands on `main` before any CI runs (`ci.yml` runs on pull requests only, MEASURED), so one bad save would stop every later deploy.
  - **Status dock and banner:** deploy state comes from the `deploy` job (record-slugs runs after the site is live); a failure is blamed on the save that broke the site; a save of a hidden entry says "Saved · hidden", not "Live".
- **Maintainer switch:** `features.previewCheckBlocksSave` in `cms/source.mjs` (then `npm run cms:config`). `false` turns the site check's blocking off; its problems still show in the live column.
- **GitHub rule on `main` (owner action):** a ruleset with **only** "Block force pushes" and "Restrict deletions". **Never add "Require a pull request"**: every Save is a direct commit to `main`, so that rule would stop every Save (SETUP-PRODUCTION §B6).
- **Published-slugs PR:** merge the `automation/published-slugs` pull request only **after** editor v2 is live. Merged before, turning on Draft or turning off Listed for a published entry would fail the deploy (E_REDIRECT_MISSING, before the D-05 amendment).
- **Open questions: the defaults now in the code (owner to confirm).** Each can be changed later; the "Where" column names the place.

  | #   | Question                                                 | Default now (owner to confirm)                                                                                                                                                         | Where                                                          |
  | --- | -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
  | 1   | Hiding a page that is already public                     | Allowed. A warning, W_PUBLISHED_HIDDEN ("visitors get Page not found"), not a deploy error (D-05 amendment)                                                                            | `src/lib/content/validate.ts`                                  |
  | 2   | Links to pages that are hidden on the live site          | Save refuses them (E_LINK_HIDDEN), also when hiding a page others link to; the band offers a button to open the linking entry                                                         | `src/lib/content/links.ts`; `cms-save.js`                      |
  | 3   | Consent and personal details on Restore                  | Restore can switch consent and visibility fields off but never on; removed email, now at, photo and CV come back only from History with an extra tick box, never through Undo        | `cms-live.js` `ONE_WAY_FIELDS`, `PERSONAL_FIELDS`              |
  | 4   | Undo in the 30-second "Saved" message                    | Acts at once, no confirmation, only on its own entry; elsewhere it opens that entry's History                                                                                         | `cms-dock.js`; `cms-live.js` `restoreVersion`                  |
  | 5   | The Media page, media Delete, same-name uploads          | Header Media page and the library's Delete hidden; a same-name upload is refused with a "rename your file" message                                                                   | `admin.css`, `cms-layout.js`, `cms-save.js`                    |
  | 6   | Two editors on one entry                                 | Save stops and names who saved and when; "Bring in their changes" merges (theirs win where both changed a field, yours shown with [Copy]; a consent switch they turned off stays off) | `cms-save.js` (decision table); `cms-live.js` `mergeLatest`    |
  | 7   | Blocking a save the site check says would break the site | Blocked, with the maintainer off switch above; when the check is not ready the save goes through and the dock says so (fail open)                                                    | `cms/source.mjs` `features.previewCheckBlocksSave`             |
  | 8   | Should new entries start with Draft on?                  | Keep the current default (Draft **off**); the note next to Save always says what Save will do                                                                                         | `cms/source.mjs` field defaults; `cms-save.js` `saveNote`      |
  | 9   | Protected (hidden-roster) names                          | Refused with "ask the PI", never showing the name, using the existing public hashes                                                                                                   | `cms-guards.js`; `cms-data.js` `hiddenNames`                   |
  | 10  | GitHub rule on `main`                                    | Owner adds force-push and deletion protection after launch; never "Require a pull request"                                                                                            | SETUP-PRODUCTION §B6                                           |
  | 11  | Recent changes                                           | Every content save; maintainer edits labelled "changed outside the content manager"; code-only commits left out                                                                       | `cms-history.js` `recent`; `cms-dock.js`                       |
  | 12  | First live check after release                           | Owner action: one editor saves and undoes a draft test entry, then two editors edit one entry                                                                                         | SETUP-PRODUCTION §C6                                           |
  | 13  | Publication "Featured" hint                              | Reworded to "Not used on the site yet."                                                                                                                                               | `cms/source.mjs`                                               |
  | 14  | Phones                                                   | Editing and saving allowed, with an Edit / Preview & history switch below 800 px                                                                                                       | `cms-layout.js`, `admin.css`                                   |
  | 15  | Times in History                                         | Each viewer's own time zone ("Oct 26, 2026, 3:14 pm PDT")                                                                                                                             | `cms-ui.js` `fullTime`, `timeAgo`                              |

- **Measured side effects (owner to confirm):**
  - **`/publications/` ships 301 more bytes of JavaScript** (148,259 → 148,560 B gz; budget 169,864). The live column runs the publication views in the browser, so Turbopack can no longer inline the publications island's helper modules. Default: **accept** (no behaviour change). The alternative is to fork the publication views for the preview, which brings drift risk. The design spike measured the same +301 B; the spec's "0 bytes changed on every public page" was a misread (`docs/PERF-BASELINE.md`). Every other public page is byte-identical to `main` 14c739c apart from the `robots.txt` Disallow line for `/editor-preview/`.
  - **Tailwind scans admin scripts.** Tailwind v4 reads every project file for class names, admin scripts and Markdown docs included. In `public/admin/cms-save.js`, a JavaScript “not” written directly before a variable called `hidden` read as Tailwind's important-modifier class and added a rule to every public page's CSS (MEASURED by WP2 and WP5; fixed by renaming the variable). Docs must not spell such a token out either: a mention of it in a Markdown file did the same during WP6 (MEASURED, reworded). An `@source not "../../public/admin"` line in `src/app/globals.css` would stop this for good, but it would also remove 15 rules that files there and in `tests/` produce on `main` today (MEASURED 2026-10-26), so it is **not** applied: it would change every public page's CSS. Until a maintainer decides, check the public CSS after admin-script changes (`docs/HANDOVER.md` §7).
- **Rollback:** revert the editor-v2 commits. Returning to the editorial workflow alone means `publish_mode: "editorial_workflow"` plus `squash_merges: true` in `scripts/cms/lib/decap-config.mjs`, dropping `cms-save.js` from `cms/admin.html`, `npm run cms:config`, and putting the old SETUP-PRODUCTION ruleset back.

## D-18 The live column renders the real site from the CMS's own data (2026-10-26)

- **Decision:** the right-hand column of the editor shows the real website. A static, noindex route `/editor-preview/` (`src/app/editor-preview/`) renders the site's own page components (`src/components/views/`, shared with the routes) in the browser, from the saved content plus the form's unsaved data, inside a frame in Decap's preview pane (`public/admin/cms-live.js`).
- **No public content snapshot.** The column loads the saved content with Decap's own `getCollection`, two collections at a time, checks each against a git tree count, and posts it into the frame. A `content.json` file next to the preview would have published 4 unlisted people, 22 private "now at" values and a draft (MEASURED in the spike). When a collection fails to load, the column says so and the site check is off.
- **Editor-view rules = the live site's rules** (`preview: false`): other drafts, unlisted people and switched-off profiles never show (D-03 cross-reference). Only the edited entry is drawn while its Draft is on, with a note; "Show as visitors see it" turns that off.
- **No sandbox on the frame.** It is same-origin with `/admin/` and runs only the site's own code, which already runs on that origin. The preview never reads storage, never receives the GitHub token (messages carry content only) and cannot reach api.github.com (the site CSP blocks it). An opaque-origin sandbox would add untested behaviour with Next, the CSP and font loading. Later: an organisation account and a separate domain for `/admin/`.
- **Browser-only marks.** `entryMark()` (`src/lib/preview/mark.ts`) adds `data-entry` only after `enableEntryMarks()` has run in a browser effect, so no exported HTML carries it (MEASURED: 0 files in the export).
- **Zero public change** apart from D-17's measured `/publications/` +301 B and the `robots.txt` line: route files are thin wrappers around the views; `/editor-preview/` is noindex, out of the sitemap, disallowed in robots, and has its own JS budget (B + 180 KiB; 286,780 B gz measured).
- **Rollback:** revert the editor-v2 commits for `src/app/editor-preview/`, `src/lib/preview/` and `cms-live.js`; the views refactor can stay (it changes no public HTML).

## D-19 History is read-only; Restore goes through the form and Save (2026-10-26)

- **Decision:** History reads GitHub's REST API with GET requests only (`public/admin/cms-github.js`, `cms-history.js`), with the editor's own Decap sign-in, and makes no request before sign-in. Our code never writes to GitHub: Restore and Undo put the older values into the form and run the normal Save, so every check of D-17 runs and the restore is recorded as an ordinary save.
- **Consent is one-way.** Restore and Undo can switch Listed, Profile page, Photo consent, Email public, Now at public, a collaborator's consent and a partner's Public **off**, never **on** (`ONE_WAY_FIELDS` in `cms-live.js`). If Photo consent stays off, the photo is cleared.
- **Personal details are opt-in.** Email, now at, photo, photo alt text and CV that are empty now stay empty unless History's dialog box "Also bring back removed personal details" is ticked; Undo never ticks it (`PERSONAL_FIELDS`). A current draft stays a draft unless "Also make it visible on the live site" is ticked. Upload paths missing from `public/uploads` are cleared with a note.
- **The older-version preview equals the restore result.** The column shows what Restore would save, never the raw old data, so a withdrawn photo or email is never drawn again (D-06). Diffs mask personal values when the matching switch is off now or the person is unlisted.
- **Undo** in the 30-second "Saved" message acts at once, only on its own entry; elsewhere it opens that entry's History (D-17 open question 4).
- **Revert is not erasure.** The repository is public, so every saved version stays readable on github.com. Removing personal data from history needs a maintainer (and GitHub Support for cached views).
- **Rollback:** revert the editor-v2 commits for `cms-github.js`, `cms-history.js` and the History parts of `cms-live.js`; Save keeps working without them.
