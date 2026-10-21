# WP3 request 2: one venue line for list entries and paper pages

- File(s): `src/components/ui/PublicationEntry.tsx` (WP0)
- Why: the list entry builds its own venue string, `Management Science, 72(1), 733-755` (hyphen, no year, no online date), while the paper page shows the brief §D8 form `Management Science 2026, 72(1):733–755; online May 22, 2025`. The same paper therefore reads two ways on the site, and page ranges use a hyphen instead of an en dash. WP3 ships a tested formatter: `venueLine()` / `pageRange()` in `src/lib/publications/csl.ts` (pure, no citation-js import; unit tests in `tests/unit/publications/csl.test.ts`).
- Proposed change (inside `PublicationEntry`):

  ```diff
  +import { pageRange } from "@/lib/publications/csl";
  …
     const venue = [
       pub.venue,
       pub.volume && `${pub.volume}${pub.issue ? `(${pub.issue})` : ""}`,
  -    pub.pages,
  +    pageRange(pub.pages),
     ]
  ```

  Minimal version: en dash only. Full version: render `<VenueLineText pub={pub} />` from `src/components/publications/PaperParts.tsx` (or move that small component into `components/ui/`), and drop the separate year from the meta row for journal articles, so lists and paper pages match.

- Blocking? No. Lists keep the current format until this lands.
- Test that proves it: `tests/unit/publications/csl.test.ts` ("venueLine … matches brief §D8 exactly"); `tests/e2e/publications.spec.ts` checks the paper-page line.

Status: Applied (minimal version) in integration commit "integration: apply change requests" (2026-10-20): list entries use `pageRange()` (en dash), so lists and paper pages agree on page ranges. The full version (one shared venue line, dropping the meta-row year for journal articles) is not applied: it changes the entry anatomy on every list (brief §D7) and needs a design pass.
