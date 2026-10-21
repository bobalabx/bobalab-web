# WP1 request 5: `PublicationEntry` option to leave the award list out (home digest)

- File(s): src/components/ui/PublicationEntry.tsx (WP0)
- Why: brief §D3.3 lists what a home "Recent publications" entry shows: type badge, year, title, authors, venue/status, tags and the materials row. The award list is not in it. With real content, the first home entry (the Management Science paper) carries seven award badges, each with an "(as “…earlier title…”)" note: 7 rows at 1366 px and a full phone screen at 390 px, which buries the other four papers (MEASURED, review screenshots `test-results/WP1/review/_1366full-0.png`, `_390full-1.png`). The awards stay on `/publications/` and on the paper page.
- Proposed change: add a prop, default unchanged:

  ```tsx
  export function PublicationEntry({
    pub, as: H = "h3", showTags = true, showType = true, showAwards = true,
  }: { …; showAwards?: boolean }) {
    …
    {showAwards && pub.awards.length > 0 && ( <ul className="bl-pub__awards" …> … </ul> )}
  ```

  Then WP1 passes `showAwards={false}` in `src/components/home/HomeSections.tsx` and deletes the `.hm-sec .bl-pub__awards { display: none; }` work-around in `src/components/home/home.css`.
  (Optional, nicer: `showAwards="count"` renders one muted line "7 awards" linking to the paper page.)

- Blocking? no. Work-around in `src/components/home/home.css` (CSS `display: none`, so the list is also hidden from assistive tech).
- Test that proves it: on `/`, `section[aria-labelledby="h-pubs"] .bl-pub__awards` has count 0 (not merely hidden); `/publications/` still shows the awards.

Status: Applied in integration commit "integration: apply change requests" (2026-10-20). `PublicationEntry` has `showAwards` (default true); `HomeSections.tsx` passes `showAwards={false}`; the home.css `display: none` work-around is removed.
