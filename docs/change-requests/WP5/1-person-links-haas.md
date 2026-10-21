# WP5 request 1: a `haas` profile link on person records

- File(s): `src/lib/content/schema.ts` (WP0), `src/components/ui/PersonCard.tsx` (WP0); the CMS field list in `cms/**` / `public/admin/config.yml` (WP6, schema parity test)
- Why: brief §D11 asks for the About page's PI summary "with links to the Haas profile" [D: HAAS-P]. `docs/CONTENT-MAPPING.md` §4.2 says the dataset's `links.haas` has "No person field; WP5 links the Haas profile from About". WP5 must not hard-code lab facts, so the URL has to live in content. Today it exists only inside the draft `content/pages/about.yml` body, so a production build (drafts excluded) shows no Haas link at all.
- Proposed change:
  ```diff
  // src/lib/content/schema.ts, personSchema.links
       links: z
         .strictObject({
  +        /** Faculty profile on haas.berkeley.edu (PI, affiliated faculty). */
  +        haas: externalUrlField.optional(),
           website: externalUrlField.optional(),
  ```
  ```diff
  // src/components/ui/PersonCard.tsx, LINK_LABELS
   const LINK_LABELS: Record<string, string> = {
  +  haas: "Haas profile",
     website: "Website",
  ```
  WP6: add the matching optional `haas` string field (pattern `^https://`) to the people collection's `links` object so the parity test stays green.
- Blocking? no. `src/components/pages/LabFacts.tsx` already reads `links.haas` generically (label "Haas faculty profile", listed first) and renders nothing when it is absent.
- Test that proves it: after WP5 request 2 lands, `tests/e2e/pages.spec.ts` "About › mission, PI summary…" finds a `https://haas.berkeley.edu/faculty/` link in the About fact sheet; `tests/unit/feed/production-render.test.tsx` can then assert it in production mode too.
