# WP5 request 2: put the PI's Haas profile URL on the PI record (after request 1)

- File(s): `content/people/park-sinchaisri.md` (WP7)
- Why: brief §D11 (About: "PI summary with links to the Haas profile" [D: HAAS-P]). The URL is already a documented source in the brief (§J HAAS-P) and appears in the draft About body. Moving it to the (non-draft) PI record makes it render in production in the About fact sheet, independent of the About text's review status.
- Proposed change (only once request 1 adds `links.haas` to the schema, otherwise E_SCHEMA):
  ```diff
   links:
  +  haas: https://haas.berkeley.edu/faculty/park-sinchaisri/
     website: https://parksinchaisri.github.io/
  ```
- Blocking? no.
- Test that proves it: `npm run validate` stays at 0 errors; `/about/` fact sheet lists "Haas faculty profile" first.

Status: Applied in integration commit "integration: apply change requests" (2026-10-20).
