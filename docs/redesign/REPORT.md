# BOBALAB redesign: report (branch `redesign`, 2026-10-24)

**Why:** Prof. Park said the site "looks AI-generated". This redesign keeps the content, URLs, CMS, accessibility and tests, and replaces the visual system.

**Status:** it is on branch `redesign` and **not deployed**. The live site (`main`) is unchanged until the lab approves.

## 1. Critique of the old site (why it read as AI-made)

The full evidence is in [`AUDIT.md`](AUDIT.md) (screenshots in `before/`) and [`AUDIT-SYSTEM.md`](AUDIT-SYSTEM.md) (measured counts). In short:

- **The site used the "second-wave" AI default kit.** That kit is the look AI tools produce once you ask them for "less AI": a cream page (#FCFAF6, 0.26 ΔE from the named tell #F4F1EA) with a brown accent, a soft display serif over Inter (Inter set 91% of all characters), and tracked mono eyebrows.
- **Template chrome was everywhere.**
  - 162 outlined pills;
  - 65 rounded hairline boxes (8 of 17 project cards were empty);
  - an arrow on every link;
  - one "heading + All X →" section pattern repeated about 11 times.
- **Machine-voiced copy.** Examples: "reported by the lab" ×15 on Publications, "Status not confirmed", "listed by title only", and "This direction collects…".
- **No lab-made evidence.** No research figure, diagram or photo appeared anywhere except the student headshots.
- **The one original idea (Fig. 1) stayed in a box on one page,** drawn in the glossy-orb idiom.

**What was worth keeping (and was kept):**
- Fig. 1's data encoding;
- the pearl → page morph;
- the colour-checked direction colours;
- citation rigour (APA and BibTeX);
- the research-question ledes;
- the real headshots;
- all accessibility machinery.

## 2. Inspiration

13 research-lab sites and 12 editorial and identity references were studied. They are summarised in [`DIRECTION.md`](DIRECTION.md) §2. The reference screenshots stay outside the repo for copyright reasons. The principles adopted (not the forms) were:

- **Show the lab's own evidence as the hero.** The Opportunity Insights mission sits over its key chart, and Distill uses each paper's own figure as its thumbnail.
- **One rule generates the identity.** Taken from Pentagram's MIT Media Lab system and Fay's Center for Constructive Communication identity.
- **Restraint plus one committed extreme.** Taken from the MIT Design Intelligence Lab.
- **Lists without cards.** Ruled rows (Stedelijk, Distill), a table-of-contents style (e-flux), and small area marks (Ink & Switch).
- **Motion that explains rather than decorates.** Taken from The Pudding and Bartosz Ciechanowski.

## 3. Concepts explored

Four concepts (A Living Research Atlas, B Research Notebook, C Settle identity system, D Service Lines) are described in [`DIRECTION.md`](DIRECTION.md) §3. An adversarial critique follows them.

Four prototypes were built with real content and compared side by side with the live site. They are in [`prototypes/`](prototypes/), with the judge's report in `prototypes/JUDGE.md` and the comparison sheets in `prototypes/sheets/`.

| Prototype | Idea | Verdict |
|---|---|---|
| P0 Control | Only the cleanup (no pills, boxes or eyebrows; better copy) on the old fonts and colours | Calmer, but still reads as the same kit. Cleanup alone is not enough |
| P1 Notebook | Journal conventions: STIX type, margin rail, numbered figures | Most journal-like and credible, but least memorable |
| P2 Settle | Pearl-stack identity system with spot inks | Strongest brand system, but reads like a startup infographic |
| **P3 Lines** | **The lab's papers drawn as a figure in operations notation; study-design plates** | **Chosen.** Reads as a published figure, not a template |

## 4. Selected identity (decision D-13 in [`../DECISIONS.md`](../DECISIONS.md))

- **Philosophy.** The lab's real output is the decoration. Fig. 1 is a timeline of every paper by research direction and year. Vertical links join papers shared by two directions, which is a real and non-generic structure: the chain AI at Work – Algorithmic Advice – Learning on the Job – Platform Work. Each line ends in a **tapioca pearl at "now"**, with work in progress as open rings beyond it.
- **Boba identity.**
  - The pearl ends every research line and morphs into the direction page.
  - The wordmark is **B●BALAB** (Archivo, with the pearl as the O).
  - The favicon is four pearls resting on a rule.
- **Type.** One family, Archivo (variable width and weight, 88 KiB). Condensed for headlines and figure labels, normal width for everything else. Fraunces, Inter and IBM Plex Mono are gone.
- **Colour.** Ink on white with no brand accent. Links are ink with an underline. The four direction tones are used only as data colours, retuned for colour-blind separation: the minimum ΔE rose from about 3.3 to about 8.2.
- **Composition.**
  - A label column (18rem) on the left of every page.
  - Ruled ledgers instead of cards.
  - Heavy rules only around figures.
  - Type and status are plain words.
  - Filters are text toggles (still real buttons).
- **Research visuals.**
  - Every direction page has its own Figure 2.
  - The Bastani, Bastani & Sinchaisri (2026) paper page has a **study-design plate**, drawn from design facts in the paper only (no results), with a step-through animation.
  - Plates appear only when the new CMS checkbox "Study-design figure checked by the authors" is ticked (preview builds show them).
- **Motion.**
  - Papers arrive year by year on a no-bounce "settle" curve.
  - Lede words, lines, dots and list rows highlight each other.
  - The pearl morphs into the direction page.
  - The plate steps through the study design.
  - Removed: the idle float, pointer parallax, halos, gloss and the Pause button. "Reduce motion" stays in the footer.

## 5. Implementation

The redesign was built in the existing Next.js codebase on branch `redesign`: one foundation commit, five package commits and three integration commits.

Unchanged:
- URLs, content, the CMS (one new field, `plate_verified`), the static export to GitHub Pages, consent rules and the scheduler link.

Changed:
- **Copy cleanup:** every rewritten passage is listed for PI approval in [`../CONTENT-QUESTIONS.md`](../CONTENT-QUESTIONS.md) → "Redesign copy changes: PI to approve". No fact, date, author, venue or status changed.

## 6. Before and after

Matching screenshots of the live site and the redesign (1440×900 and 390×844) are in [`after/`](after/) as `cmp-<page>-<size>.jpg` (home, research direction, publications, paper, people, news, project).

## 7. Testing (MEASURED, branch `redesign`)

| Check | Result |
|---|---|
| typecheck, lint, format | pass |
| Unit tests | 745 passed, 4 skipped |
| Content validation | 72 passed |
| CMS config / media checks | up to date |
| Production / preview export | 81 / 82 pages, export check ok, 0 broken links |
| Playwright (preview export) | Chromium 227 passed / 0 failed; WebKit 224 passed / 0 failed (skips are by design) |
| axe (WCAG 2.2 AA) | 0 violations site-wide (production export) |
| JS budget | home 140.4 KB gz (limit 147.3); all pages within budget |
| Fonts | 88.0 KiB (limit 100) |

**Not tested:** real phones, screen readers, and GitHub Actions on Linux for this branch. The blind five-second test with 3–5 Haas faculty or PhD students (DIRECTION.md C.7) has not run.

## 8. Remaining decisions and recommendations

1. **Approve the redesign** after looking at the preview (`npm run dev` on branch `redesign`) and the comparisons in `after/`. Then merge `redesign` into `main` to deploy.
2. **PI sign-off on the copy changes** (CONTENT-QUESTIONS → "Redesign copy changes"), and on the Bastani study-design plate. Tick "Study-design figure checked by the authors" to show it on the live site.
3. **Optional blind test:** the five-second test with 3–5 people outside the lab, comparing old and new.
4. **Assets that would strengthen the identity:**
   - a consented photo of Prof. Park, who currently appears as initials;
   - Aaron Tu's and Vinayak Sarkar's headshots;
   - Milosz's uncropped square photo.
5. **Favicon:** a quick blind check of the four-pearl mark against generic icons. Fallback: P1's "ruled b".
6. **Known small issues:**
   - Figure 2's layout between 1024 and 1150 px could be tighter.
   - Archivo has no true italic, so `<em>` uses a slanted roman.
