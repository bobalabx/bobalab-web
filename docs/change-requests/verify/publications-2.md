# Verify publications request 2: importer and content set `source: self-reported` on PI-reported awards

- Finding: CON-03 (CONTENT-QUESTIONS D11). Apply after `publications-1.md` (schema field).
- File(s) (content): `scripts/import/import-dataset.mjs`,
  `content/publications/bastani-2026-rl-tips.md`,
  `content/publications/allon-2023-gig-drivers.md`,
  `content/publications/hariss-2020-markdown-pricing.md`
- Why: the dataset labels these awards "DOCUMENTED (PI-reported only)". The
  importer logs a note (~l.369) but drops the label, so the site cannot say so.
  This is provenance only: no award is added, removed or renamed.

## Proposed change

### `scripts/import/import-dataset.mjs` (awards map, ~l.369)

```diff
-    if (/PI-reported only/i.test(a.label ?? ""))
-      note(`${where}: award "${a.name}" (${a.year}) is PI-reported only (CV).`);
-    return compact({ name: a.name, year: a.year, under_title });
+    const selfReported = /PI-reported only/i.test(a.label ?? "");
+    if (selfReported) note(`${where}: award "${a.name}" (${a.year}) is PI-reported only (CV).`);
+    return compact({
+      name: a.name,
+      year: a.year,
+      under_title,
+      source: selfReported ? "self-reported" : undefined,
+    });
```

### Content (the four awards the dataset labels "PI-reported only")

`content/publications/bastani-2026-rl-tips.md`:

```diff
   - name: WISE (Workshop on Information Systems and Economics) Best Conference Paper
     year: 2022
+    source: self-reported
   - name: POMS College of Behavioral Operations Junior Scholar Paper Competition, 2nd place
     year: 2021
+    source: self-reported
```

`content/publications/allon-2023-gig-drivers.md`:

```diff
   - name: POMS College of Behavioral Operations Junior Scholar Paper Competition, Finalist
     year: 2020
+    source: self-reported
```

`content/publications/hariss-2020-markdown-pricing.md` (draft):

```diff
   - name: MIT Operations Research Center Best Student Paper, Honorable Mention
     year: 2017
+    source: self-reported
```

(Talks need no content change: PI-reported talks already have no `url`, and the
paper page notes "reported by the lab" for them, e.g. the CHI 2022 TRAIT talk on
`lee-2025-non-adoption-algorithmic-advice`.)

- Also update `docs/CONTENT-QUESTIONS.md` D11, column "Current": "Shown, marked
  'Reported by the lab' (PI's CV is the source)". When the lab supplies a
  citable source, change that award to `source: documented` (or remove the field).
- Blocking? No.
- Test that proves it: re-run the importer in check mode (if available) and confirm
  that it emits the same four `source: self-reported` lines. `npm run test`
  (content-dir) stays green. The e2e check in request 1 passes.

Status: Applied by the final verifier (2026-10-20): importer change verbatim; `import-dataset.mjs --write` produced exactly the four `source: self-reported` lines in the three files and `--check` then reports content/ matches the import; CONTENT-QUESTIONS D11 updated. Commit "verify(content): …".
