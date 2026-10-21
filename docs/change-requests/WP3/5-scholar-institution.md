# WP3 request 5: Scholar institution tags should name an institution, not the venue string

- File(s): `src/lib/seo/scholar.ts` (WP0)
- Why: `scholarMeta()` copies `venue` verbatim into the institution tags, so Google Scholar would read
  `citation_technical_report_institution = "SSRN working paper 4502968"` / `"arXiv preprint"` and
  `citation_dissertation_institution = "Ph.D. dissertation, University of Pennsylvania"` (MEASURED on the dev
  server before the WP3 workaround). Scholar's inclusion guide expects the institution name, plus
  `citation_technical_report_number` for a report.
- Workaround in place (WP3): `paperScholarMeta()` in `src/lib/publications/seo.ts` removes those two keys and
  recomputes them from the citation parser (`toCsl()` in `src/lib/publications/csl.ts`): SSRN series → "SSRN" +
  number; thesis → school; arXiv → none. Paper pages use it, and they emit Scholar tags only for papers with a
  public version (`wantsScholarMeta`; a talk-only page has nothing for Scholar to read).
- Proposed change: either adopt WP3's logic in `scholarMeta()` (it may import the pure `toCsl` from
  `@/lib/publications/csl`), or leave `scholarMeta()` as the generic base and note in its doc comment that
  venue-derived institution tags are the caller's job. No other package calls `scholarMeta()` today.
- Blocking? No.
- Test that proves it: `tests/unit/publications/seo.test.ts` "paper SEO by publication type";
  `tests/e2e/publications.spec.ts` "Scholar tags: only for papers with a public version, with a real institution".
