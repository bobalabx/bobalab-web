# WP5 request 4: Join text should not restate the URAP status (one source per term)

- File(s): `content/pages/join.yml` (WP7)
- Why: DECISIONS D-05 makes `content/opportunities/*.md` the source of open/closed status with `as_of`. `/join/` renders each opportunity's status and "as of" date from there (the URAP card shows "Closed · as of Oct 20, 2026"). `join.yml → students` also hard-codes "**Status:** applications for Fall 2026 are closed (as of October 20, 2026)". When the lab updates `urap.md` next term (CONTENT-QUESTIONS G5), the prose would silently contradict the card.
- Proposed change:
  ```diff
  -  **Status:** applications for Fall 2026 are closed (as of October 20, 2026). Check the [URAP listing](https://urapprojects.berkeley.edu/list.php?faculty_id=F-1753) for the next term, or email [bobalab@berkeley.edu](mailto:bobalab@berkeley.edu).
  +  Check the [URAP listing](https://urapprojects.berkeley.edu/list.php?faculty_id=F-1753) for the current term, or email [bobalab@berkeley.edu](mailto:bobalab@berkeley.edu).
  ```
- Blocking? no.
- Test that proves it: `tests/e2e/pages.spec.ts` "Join › three audiences…" still passes (status text comes from `opportunities/urap.md`); `/join/` no longer shows "Fall 2026" in the students prose.
