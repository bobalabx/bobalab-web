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
