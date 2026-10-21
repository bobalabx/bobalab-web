# Verify publications request 3: CMS field for award provenance

- Finding: CON-03. Apply with `publications-1.md` (schema field).
- File(s) (cms): `cms/source.mjs` (publication `awards` list, ~l.421), then regenerate
  `public/admin/config.yml` with the usual `scripts/cms/**` generator.
- Why: editors must be able to mark an award as self-reported, or clear the mark once the
  lab supplies a citable source (D11). Mirror the existing `status_source` field.

## Proposed change

```diff
       awards: {
         label: "Awards",
         summary: "{{fields.name}} ({{fields.year}})",
         fields: {
           name: { label: "Award" },
           year: { label: "Year" },
           under_title: {
             label: "Awarded under the title",
             hint: "Only if the paper had a different title then.",
           },
+          source: {
+            label: "Source",
+            options: {
+              documented: "Documented (the awarding body lists it)",
+              "self-reported": "Self-reported (only the lab or a CV says so)",
+            },
+            hint: "Self-reported awards are labelled “reported by the lab” on the paper page.",
+          },
         },
       },
```

(Use the same select/optional mechanics `status_source` uses in this file.)

- Blocking? No.
- Test that proves it: `tests/unit/cms/**` config/schema parity test stays green, since the
  CMS field matches the new optional schema enum.

Status: Applied by the final verifier (2026-10-20) in cms/source.mjs; `npm run cms:config` regenerated public/admin/config.yml; `npm run cms:check` clean. Commit "verify(cms): …".
