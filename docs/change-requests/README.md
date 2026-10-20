# Change requests

No file is edited by more than one package (brief §I). When a package needs a
change in a file it does not own (most often a WP0 file: `package.json`, the
layout, `src/styles/**`, `src/components/**`, `src/lib/content/**`), it writes a
request here instead of editing the file:

    docs/change-requests/WP<n>/<k>-<short-name>.md

One request per file, numbered from 1. Template:

```md
# WP<n> request <k>: <one line>

- File(s): src/…
- Why: what the package needs and which brief/decision section requires it
- Proposed change: exact diff or precise description
- Blocking? yes/no (can the package continue with a workaround?)
- Test that proves it: …
```

The WP0 owner applies requests during or after the parallel phase, then adds a
line `Applied in <commit>` (or `Declined: <reason>`) at the end of the request.
New npm dependencies are only ever added through WP0's `package.json`.
