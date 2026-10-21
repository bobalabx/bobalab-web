# WP5 request 3: About text without the PI and contact lists (they are now structured)

- File(s): `content/pages/about.yml` (WP7)
- Why: `/about/` (brief §D11) renders an "At a glance" fact sheet next to the About text, built from `site.yml` (name, affiliation, address, email) and the PI's person record (name, title, links). The body's own `## Principal investigator` link list and `## Contact` list repeat the same facts in the same view (MEASURED: `test-results/WP5/about-1366-light.png`). Keeping one source also means a changed address or email is edited once, in `site.yml`.
- Proposed change: keep the narrative; drop the duplicated lists.
  ```diff
   body: |
     ## What we study
     …
     ## Principal investigator

     Park Sinchaisri is an Assistant Professor … since 2021.
  -
  -  - [Haas faculty profile](https://haas.berkeley.edu/faculty/park-sinchaisri/)
  -  - [Personal website](https://parksinchaisri.github.io/)
  -
  -  ## Contact
  -
  -  - Email: [bobalab@berkeley.edu](mailto:bobalab@berkeley.edu)
  -  - Mail: Haas School of Business, 2220 Piedmont Avenue, Berkeley, CA 94720
  ```
  (The Haas link moves to the PI record, WP5 request 2.)
- Blocking? no. Until then the page shows both; nothing is wrong, only repeated.
- Test that proves it: `/about/` shows the email once in `main` outside the fact sheet's `mailto` (visual check of `test-results/WP5/about-*.png`).
