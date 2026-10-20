# scripts/import (WP7)

Re-runnable importer from the research dataset (`content-dataset.json`, kept **outside** the repo because it mentions people who are not on the public roster) to `content/**`.

```sh
# dry run: prints counts, notes, dropped items and questions for the PI
node scripts/import/import-dataset.mjs --dataset <path/to/content-dataset.json>
# write content/ (overwrites generated files; --prune also deletes files the import no longer produces)
node scripts/import/import-dataset.mjs --dataset <path> --write [--prune]
# exit 1 if content/ differs from what the import would produce
node scripts/import/import-dataset.mjs --dataset <path> --check
```

`BOBALAB_DATASET=<path>` works instead of `--dataset`. Output is formatted with the repo's Prettier config, so `--check` is exact.

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
3. **`status_source`**: `self-reported` for every non-published item (brief WP7 #3), including the four the mapping marked `documented` (SSRN/arXiv postings).
4. **`pages/home.yml` → `mission`**: a draft paraphrase of the URAP framing instead of being omitted.
5. **PI `draft: false`** only because every PI fact written (name, title, links) is verified; no bio is written.
6. **"Others" alumni** stay `listed: false` as the mapping says (the brief's "visible alumni listed: true" is overridden by D-05's no-affiliate-without-consent rule); question E8.

Safety checks that fail the import: any `full-view` text (R2 §7.5), press for The Conversation / The 74 not on the Knapsack paper, the AOM 2019 award not named "Best Student Paper", a broken link being imported, a hidden-only name in any output, over-long fields, a direction body outside 80–150 words, an unmapped status/type/category.

## Links upgraded from http (MEASURED 2026-10-20, `curl -I` → https 30x)

`www.linkedin.com`, `hdl.handle.net`, `www-stat.wharton.upenn.edu`, `repository.upenn.edu`, `www.samanthakeppler.com`. Other http hosts are dropped and reported.
