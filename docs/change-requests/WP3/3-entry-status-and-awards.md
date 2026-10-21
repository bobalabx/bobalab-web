# WP3 request 3: list entries: no "Working paper" status echo, and a short awards list

- File(s): `src/components/ui/PublicationEntry.tsx` (WP0)
- Why (WP3 adversarial review, MEASURED on the shared dev server, `test-results/WP3/review/index-1366-light.part1.png`):
  1. **Status echo.** For a working paper whose status is just `working-paper`, the entry reads
     `[Working paper] 2026` … `SSRN working paper 7151739 · Working paper · as of Aug 2026 · reported by the lab`:
     "working paper" three times, and "reported by the lab" attached to something that is not a review claim
     (brief §D7 asks for the lab's own claim on _review statuses_). Affects 3 entries in preview, 1 in production
     (`keppler-2026-teachers-knapsack`). The paper page already drops this note (`StatusNote` in
     `src/components/publications/PaperParts.tsx`), so lists and paper pages now disagree.
  2. **Awards weight (optional, art direction).** The Management Science paper has 7 awards, 5 with an
     "(as …)" earlier-title note: about 13 lines in the middle of a 17-entry list at 1366 px and about 23 at 390 px,
     which buries the materials row. The full list (with the earlier titles, which must stay for honesty) is on
     the paper page under "Awards".
- Proposed change:

  ```diff
   export function statusLine(
     p: Pick<PublicationView, "status" | "status_note" | "as_of" | "status_source">,
  +  type?: PublicationView["type"],
   ): string | null {
     if (p.status === "published") return null;
  +  // A bare "Working paper" status repeats the type badge and claims nothing.
  +  if (p.status === "working-paper" && type === "working-paper" && !p.status_note) return null;
  …
  -  const status = statusLine(pub);
  +  const status = statusLine(pub, pub.type);
  ```

  Optional (2): show at most two awards in lists, then a link to the paper page's awards section:

  ```tsx
  const shown = pub.awards.slice(0, 2);
  const more = pub.awards.length - shown.length;
  …
  {more > 0 && (
    <li>
      <Link href={`/publications/${pub.slug}/#awards-h`}>
        {more} more {more === 1 ? "award" : "awards"}
        <span className="vh"> for {pub.title}</span>
      </Link>
    </li>
  )}
  ```

  (`#awards-h` is the id of the "Awards" heading on the paper page.)

- Blocking? No.
- Test that proves it: `tests/e2e/publications.spec.ts` "statuses show the lab's claim…" already skips bare
  working-paper statuses; add `expect(statusLine({ status: "working-paper", … }, "working-paper")).toBeNull()`
  to the WP0 unit tests.

Status: Applied in integration commit "integration: apply change requests" (2026-10-20): `statusLine(p, type)` drops a bare working-paper status (all callers pass the type), and list entries show at most two awards plus a "N more awards" link to `#awards-h` whose accessible name includes the title.
