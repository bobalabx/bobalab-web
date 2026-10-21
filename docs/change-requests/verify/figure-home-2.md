# Verify request figure-home-2: mobile Lighthouse LCP 2.6–3.0 s. Dropping font preloads does not fix it (measured)

- File(s): src/fonts/index.ts, src/fonts/*.woff2 (shared-foundation). Possibly
  docs/PERF-BASELINE.md (ci-docs).
- Why: finding ENG-01. Brief §G2 sets LCP ≤ 2.5 s, with a lab target ≤ 1.8 s, on
  Lighthouse mobile. The finding proposed `preload: false` on IBM Plex Mono (and maybe
  Fraunces). figure-home tested that proposal and it **does not move LCP**. This
  request records the evidence so nobody ships that change expecting a gain.

## What was measured (MEASURED 2026-10-20)

Setup: an isolated copy of the repo with the verify-phase sources as of 19:30. Three
production exports (`npm run build`) differ only in `src/fonts/index.ts`. Each is
served by `scripts/serve-out.mjs`, gzip on, ports 3241–3243. `node
scripts/perf/lighthouse.mjs` ran twice per variant, with Lighthouse 13.5.0 mobile.
Reports are in test-results/verify-figure-home/lh-{base,mono,inter}-{1,2}/.

| Variant        | Preloaded fonts                       | home LCP (run 1 / 2) | publications LCP | people LCP  | home Perf |
| -------------- | ------------------------------------- | -------------------- | ---------------- | ----------- | --------- |
| base (current) | Fraunces, Inter, Plex Mono (97.4 KiB) | 2.8 / 2.8 s          | 2.7 / 2.9 s      | 3.0 / 2.6 s | 96 / 96   |
| mono           | Fraunces, Inter                       | 2.8 / 2.8 s          | 2.8 / 2.8 s      | 2.6 / 3.0 s | 95 / 96   |
| inter          | Inter only                            | 1.7 / 2.8 s          | 2.9 / 2.8 s      | 2.6 / 2.6 s | 100 / 95  |

Accessibility, Best Practices and SEO were 100 on every run. The direction page is
missing from production while every direction is a draft.

### Why the preload flag doesn't matter

The `network-requests` audit (home.report.json) explains it. Without `preload`, the
browser still requests Plex Mono and Fraunces before the observed LCP, at about 46–51
ms, because the visible text uses them. They then run at **VeryHigh** priority instead
of High. The observed LCP is 108–155 ms and equals the observed FCP, since the LCP is
a text node. Lantern therefore keeps every font, and all of the roughly 143 KB gz of
JS requested before that moment, in the simulated LCP graph, whatever the preload
flag says. Run-to-run noise is about ±1.1 s: the 1.7 s home run happened to observe
FCP before the late requests started.

The original experiment (blocking `*.woff2` gives LCP −0.65 s) removes the bytes
entirely. That is not a deployable fix.

## What would actually move it (needs the foundation owner, and maybe a decision)

1. **Fewer font bytes.** Subset Inter (48 KB) and Fraunces (37 KB) to the glyphs the
   site uses. For example, Basic Latin + Latin-1 + General Punctuation plus the arrows
   and the middle dot, with weight axes limited to the weights in use (Inter 400–600,
   Fraunces 560–600). This should save tens of KB on the critical path (UNVERIFIED:
   no subset was built). It needs a woff2 encoder. fontTools 4.64 is on this machine,
   but its `brotli` module is not, so figure-home could not build or measure the
   subset without installing a tool.
2. **Fewer JS bytes before first paint.** The ~139 KB gz baseline B is the Next/React
   runtime (docs/PERF-BASELINE.md). Home adds only ~4 KB on top, so the home area has
   no lever here.
3. **Owner decision on the lab metric.** Field LCP for these text-LCP pages is close
   to FCP (≈ 1.0 s simulated, 110–155 ms observed locally). If (1) is not wanted,
   record in docs/PERF-BASELINE.md that Lantern's mobile LCP on text pages is bounded
   by total early bytes, and that the §G2 2.5 s budget is missed by 0.1–0.5 s for
   that reason.

- Proposed change: do **not** apply `preload: false` for this finding (no measured
  gain). Apply option (1), or take decision (3).
- Blocking? no. Performance scores stayed at or above 95 on home and publications in
  every run. /people/ scored 94 in 2 of 6 runs, from the same noise.
- Test that proves it: re-run `node scripts/perf/lighthouse.mjs --base <served prod
export>` at least 3 times and compare median LCP against this table.

Status: Declined as proposed (preload: false gives no measured gain), not applied. Option (1) font subsetting could not be built here either: Python fontTools 4.64 is present but its brotli module is not, so it can neither read nor write woff2 (re-checked by the final verifier 2026-10-20). Owner decision needed: subset the fonts with a woff2-capable toolchain, or record the 2.5 s §G2 miss in docs/PERF-BASELINE.md (see docs/TESTING-REPORT.md).
