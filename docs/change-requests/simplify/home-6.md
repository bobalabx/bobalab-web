# home-6: amend home-1 so a slow first load never cuts the pearls' settle short

**Status (integration, 2026-10-25):** APPLIED: the attribute is removed 1.2 s after `load`, not 1.2 s after the head script.

- **From:** HOME adversarial review (simplify), 2026-10-25. **To:** whoever applies `home-1` to `src/lib/site/motion.ts` (the integrator), together with `research-1`.
- **Amends:** `home-1.md`. Everything else in home-1 stands (the key, the home-path test, the kit test).
- **Why:**
  - home-1's pre-paint branch removes `<html data-cup-intro>` on a fixed timer: 1.2 s after the script in `<head>` runs.
  - The settle animations do not start then. They start when the pearls are first styled, which is after the stylesheet arrives, and they last up to 0.85 s (`cup.css`: `cup-settle`, `cup-fade`).
  - So when the CSS reaches the browser between about 0.35 s and 1.2 s after the head script (a phone on a middling connection; ENG-01 measured mobile LCP at 2.6–3.0 s), the timer removes the attribute mid-animation. The pearls then jump from part-way up to the floor. That is the visible jump the home-1 gate exists to prevent.
  - Anchoring the timer to `load` fixes this. `load` waits for the stylesheets, so the animations have begun by then, and 1.2 s after `load` they have finished. Removing the attribute after they end changes nothing on screen.
- **Blocking?** No. Without this amendment the intro is occasionally clipped on slow first loads.
- **Patch.** This applies to home-1's proposed code. If research-1 removed the `data-intro` branch, `once` is only used for the cup.

```diff
   const once = (key: string, attr: string, ms: number) =>
     `if(!s.getItem(${JSON.stringify(key)})){s.setItem(${JSON.stringify(key)},"1");` +
-    `d.setAttribute("${attr}","");setTimeout(function(){d.removeAttribute("${attr}")},${ms})}`;
+    `d.setAttribute("${attr}","");addEventListener("load",function(){` +
+    `setTimeout(function(){d.removeAttribute("${attr}")},${ms})})}`;
```

- **Tests:**
  - home-1's kit test still holds as written: `page.goto` waits for `load`, and 1.3 s later the attribute is gone.
  - `tests/e2e/home.spec.ts` › "a full page load: the intro, if any, starts before the pearls are painted" is unaffected.
