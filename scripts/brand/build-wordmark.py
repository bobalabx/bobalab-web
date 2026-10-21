"""Generate the outlined BOBALAB wordmark geometry (brief section C8).

Usage (from the repo root):  python scripts/brand/build-wordmark.py

Inputs  : the pinned @fontsource packages in node_modules (OFL-1.1).
Output  : src/components/brand/wordmark-geometry.ts (generated; committed).

* "BOBA" uses Fraunces (full variable file) instanced at SOFT 100, wght 680,
  opsz 144, WONK 0. The O is replaced by a matte pearl at cap height plus
  about 2% overshoot (drawn as SVG geometry, not a glyph).
* "LAB" uses IBM Plex Mono Medium (500), scaled so its cap height matches
  Fraunces, tracked +0.08em.
* All glyphs are converted to SVG path data, so the mark never waits for
  fonts. Requires Python 3 with fontTools (4.x). WOFF2 decoding uses the real
  `brotli` module when present, otherwise a tiny shim that calls Node's zlib.
"""

import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))

try:  # pragma: no cover
    import brotli  # noqa: F401
except ImportError:  # pragma: no cover
    sys.path.insert(0, os.path.join(HERE, "_shim"))

from fontTools.ttLib import TTFont  # noqa: E402
from fontTools.varLib import instancer  # noqa: E402
from fontTools.pens.svgPathPen import SVGPathPen  # noqa: E402
from fontTools.pens.transformPen import TransformPen  # noqa: E402
from fontTools.pens.boundsPen import BoundsPen  # noqa: E402

NM = os.path.join(ROOT, "node_modules")
FRAUNCES = os.path.join(NM, "@fontsource-variable", "fraunces", "files", "fraunces-latin-full-normal.woff2")
PLEX = os.path.join(NM, "@fontsource", "ibm-plex-mono", "files", "ibm-plex-mono-latin-500-normal.woff")
OUT = os.path.join(ROOT, "src", "components", "brand", "wordmark-geometry.ts")

# Design units of the output: Fraunces cap height is normalised to CAP.
CAP = 100.0
TRACK_LAB = 0.08  # em
# No word space between BOBA and LAB (JUDGE.md visual-fix 11, WP1 request 2):
# the first L starts at the end of the last A's advance, pulled left by the
# Plex Mono L's left side bearing, so the A->L gap is never wider than L->A.
OVERSHOOT = 0.02  # pearl diameter = cap * (1 + 2 * overshoot)


def r(v):
    return round(v, 2)


def glyph_outline(font, char, scale, dx, baseline):
    cmap = font.getBestCmap()
    gname = cmap[ord(char)]
    gs = font.getGlyphSet()
    pen = SVGPathPen(gs, ntos=lambda v: ("%.2f" % v).rstrip("0").rstrip("."))
    # font units (y up) -> svg units (y down)
    tpen = TransformPen(pen, (scale, 0, 0, -scale, dx, baseline))
    gs[gname].draw(tpen)
    bpen = BoundsPen(gs)
    gs[gname].draw(bpen)
    adv = gs[gname].width * scale
    return pen.getCommands(), adv, bpen.bounds


def main():
    fr = TTFont(FRAUNCES)
    axes = {a.axisTag: (a.minValue, a.defaultValue, a.maxValue) for a in fr["fvar"].axes}
    pin = {"wght": 680, "opsz": 144, "SOFT": 100, "WONK": 0}
    pin = {k: v for k, v in pin.items() if k in axes}
    fr = instancer.instantiateVariableFont(fr, pin)
    fr_cap = fr["OS/2"].sCapHeight
    s_fr = CAP / fr_cap
    upm_fr = fr["head"].unitsPerEm
    em = upm_fr * s_fr  # 1em in output units

    plex = TTFont(PLEX)
    px_cap = plex["OS/2"].sCapHeight
    s_px = CAP / px_cap

    baseline = CAP * 1.06  # leave room above cap for overshoot
    x = 0.0
    letters = []
    pearl = None
    for ch in "BOBA":
        if ch == "O" and pearl is None:
            _, adv, bounds = glyph_outline(fr, "O", s_fr, x, baseline)
            xmin, _, xmax, _ = bounds
            # Keep the O's own side bearings (the larger of the two on both
            # sides, plus 4%) so the pearl never crowds the B before it.
            sb = max(xmin * s_fr, adv - xmax * s_fr) + CAP * 0.04
            d = CAP * (1 + 2 * OVERSHOOT)
            cx = x + sb + d / 2
            cy = baseline - CAP / 2
            pearl = {"cx": r(cx), "cy": r(cy), "r": r(d / 2)}
            x += sb * 2 + d
            continue
        d, adv, _ = glyph_outline(fr, ch, s_fr, x, baseline)
        letters.append(d)
        x += adv
    boba_end = x
    _, _, l_bounds = glyph_outline(plex, "L", s_px, 0, baseline)
    x -= l_bounds[0] * s_px
    lab = []
    track = TRACK_LAB * em
    for i, ch in enumerate("LAB"):
        d, adv, _ = glyph_outline(plex, ch, s_px, x, baseline)
        lab.append(d)
        x += adv + (track if i < 2 else 0)
    width = x
    height = baseline + CAP * 0.06

    # Crescent highlight at 10 o'clock: outer circle minus an offset circle.
    pr = pearl["r"]
    hl = {
        "outer": {"cx": r(pearl["cx"] - pr * 0.38), "cy": r(pearl["cy"] - pr * 0.30), "r": r(pr * 0.40)},
        "inner": {"cx": r(pearl["cx"] - pr * 0.26), "cy": r(pearl["cy"] - pr * 0.20), "r": r(pr * 0.40)},
    }

    data = {
        "viewBox": [0, 0, r(width), r(height)],
        "boba": letters,
        "bobaEnd": r(boba_end),
        "lab": lab,
        "pearl": pearl,
        "highlight": hl,
        "axes": pin,
        "fontAxes": {k: list(v) for k, v in axes.items()},
    }
    body = json.dumps(data, indent=2)
    ts = (
        "// GENERATED by scripts/brand/build-wordmark.py. Do not edit by hand.\n"
        "// Fraunces (SOFT 100, wght 680, opsz 144) for BOBA; IBM Plex Mono 500 for LAB.\n"
        "// Both fonts are SIL OFL-1.1 (see src/fonts/OFL.txt). Glyphs are outlined.\n"
        f"export const WORDMARK = {body} as const;\n"
    )
    with open(OUT, "w", encoding="utf-8", newline="\n") as f:
        f.write(ts)
    print("wrote", os.path.relpath(OUT, ROOT), "viewBox", data["viewBox"], "pinned", pin)


if __name__ == "__main__":
    main()
