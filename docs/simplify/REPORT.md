# BOBALAB homepage simplification: report (branch `simplify`, 2026-10-25)

**Why:** the owner found that the D-13 redesign's homepage was too complicated. Its research timeline needed a legend, and the site had lost BOBALAB's warmth.

This iteration replaces the homepage hero with **the boba cup** (decision D-14 in [`../DECISIONS.md`](../DECISIONS.md)) and moves the timeline to the Research page. Content, URLs, the CMS and the rest of the D-13 design stay as they are.

**Status:** on branch `simplify`. Not merged and not deployed; the live site is unchanged until the owner approves.

## What changed

- **Homepage first screen** (`src/app/page.tsx`, `src/components/home/**`, `src/components/cup/**`):
  - a large statement, "How people learn to work with algorithms";
  - a who line built from content, naming BOBALAB, the Haas School of Business at UC Berkeley and Prof. Park Sinchaisri;
  - a 32-word why line;
  - two links, "Explore the research" and "Read the papers";
  - a flat, line-drawn **boba cup** (tea fill, straw, three faint ticks) with the four research pearls on its floor, labelled with leader lines;
  - a hint: "Pick a pearl to see the question behind it" ("Tap…" on touch).
- **Pick a pearl** (click, tap, Enter or Space):
  - It rises and shows a short question (new optional `home_question` field), one finding or "A first read: <paper>", and "Explore <direction>" with counts.
  - "Explore" morphs the pearl into the direction page, and the pearl in the BOBALAB wordmark takes on the direction colour.
  - Only one pearl is open at a time. Esc, picking it again or tapping outside closes it and returns focus.
  - Without JavaScript the cup is a plain list of links.
- **Below the first screen**, only three blocks: new papers (3 rows) beside news (4 dated lines), then people (round consented photos with first names), then the footer.
- **The research timeline was moved, not deleted.** It is now on `/research/#map` as "Explore: how the four directions connect", in a tinted band with a one-sentence key instead of the 70-word caption. The homepage links to it once: "See how the four directions connect".
- **Tokens:** `--t-display` (home h1 only) and `--tea` / `--tea-dark` (cup fill only). Everything else is D-13 (Archivo, ink on white, ledgers, no cards or pills).
- **CMS:** two new optional fields, `directions.home_question` (≤ 90 characters) and `pages/home.why`. The editor preview shows both.

## The owner's ten goals

| Goal | How it is met |
|---|---|
| 1. Simplify the homepage | One picture instead of a chart with 46 marks; 55% fewer words on the first desktop screen (215 → 96) |
| 2. Revisit the boba pearls | Flat, labelled pearls in a cup that rise to reveal; professional, not glossy |
| 3. Move the timeline | `/research/#map`, kept intact with its interactions |
| 4. Five-second comprehension | The text alone answers who, what and why; the PI is named; simulated testers' complexity rating fell from 5/7 to 2/7 |
| 5. Less overload | Detail opens one direction at a time and on subpages; the page is 22–24% shorter |
| 6. Keep D-13's strengths | Typography, ledgers and real figures kept; the no-cards/no-pills probes pass |
| 7. Warmth and playfulness | The cup, the tea fill and the tinted wordmark pearl; simulated warmth rating 4.3 vs 2.0 for the live site |
| 8. Research | [`REFS-SIMPLE.md`](REFS-SIMPLE.md): 12 sites studied, 10 principles, a first-screen checklist |
| 9. Three or more concepts | Four prototypes (A Four Pearls, B Questions first, C The cup, D People & pearls) in [`prototypes/`](prototypes/), with comparison sheets in [`sheets/`](sheets/) |
| 10. Critical evaluation | [`JUDGE.md`](JUDGE.md), with B named as the fallback if the cup reads as cute |

## First-screen checklist: live site vs this branch (MEASURED)

| Check (target) | Desktop 1440×900 | Phone 390×844 |
|---|---|---|
| Words on the first screen (≤ 60 / ≤ 50) | 215 → 96 | 115 → 98 |
| h1 vs next-largest text (≥ 2×) | 1.1× → 4.0× | 1.0× → 1.6×–2.5× |
| Interactive elements (≤ 12 / ≤ 10) | 14 → 13 | 12 → 13 |
| Research pearls in the first phone screen | — | 1 of 4 → 4 of 4 |
| Visual encodings / legend | 8 + a 70-word caption → 1, none | same |
| Who / what / why answered, PI named | no → yes | no → yes |
| Page height | 3026 → 2371 px | 4843 → 3659 px |

Word and link counts are still above the strict checklist targets. That is the trade-off for naming the PI and the university plus a concrete why line; cutting the why line would meet them.

Before/after images are in [`after/`](after/):
- `cmp-home-desktop.jpg`, `cmp-home-mobile.jpg` and `cmp-home-full.jpg`;
- `cup-picked.jpg` (the reveal);
- `research-map.jpg` (the timeline's new home).

## Testing (MEASURED, branch `simplify`)

| Check | Result |
|---|---|
| typecheck, lint, format | pass |
| Unit tests | 823 passed, 4 skipped |
| Content validation | 74 passed |
| CMS config / media | up to date |
| Production / preview export | 81 / 82 pages, export check ok, 0 broken links |
| Playwright (preview export) | Chromium 234 passed / 0 failed; WebKit 229 passed / 0 failed |
| Site-wide axe + off-origin (production) | 24/24 |
| JS budget | home 140.7 KB gz (limit 147.3) |
| Home transfer | 252.6 KB (limit 350) |

**Not tested:** real phones, screen readers, Lighthouse on this branch, and Linux CI. The five-second tests were simulated with three AI personas per design, not real people.

## Needs sign-off before going live

1. **The owner:** approve merging `simplify` into `main` (that deploys).
2. **Prof. Park, the new copy:** S-1 to S-7 in [`../CONTENT-QUESTIONS.md`](../CONTENT-QUESTIONS.md) → "Simplify copy changes". These are the four short pearl questions, the why line ("…and how to design them better" needs his confirmation), and the who line.
3. **Prof. Park, the cup:** does it read as charming or cute? The fallback is prototype B's text-led layout with the same reveal.
4. **Small choices:**
   - keep the per-direction mini timelines off the `/research/` list (they duplicate the map);
   - whether "All directions" should point to `/research/#map`.

## Update, 2026-10-25: owner feedback round

- **Hero figure (D-15).** The owner preferred the original pearl figure, so the cup is replaced by the first site's pearl cluster: halos, hairline orbit, paper dots and the hover question. It is polished to the current style: flat tea panel, matte pearls, no gloss or numerals, no looping motion.
  - The text column, below-the-fold sections and `/research/#map` are unchanged.
  - Before/after: `after/d15-home-desktop.jpg`, `d15-home-mobile.jpg`, `d15-hover.jpg`, `d15-dark-desktop.jpg`.
- **People counts** were removed from `/people/` and the homepage.
- **Copy sweep (commit `b6b380f`).** The text of all 81 pages was re-read by two editor reviewers and then a fresh one. Generated-sounding text was removed at the source:
  - stats written as sentences;
  - "as reported by the lab" footnotes and daggers;
  - "This direction was last updated…";
  - robotic meta descriptions;
  - "Status not confirmed" rows.
  - No facts changed. Changes to the lab's own wording are logged as C-1…C-64 in `../CONTENT-QUESTIONS.md`.
- **Majors.** Five alumni majors confirmed from their own public pages were added. Probable and unknown majors are listed in `../CONTENT-QUESTIONS.md` → "Majors to collect".
- **Tests after this round:**
  - unit: 826 passed;
  - Playwright on the export: Chromium 221 and WebKit 218 passed, 0 failed (two provenance tests were merged into one "no provenance marks" test);
  - axe: 0 violations;
  - budgets: met.
