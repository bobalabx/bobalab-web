# WP2 request 2: missing space in PearlTag's small-dot class

- File(s): src/components/ui/PearlTag.tsx (WP0)
- Why: `PearlTag` builds the dot class as `` `bl-dot${size === "sm" ? "bl-dot--sm" : ""}` ``, so `size="sm"` renders `class="bl-dotbl-dot--sm"`. Neither `.bl-dot` nor `.bl-dot--sm` then matches, and the dot disappears (the tag would rely on colour-free text only, which is still accessible, but the §C9 dot is lost). Found while reading the component; WP2 does not use `size="sm"`, so nothing on WP2 pages is affected today.
- Proposed change:

  ```diff
  -      className={`bl-dot${size === "sm" ? "bl-dot--sm" : ""}`}
  +      className={`bl-dot${size === "sm" ? " bl-dot--sm" : ""}`}
  ```

- Blocking? No.
- Test that proves it: render `<PearlTag label="x" size="sm" />` and assert the dot's class list is `["bl-dot", "bl-dot--sm"]`.
