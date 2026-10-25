# scripts/import (WP7)

> **Retired (DECISIONS D-11, 2026-10-24).** `content/` is now edited directly (CMS or by hand). Do not run this importer with `--write`; it would overwrite those edits.

Re-runnable importer from the research dataset (`content-dataset.json`, kept **outside** the repo because it mentions people who are not on the public roster) to `content/**`.

```sh
# dry run: prints counts, notes, dropped items and questions for the PI
node scripts/import/import-dataset.mjs --dataset <path/to/content-dataset.json>
# write content/ (overwrites generated files; --prune also deletes files the import no longer produces)
node scripts/import/import-dataset.mjs --dataset <path> --write [--prune]
# exit 1 if content/ differs from what the import would produce
node scripts/import/import-dataset.mjs --dataset <path> --check
```

`BOBALAB_DATASET=<path>` works instead of `--dataset`. Output is formatted with the repo's Prettier config, so `--check` is exact. `tests/unit/wp7/content-wording.test.ts` checks the wording rules below on `content/`, and also runs `--check` when `BOBALAB_DATASET` is set.

**Never fix generated content by hand.** Change the importer (or `copy.mjs`) and re-run `--write`, then `--check`. A hand edit to `content/` makes `--check` fail and is lost on the next `--write`.

**Once the lab edits content in the CMS, do not re-run `--write` without reviewing the diff** (`git diff content/`): the importer overwrites every file it generates.

## Files

| File                 | Role                                                                                                                                                                        |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `import-dataset.mjs` | The importer (mapping + safety checks + write/check).                                                                                                                       |
| `lib.mjs`            | Pure helpers: slugs (D-05), https upgrades, question choice, YAML front matter. Tested in `tests/unit/wp7/import-lib.test.ts`.                                              |
| `copy.mjs`           | WP7's hand-written **draft** copy: direction questions/bodies and the five pages. Own words, grounded in documented facts; all `draft: true`.                               |
| `hidden-names.mjs`   | Salted-hash scanner for the hidden-only roster names (D-06, brief WP7 #6). Used by the importer (refuses to write a match) and by `tests/content/wp7-hidden-names.test.ts`. |

## Rules

`docs/CONTENT-MAPPING.md` (WP0) is followed, with these WP7 rules from the orchestrator's binding brief, which take precedence where they differ:

1. **Direction `question`**: prefer a non-inferred question that matches one of the five URAP questions; else the first non-inferred question ≤ 140 chars. Inferred questions (`inferredQuestionIdx`) are never used. Two too-long, non-inferred questions are shortened in our own words (`copy.mjs` → `DIRECTION_QUESTIONS.override`): Algorithmic Advice (URAP "precise vs. broad"; the mapping table picked question 3 instead) and Pricing (the mapping left it empty).
2. **Direction `body`**: a drafted 80–150-word text that only describes what the listed papers study (no results), instead of the mapping's "Questions we ask:" list. Unused questions are listed in `docs/CONTENT-QUESTIONS.md` (C6, C7).
3. **`status_source`**: `self-reported` for every non-published item, except the four whose state is on a public posting, which are `documented` as the mapping says: Teachers' Knapsack and Dispatching to Develop (SSRN), Strategic Advice and Stale, Misattributed, or Late (arXiv). This reverses the first WP7 rule (WP3 request 4 item 2).
4. **`pages/home.yml` → `mission`**: a draft paraphrase of the URAP framing instead of being omitted.
5. **PI `draft: false`** only because every PI fact written (name, title, links) is verified; no bio is written.
6. **"Others" alumni** stay `listed: false` as the mapping says (the brief's "visible alumni listed: true" is overridden by D-05's no-affiliate-without-consent rule); question E8.

Integration and verify-phase rules (2026-10-20). Every hand edit made to `content/` during integration is carried here, so `--check` exits 0 and a re-run never undoes a fix:

7. **Venue corrections** (`VENUE_FIXES`): the two PACM HCI papers lose "(CSCW 2025)" from the journal name and gain a "CSCW 2025, Bergen" presentation with the programme URL (WP3 request 4 item 1).
8. **Presentation text** (`lib.mjs`): ISO dates are written "Jul 14, 2026" (`humanDates`), and the CV's spelled-out conference names replace lab abbreviations such as BOC, BDRM, INFORMS RMP and YinzOR (CMU) (`expandEventNames`, CON-13). Formatting only; an event over 200 chars fails the import.
9. **The PI's name** (CON-08, CON-07): public copy never says "the PI" (`namePI`; the import fails if any generated file except `site.yml` does). News titles and summaries name "Park Sinchaisri" in full on first mention (`fullNameFirst`). Author lists cite the PI as `settings.piCitationName` on every paper, whatever form the source listing used.
10. **Programs** (`programLabel`, CON-04): the roster's lower-case tags are shown in display casing (`eecs` → `EECS`, `applied math/ds` → `Applied Math/DS`), and a trailing degree the role already states is dropped (`ieor ms` for a master's student → `IEOR`). No abbreviation is expanded; that needs the member (H-11).
11. **News**: talk dates and places come from `NEWS_EVENTS` (taken from each item's summary; MSOM 2026 uses Jul 14, the day of the talks). Item-specific rewordings sit in `NEWS_SUMMARY` and fail the import when the dataset text changes. Number ranges use an en dash. A `publication` item stays `draft: true` while every paper it is about is a draft, or when its review label is "PI-reported" (a journal decision that is not publicly verifiable, CON-02).
12. **Opportunities**: routes use the PI's name and en-dash ranges; the URAP route's " - apply" separator becomes a sentence break (WP5 request 8 item 3).
13. **People**: the PI's `links.haas` comes from the dataset (WP5 request 2).
14. **`site.yml`**: no YAML comments (the first CMS save of Settings deletes them). The FLAGGED notes sit in `editors_note`, which the CMS shows and keeps (CNT-01).

Safety checks that fail the import: any `full-view` text (R2 §7.5), "the PI" in public copy, a news rewording that no longer matches the dataset, press for The Conversation / The 74 not on the Knapsack paper, the AOM 2019 award not named "Best Student Paper", a broken link being imported, a hidden-only name in any output, over-long fields, a direction body outside 80–150 words, an unmapped status/type/category.

## Links upgraded from http (MEASURED 2026-10-20, `curl -I` → https 30x)

`www.linkedin.com`, `hdl.handle.net`, `www-stat.wharton.upenn.edu`, `repository.upenn.edu`, `www.samanthakeppler.com`. Other http hosts are dropped and reported.
