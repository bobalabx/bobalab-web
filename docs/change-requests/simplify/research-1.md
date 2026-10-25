# research-1: Fig. 1 moved to /research/#map. Pre-paint intro gate, tests and docs follow it

**Status (integration, 2026-10-25):** Patches 1, 2 and 4 APPLIED (Patch 1 merged with home-1: the cup branch stays). Patch 3 APPLIED in the amended form from research-2 item 2. The optional `DirectionHeader` "All directions" → `/research/#map` change is NOT applied: it changes a navigation target the owner has not asked about, and the plain page swap to `/` is harmless; listed for the owner in `docs/simplify/REPORT.md`.

**From:** RESEARCH (simplify), 2026-10-25.
**To:** the owners of `src/lib/site/motion.ts`, `tests/e2e/kit.spec.ts`, `tests/unit/foundation/misc.test.ts`, `docs/ARCHITECTURE.md` and `docs/DECISIONS.md` (the integrator).
**Coordinate with:** `home-1` (HOME's cup pre-paint branch), if it exists.

## Why

D-14 moved Fig. 1 from the homepage to `/research/`. It now sits in `<section id="map">`, "Explore: how the N directions connect", in a full-bleed `--band` band after the directions ledger. It is rendered by `PearlFigure` with a new optional `heading` prop: the heading, a one-sentence key and a short caption.

On /research the figure sits below the fold, so the old intro gate no longer works. That gate set `<html data-intro>` from the pre-paint script on the first **home** view, and its animation would play unseen. The figure's arrival now works like this:

- `FigureIsland` drives it on the plate itself: `.f1-plate[data-intro="wait" | "play"]` in `figure.css`.
- It plays once per session, when the map first scrolls into view.
- It uses the figure's documented key, `sessionStorage["bobalab-intro"]`. That keeps the privacy page and the `offorigin.spec` storage allow-list true. HOME's cup uses its own key, `bobalab-cup-intro`.
- A plate that is already on screen when the island mounts is never held back or animated. This covers a hard load of `/research/#map` and a client navigation that lands on it. No-JS and reduced motion draw the figure at rest.

**The problem.** The pre-paint script still sets `bobalab-intro` (and `<html data-intro>`) on the first home view. So a visitor who starts on the homepage never sees the map arrive, and nothing on the homepage uses `:root[data-intro]` any more: `figure.css` no longer reads it. Nothing breaks without this request; the map arrival is simply suppressed after a home visit.

## Patch 1: `src/lib/site/motion.ts`

Drop the home branch of the pre-paint script, and keep the motion preference. If `home-1` adds a cup branch keyed on `bobalab-cup-intro`, keep that branch and drop only this one.

```diff
 /**
  * Pre-paint script body (runs synchronously in <head> before first paint):
- * 1. apply the stored motion preference;
- * 2. on the first home view of the browser session, set <html data-intro>
- *    (removed after 2 s) so the Fig. 1 intro plays once (D-02a, WP1 request 3).
+ * apply the stored motion preference. (D-14: Fig. 1's once-per-session arrival
+ * moved to /research/#map; FigureIsland starts it when the map scrolls into view,
+ * under INTRO_STORAGE_KEY. The homepage cup has its own key.)
  */
 export function prePaintSource(basePath: string): string {
-  const b = JSON.stringify(basePath.replace(/\/+$/, ""));
+  void basePath; // kept for the call site (PrePaintScript) and for home-1
   return (
     `(function(){var d=document.documentElement;` +
-    `try{if(localStorage.getItem(${JSON.stringify(MOTION_STORAGE_KEY)})==="reduce")d.setAttribute("data-motion","reduce")}catch(e){}` +
-    `try{var b=${b},p=location.pathname;` +
-    `if((p===b+"/"||p===b+"/index.html"||p===b)&&!sessionStorage.getItem(${JSON.stringify(INTRO_STORAGE_KEY)})){` +
-    `sessionStorage.setItem(${JSON.stringify(INTRO_STORAGE_KEY)},"1");d.setAttribute("data-intro","");` +
-    `setTimeout(function(){d.removeAttribute("data-intro")},2000)}}catch(e){}})();`
+    `try{if(localStorage.getItem(${JSON.stringify(MOTION_STORAGE_KEY)})==="reduce")d.setAttribute("data-motion","reduce")}catch(e){}` +
+    `})();`
   );
 }
```

Also update the comment on `INTRO_STORAGE_KEY`:

```diff
-export const INTRO_STORAGE_KEY = "bobalab-intro";
+/** Fig. 1's arrival on /research/#map has played this session (set by FigureIsland). */
+export const INTRO_STORAGE_KEY = "bobalab-intro";
```

## Patch 2: tests that pin the old gate

`tests/unit/foundation/misc.test.ts`, "pre-paint script":

```diff
-  it("applies the stored motion choice and sets data-intro once per session on home", () => {
+  it("applies the stored motion choice; the intro gate is no longer pre-paint (D-14)", () => {
     const src = prePaintSource("/site");
     expect(src).toContain('localStorage.getItem("bobalab-motion")');
-    expect(src).toContain('sessionStorage.getItem("bobalab-intro")');
-    expect(src).toContain('"/site"');
+    expect(src).not.toContain('"bobalab-intro"');
     expect(() => new Function(src)).not.toThrow();
   });
```

`tests/e2e/kit.spec.ts`, "data-intro is set on the first home view only": replace the test. The behaviour now lives in `tests/e2e/figure.spec.ts` ("intro: papers arrive once per session when the map scrolls into view…"). That figure.spec test already asserts that `/research/` never sets the root attribute.

```diff
-test("data-intro is set on the first home view only", async ({ page }) => {
-  await page.goto("/");
-  expect(await page.evaluate(() => document.documentElement.hasAttribute("data-intro"))).toBe(true);
-  await page.waitForTimeout(2100); // the pre-paint script clears it after 2 s (WP1 request 3)
-  expect(await page.evaluate(() => document.documentElement.hasAttribute("data-intro"))).toBe(
-    false,
-  );
-  await page.goto("/");
-  expect(await page.evaluate(() => document.documentElement.hasAttribute("data-intro"))).toBe(
-    false,
-  );
-});
+test("the pre-paint script no longer sets data-intro (D-14: Fig. 1 arrives on /research/#map)", async ({
+  page,
+}) => {
+  await page.goto("/");
+  expect(await page.evaluate(() => document.documentElement.hasAttribute("data-intro"))).toBe(
+    false,
+  );
+  expect(await page.evaluate(() => sessionStorage.getItem("bobalab-intro"))).toBeNull();
+});
```

**Ordering.** Apply this test patch only together with Patch 1. Until then, the old kit test still passes against the old script.

## Patch 3: `docs/ARCHITECTURE.md`

§4, the Motion bullet:

```diff
-… opt-in `.bl-steep` (filter results) and `.bl-settle` (6 px arrival). `<html data-intro>` stays for 2 s on the first home view. Reduced motion …
+… opt-in `.bl-steep` (filter results) and `.bl-settle` (6 px arrival). Fig. 1's arrival (D-14) is plate-scoped: `FigureIsland` sets `.f1-plate[data-intro="wait"]` while the map is below the fold and `"play"` when it scrolls into view, once per session (`sessionStorage["bobalab-intro"]`), never on a figure already painted. Reduced motion …
```

§4, the Motion preference bullet:

```diff
-… the footer switch uses them. Intro flag: `sessionStorage["bobalab-intro"]`.
+… the footer switch uses them. Intro flags: `sessionStorage["bobalab-intro"]` (Fig. 1 on /research/#map, set by FigureIsland) and `"bobalab-cup-intro"` (the homepage cup, HOME).
```

"Redesign 2026-10", item 11: append after "…wording pending PI sign-off.":

```
    D-14 (simplify): Fig. 1 left the homepage. `/research/` renders it in `<section id="map"
    aria-labelledby="map-h">` ("Explore: how the N directions connect") in a full-bleed `--band`
    band after the directions ledger, via `<PearlFigure model={buildFigure(c)} heading={…} />`:
    the heading in the label column, a one-sentence key with inline glyphs beside it (its clauses
    follow the data and the same container queries as the marks), and a short caption. Inside the
    band the figure's ground is `--band` and the zone after "now" is `--paper` (`--f1-ground`,
    `--f1-zone`). View-transition names on /research: only the map's lane pearls carry
    `pearl-{slug}`. The ledger has no pearls, and the live ledger rows no longer draw a
    `DirectionStrip` (the map draws the same papers). "Earlier and related research" keeps its
    strips, because archived directions are not on the map.
```

## Patch 4: `docs/DECISIONS.md`, D-14

Append to the "The timeline is not deleted" bullet:

```
  Built (RESEARCH package): open by default, no disclosure; the key is one sentence above the
  plate; the arrival plays once per session when the map scrolls into view. The live ledger
  dropped its per-row strips because they duplicated the map (JUDGE.md recommendation; **owner
  to confirm**, and restore them by passing `strip` to the live `DirectionRow`s in
  `src/app/research/page.tsx`). The map's lane pearls are the page's only `pearl-{slug}` elements.
```

## Optional (not required by D-14; owner or direction package to decide)

`src/components/direction/DirectionHeader.tsx`: "All directions" still links to `/` with `pearl-close`.

- The homepage cup names a pearl only while that pearl is risen, so the reverse morph has no target on `/`. The result is a plain page swap, which is harmless.
- If the owner wants the reverse morph back, point it at the map, whose pearls are always named and are scrolled into view by the anchor:

```diff
-            <Link href="/" className="dr-back" transitionTypes={[TRANSITION.pearlClose]}>
+            <Link href="/research/#map" className="dr-back" transitionTypes={[TRANSITION.pearlClose]}>
               All directions
             </Link>
```

`tests/e2e/research.spec.ts` asserts `.dr-back` → `/` on live direction pages; the RESEARCH package would update that one line. The reverse-morph test already follows whatever the link's `href` is.
