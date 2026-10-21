# WP4 request 4: no self-link to the person page from that person's own author lists

- File(s): `src/components/ui/PublicationEntry.tsx` (WP0)
- Why: on `/people/{slug}/` every paper lists the page's own person as a linked author ("Wichinpong Park Sinchaisri" links to `/people/park-sinchaisri/` 25 times on the PI page). A link to the page you are on is noise for keyboard and screen-reader users (25 extra tab stops that go nowhere) and reads as a mistake to a sighted visitor. Found by the WP4 adversarial review, 2026-10-20 (screenshots `test-results/WP4/review/pi-1366-light.part0.png`).
- Proposed change (backwards compatible): an optional `currentPerson` prop, passed down to `Authors`:

  ```tsx
  function Authors({ authors, currentPerson }: { authors: AuthorView[]; currentPerson?: string }) {
    …
        if (a.isLab && a.person) {
          name =
            a.person.hasProfile && a.person.slug !== currentPerson ? (
              <Link href={`/people/${a.person.slug}/`} className="bl-pub__author--lab">{a.name}</Link>
            ) : (
              <strong className="bl-pub__author--lab">{a.name}</strong>
            );
        }
  …
  export function PublicationEntry({ pub, as, showTags, showType, currentPerson }: { …; currentPerson?: string }) {
    …
    <Authors authors={pub.authorList} currentPerson={currentPerson} />
  ```

  WP4 then passes `currentPerson={p.slug}` from `src/components/people/PersonProfile.tsx` (two call sites: Publications and Work in progress).

- Blocking? No. Today the self-links work; they are just redundant.
- Test that proves it: `renderToStaticMarkup(<PublicationEntry pub={…} currentPerson="avery-example" />)` contains `<strong class="bl-pub__author--lab">Avery Example</strong>` and no `href="/people/avery-example/"`; WP4 adds `expect(html).not.toMatch(/href="\/people\/avery-example\/?"[^>]*class="bl-pub__author--lab"/)` to `tests/unit/people-page/render.test.tsx` once it lands.
