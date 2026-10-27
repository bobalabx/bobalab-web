# QA checklist (manual, before launch and after major changes)

Automated tests cannot find every accessibility problem (DOCUMENTED, R6 §10.3). This file is the **manual** part of the quality plan: the brief §G1 test matrix, Lighthouse on the four key pages (§G2), and the five-second test that gates the hero figure (§B2). Record every run in the sign-off table at the end and link issues for anything that fails.

**When:** before the public launch; after a redesign of a template, the figure or the navigation; and a short spot check (keyboard + one screen reader + reduced motion) once a term.

**What to test:** a production export, never `next dev`:

```sh
npm run build && npm run serve:out      # http://localhost:4173/
```

or the deployed site. Use the preview export (`npm run build:preview`) only to look at draft pages.

## 1. Automated gates first

Do not start manual testing until CI is green on the commit under test: `validate-content`, `lint-typecheck`, `unit`, `build`, `e2e`, `a11y`, `links`, `budgets` (`docs/HANDOVER.md` §10). The automated suite already covers: axe on every page in light and dark and in figure and list modes, forced colours, reduced motion, no-JS rendering, zero off-origin requests, internal links, and the JS/font/transfer budgets.

## 2. Pages in every pass

| #   | Page                                                     | Path                                             |
| --- | -------------------------------------------------------- | ------------------------------------------------ |
| 1   | Home, figure mode (≥ 1280 px wide) and list mode (phone) | `/`                                              |
| 2   | Research index                                           | `/research/`                                     |
| 3   | One direction page (and one archived direction, if any)  | `/research/<slug>/`                              |
| 4   | Projects index and one project                           | `/projects/`, `/projects/<slug>/`                |
| 5   | Publications index with filters; one paper (BibTeX copy) | `/publications/`, `/publications/<slug>/`        |
| 6   | People (alumni `<details>`) and the PI page              | `/people/`, `/people/<slug>/`                    |
| 7   | News index and one item                                  | `/news/`, `/news/<slug>/`                        |
| 8   | Join, About, Accessibility, Privacy                      | `/join/` `/about/` `/accessibility/` `/privacy/` |
| 9   | Not-found page                                           | any missing URL                                  |

## 3. Manual test matrix (brief §G1)

Mark each cell **Pass**, **Fail (#issue)** or **n/a**. A row passes when every check under it holds on every page in §2.

| Row                                | Setup                                                                                                                                          | Checks                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **K. Keyboard only**               | Any desktop browser; mouse unplugged or untouched                                                                                              | K1 The first Tab shows "Skip to main content"; Enter moves focus into the page. K2 Every link, pearl, chip, button and `<summary>` is reachable; focus order matches the visual order; Fig. 1 goes 01 → 0N. K3 The focus ring (2 px, 3 px offset) is always visible and never hidden under the sticky header (WCAG 2.4.11). K4 Enter on a pearl opens its direction page and focus lands on the page's `h1`. K5 Filter chips toggle with Enter/Space and announce pressed state; the result count updates. K6 "Copy BibTeX" works and "Copied" appears. K7 The footer "Reduce motion" switch and the figure's "Pause motion" button work from the keyboard. K8 No keyboard trap anywhere (including the figure caption). |
| **V1. VoiceOver + Safari (macOS)** | VO on (Cmd+F5); rotor for headings, landmarks, links                                                                                           | V1 Each page title is unique and says where you are. V2 Landmarks: banner, navigation, main, contentinfo; one `h1`; heading levels do not skip. V3 Fig. 1 reads as a navigation "Research directions" with a list of N links, each with its index, label and paper count; decorative pearls and seeds are silent. V4 The live caption does not chatter while tabbing. V5 Publication filters: the result count is announced politely. V6 Lists styled without bullets are still announced as lists (Safari drops list semantics without `role="list"`, WK-LIST). V7 Draft badges (preview only) and "Open to RAs" badges are read as text. V8 Every materials link names the paper ("PDF, <title>").                     |
| **V2. VoiceOver + Safari (iOS)**   | Swipe navigation, rotor                                                                                                                        | Same as V1, plus: the header navigation fits one line at 375 px; double-tap on a pearl opens the direction; no content is only reachable by hover.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| **N1. NVDA + Firefox (Windows)**   | Browse mode and focus mode                                                                                                                     | N1 Headings (H), landmarks (D) and lists (L) navigate as expected. N2 Filter chips are buttons with pressed state. N3 Alumni `<details>` expands and collapses and announces its state. N4 "Copied" and result counts are announced once.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| **N2. NVDA + Chrome (Windows)**    | As N1                                                                                                                                          | As N1.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| **Z1. 200 % zoom**                 | Browser zoom 200 % at 1280 px; then text-only zoom 200 % (Firefox: View → Zoom text only)                                                      | Z1 Nothing is cut off or overlaps; Fig. 1 labels never cover another pearl (E10). Z2 The text-spacing bookmarklet (line-height 1.5, paragraph 2 em, letter 0.12 em, word 0.16 em; WCAG 1.4.12) loses no text.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| **Z2. 400 % zoom**                 | Browser zoom 400 % at 1280 px (≈ 320 CSS px)                                                                                                   | Z3 No horizontal scrolling except for the BibTeX `<pre>` (WCAG 1.4.10). Z4 The figure switches to list mode and stays usable. Z5 The sticky header does not cover more than about a quarter of the screen.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| **C. Windows contrast themes**     | Settings → Accessibility → Contrast themes (try "Aquatic" and "Desert"); Edge and Chrome                                                       | C1 Text, links and buttons are visible with system colours. C2 Pearls keep a visible outline and seeds are visible (forced-colours CSS, brief §E7). C3 The focus ring uses the Highlight colour. C4 Icons that carry meaning are still visible; badges keep their text.                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| **M. OS reduced motion**           | macOS: Accessibility → Display → Reduce motion; Windows: Settings → Accessibility → Visual effects → Animation effects off; iOS: Reduce Motion | M1 Home: no intro drop-in, no idle float, no seed bloom; hover and focus show only the outline and underline. M2 Pearl → direction navigation is instant or a short cross-fade (≤ 120 ms), no morph. M3 With the OS setting off, the footer "Reduce motion" switch gives the same result, and it survives a reload. M4 With motion on, "Pause motion" stops the idle float, and the choice persists. M5 Nothing moves for more than 5 s without a pause control (WCAG 2.2.2).                                                                                                                                                                                                                                            |
| **D1. Mid-range Android phone**    | A real device about 3–4 years old, Chrome, mobile data                                                                                         | D1 Home is readable within about 3 s on 4G; no layout jump after load. D2 List-mode figure; pearls and chips are easy to tap (design ≥ 44 px, floor 24 px, WCAG 2.5.8). D3 No horizontal scrolling on any page. D4 Long titles wrap; nothing overflows.                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| **D2. Older iPhone**               | An iPhone at least 4 years old, Safari                                                                                                         | As D1, plus: navigation works where the browser lacks View Transitions (no errors, instant navigation).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |

Also before launch:

- [ ] **Siteimprove** scan of the campus hostname (required for berkeley.edu hostnames; DOCUMENTED KB0015380 via R4 V28; enrolment procedure UNKNOWN, ask ISO or the Digital Accessibility Program). Fix or document every finding in `/accessibility/` "Known limits".
- [ ] **Uploaded documents:** every PDF or slide deck linked from the site meets WCAG 2.1 AA by 2027-04-26 (DOCUMENTED, UCB-DAP): tagged PDF, a real title, document language, logical reading order, alt text for figures. Prefer linking to the publisher, SSRN or arXiv copy over uploading.
- [ ] Spot-check that no page shows a person, photo, email or "now at" without the matching consent flag (D-06).

### 3a. The content editor (editor v2, D-17 to D-19)

Run these once on the live `/admin/` after the editor-v2 release (with a draft test entry), on a desktop browser and on one real phone. The automated specs (`cms-save`, `cms-live`, `cms-local`, `editor-preview`) cover the same flows in Chromium and WebKit on the local demo; these checks add real devices, real assistive technology and the real GitHub backend.

| Row                         | Checks                                                                                                                                                                                                                                                                                                                                                         |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **E1. Keyboard only**       | The first Tab on an entry shows "Skip to the live preview"; Enter moves focus to the live column's tabs, and "Back to the form" returns. Page tabs move with the arrow keys and open with Enter. Every History row, Restore, Undo, the Restore dialog (Cancel focused first, Esc cancels) and "Bring in their changes" work without a mouse. Ctrl/Cmd+S saves. |
| **E2. Screen reader**       | "Saved. The live site updates in about 2 minutes." is announced once; the status box does not repeat itself every minute; the "Not saved" band is announced as an alert; typing in the form does not make the preview chatter.                                                                                                                                 |
| **E3. Phone**               | On a real phone: Edit / Preview & history switch; Save reachable at the top; the status box and the switch do not cover the last field; no sideways scrolling.                                                                                                                                                                                                 |
| **E4. Safari (macOS, iOS)** | The live column renders and follows typing; an image chosen in the form shows in the column before Save; History opens.                                                                                                                                                                                                                                        |
| **E5. Live smoke test**     | SETUP-PRODUCTION §C6 steps 1–8, including Undo and the two-editor test.                                                                                                                                                                                                                                                                                        |

## 4. What to record for a failure

Page and URL; the row and check (e.g. "K3"); browser, OS, assistive technology and versions; steps; what happened vs. what should happen; a screenshot or short recording. File it as a GitHub issue and put its number in the matrix.

## 5. Sign-off rules

- Launch needs **every row Pass or n/a**, with no open issue of severity "blocks a task".
- A cosmetic issue may ship if it is listed in `/accessibility/` "Known limits" with a date.

## 6. Lighthouse on the four key pages (brief §G2, WP8 acceptance #10)

On a **production** export (preview builds disallow crawling in `robots.txt` and lose SEO points by design):

```sh
npm run build && npm run serve:out          # terminal 1
node scripts/perf/lighthouse.mjs            # terminal 2 → test-results/WP8/lighthouse/
```

The script audits home, the first direction page, `/publications/` and `/people/` with Lighthouse 13.5.0 in mobile emulation, writes an HTML and JSON report per page plus `summary.md`, and exits 1 when a page is missing or below budget: **Performance ≥ 95, Accessibility 100, Best Practices ≥ 95, SEO ≥ 95**.

**Before launch, while every direction is a draft** (`launched: false`, DECISIONS D-03), a production export has no direction page, so the script reports it as missing. Audit that page on the preview export instead, and record both runs:

```sh
npm run build:preview && npm run serve:out                         # terminal 1
node scripts/perf/lighthouse.mjs --preview --direction ai-at-work  # terminal 2
```

`--preview` skips only Lighthouse's `is-crawlable` audit, because preview builds tell crawlers to stay out in `robots.txt` on purpose (that one audit costs 34 SEO points: SEO 66 with it, MEASURED on the dev server 2026-10-20). `summary.md` says so. Repeat the full run on a production export once directions are published. Field targets for the live site: LCP ≤ 2.5 s at p75 (lab ≤ 1.8 s), CLS ≤ 0.1 (home ≤ 0.02), INP ≤ 200 ms (DOCUMENTED thresholds, CWV). Attach `summary.md` to the integration PR. Run it on a quiet machine; Performance varies by a few points between runs, so repeat a borderline result three times and report the median.

## 7. Five-second test (the gate for Fig. 1, brief §B2)

**Purpose.** Check that the hero reads as a research lab and that the pearls read as the lab's research directions **and as links**, before the figure is polished further.

**Participants.** Five people from **outside the lab**: faculty or PhD students (brief §B2). Nobody who has seen the design. Record only a role (e.g. "PhD, Economics"), never a name; this is informal design feedback and nothing identifying is kept.

**Setup.**

- A laptop at 1366 × 768 or larger, browser full screen, showing the home page scrolled to the top (the figure in figure mode). Use a phone (list mode) for an optional second round.
- Use the **preview** export (`npm run build:preview && npm run serve:out`) as long as the directions are drafts: a production build then shows "Research directions coming soon" instead of Fig. 1 (D-03). The preview ribbon and the "Draft · pending lab review" badges are visible there: do not explain them, and note in the results that they were on screen.
- A second tab with a blank page, and a timer.
- Two lab members: one moderator, one note-taker. Questions are read word for word; no hints.

**Script.**

1. "I'm going to show you a web page for five seconds. Then I'll hide it and ask you a few quick questions. There are no right or wrong answers; we're testing the page, not you."
2. Show the page for **5 seconds**, then switch to the blank tab.
3. Ask, and write down the answers verbatim:
   - **Q1** "What is this website? Who is it for?"
   - **Q2** "What research topics or areas do you remember?"
   - **Q3** "Suppose you wanted to learn more about one of those areas. What would you click or tap?"
   - **Q4** "What were the round shapes in the picture?"
   - **Q5** "One or two words for your impression of the page."
4. Thank them. Do not explain the design until all five sessions are done.

**Scoring** (both note-takers agree on each call):

- **Named two directions:** Q2 mentions at least two of the live directions; synonyms count ("AI at work" for "Generative AI at work").
- **Labels read as links:** Q3 or Q4 says, unprompted, that the shapes or their labels open a page about that area.
- **Credibility (recorded, not part of the pass rule):** Q1/Q5 mention research, a lab, Berkeley or Haas, rather than a café or a game (design principle 1).

| #   | Role | Q2 directions named | ≥ 2? | Links? (Q3/Q4) | Q1/Q5 notes |
| --- | ---- | ------------------- | ---- | -------------- | ----------- |
| 1   |      |                     |      |                |             |
| 2   |      |                     |      |                |             |
| 3   |      |                     |      |                |             |
| 4   |      |                     |      |                |             |
| 5   |      |                     |      |                |             |

**Decision.**

- **Pass:** at least **4 of 5** participants named two directions **and** read the labels as links. Continue with the figure as is.
- **Fail**, or the lab confirms **7–8 directions:** switch to the pearl dot plot (`content/site.yml → figure_mode: dotplot`, decision H-16; it shows per-year output, so the PI approves it), then repeat the test with **five new** participants.
- Record the result, date and decision in `docs/DECISIONS.md`.

## 8. Sign-off

| Date | Commit | Tester(s) | Rows done | Lighthouse (H / D / Pub / People) | Five-second test | Open issues | Result |
| ---- | ------ | --------- | --------- | --------------------------------- | ---------------- | ----------- | ------ |
|      |        |           |           |                                   |                  |             |        |
