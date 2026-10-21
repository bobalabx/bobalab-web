"""Generate the outlined BOBALAB wordmark geometry (brief section C8).

Usage (from the repo root):  python scripts/brand/build-wordmark.py

Inputs  : the pinned @fontsource packages in node_modules (OFL-1.1).
Output  : src/components/brand/wordmark-geometry.ts (generated; committed).

* "BOBA" uses Fraunces (full variable file) instanced at SOFT 100, wght 680,
  opsz 144, WONK 0. The O is replaced by a matte pearl at cap height plus
  about 2% overshoot (drawn as SVG geometry, not a glyph).
* "LAB" uses IBM Plex Mono Medium (500), scaled so its cap height matches
  Fraunces. It is spaced OPTICALLY, not by advance + tracking (verify VIS-02):
  each LAB glyph is placed so the white area between it and its left
  neighbour (mean per-scanline gap over the cap height, each scanline capped
  at DEPTH x cap) equals the mean gap measured inside BOBA times LAB_AIR,
  with no scanline closer than MIN_CLEAR. The A->L join is then set to the
  larger of JOIN_AIR x that mean and the widest gap inside LAB, so the word
  never breaks after the L. The earlier "Plex advance + 0.08em" read
  as "BOBAL AB": the mono L's empty top-right made L->A look like the word
  break, while the A->L ink almost touched.
* All glyphs are converted to SVG path data, so the mark never waits for
  fonts. Requires Python 3 with fontTools (4.x). WOFF2 decoding uses the real
  `brotli` module when present, otherwise a tiny shim that calls Node's zlib.
"""

import argparse
import json
import math
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
from fontTools.pens.recordingPen import RecordingPen  # noqa: E402

NM = os.path.join(ROOT, "node_modules")
FRAUNCES = os.path.join(NM, "@fontsource-variable", "fraunces", "files", "fraunces-latin-full-normal.woff2")
PLEX = os.path.join(NM, "@fontsource", "ibm-plex-mono", "files", "ibm-plex-mono-latin-500-normal.woff")
OUT = os.path.join(ROOT, "src", "components", "brand", "wordmark-geometry.ts")

# Design units of the output: Fraunces cap height is normalised to CAP.
CAP = 100.0
OVERSHOOT = 0.02  # pearl diameter = cap * (1 + 2 * overshoot)
# Optical spacing of LAB (see the module docstring). No word space between BOBA
# and LAB (JUDGE.md visual-fix 11), but the join must never be tighter than the
# gaps inside LAB, or the eye breaks the word after the L (verify VIS-02).
ROWS = 100  # scanlines across the cap height
DEPTH = 0.40  # one scanline's gap counts at most DEPTH * CAP (open counters, diagonals)
LAB_AIR = 1.15  # gaps inside LAB / BOBA mean gap: the mono LAB keeps some air (brief C8 "tracked")
JOIN_AIR = 1.20  # A->L floor / BOBA mean gap; the join is also never tighter than any LAB gap
MIN_CLEAR = 0.06  # x CAP: no scanline of two neighbours closer than this (the L foot vs the A leg)


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


def _flatten(font, char, scale):
    """Glyph contours as polylines in output units (y up, origin at the glyph origin)."""
    gs = font.getGlyphSet()
    rec = RecordingPen()
    gs[font.getBestCmap()[ord(char)]].draw(TransformPen(rec, (scale, 0, 0, scale, 0, 0)))
    steps = [k / 12 for k in range(1, 13)]
    polys, cur, p = [], [], None
    for op, args in rec.value:
        if op == "moveTo":
            p = args[0]
            cur = [p]
        elif op == "lineTo":
            p = args[0]
            cur.append(p)
        elif op == "qCurveTo":
            ctrl, end = args[:-1], args[-1]
            for i, c in enumerate(ctrl):
                nxt = end if i == len(ctrl) - 1 else ((c[0] + ctrl[i + 1][0]) / 2, (c[1] + ctrl[i + 1][1]) / 2)
                for t in steps:
                    u = 1 - t
                    cur.append(
                        (
                            u * u * p[0] + 2 * u * t * c[0] + t * t * nxt[0],
                            u * u * p[1] + 2 * u * t * c[1] + t * t * nxt[1],
                        )
                    )
                p = nxt
        elif op == "curveTo":
            c1, c2, e = args
            for t in steps:
                u = 1 - t
                cur.append(
                    (
                        u**3 * p[0] + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t**3 * e[0],
                        u**3 * p[1] + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t**3 * e[1],
                    )
                )
            p = e
        elif op in ("closePath", "endPath"):
            if cur:
                polys.append(cur)
            cur = []
    return polys


def _rows():
    return [CAP * (k + 0.5) / ROWS for k in range(ROWS)]


def glyph_profile(font, char, scale):
    """(left, right) ink extents per scanline, relative to the glyph origin (None = no ink)."""
    polys = _flatten(font, char, scale)
    left, right = [], []
    for y in _rows():
        xs = []
        for poly in polys:
            n = len(poly)
            for i in range(n):
                (x1, y1), (x2, y2) = poly[i], poly[(i + 1) % n]
                if (y1 <= y < y2) or (y2 <= y < y1):
                    xs.append(x1 + (y - y1) * (x2 - x1) / (y2 - y1))
        left.append(min(xs) if xs else None)
        right.append(max(xs) if xs else None)
    return left, right


def circle_profile(radius, cy):
    """Profile of the pearl, relative to its centre."""
    left, right = [], []
    for y in _rows():
        h = radius * radius - (y - cy) ** 2
        w = math.sqrt(h) if h > 0 else None
        left.append(-w if w is not None else None)
        right.append(w)
    return left, right


def optical_gap(left_prof, left_x, right_prof, right_x):
    """Mean white gap between two placed glyphs; each scanline is capped at DEPTH * CAP."""
    cap = DEPTH * CAP
    total = 0.0
    for a, b in zip(left_prof[1], right_prof[0]):
        if a is None or b is None:
            total += cap
        else:
            total += max(0.0, min(cap, (right_x + b) - (left_x + a)))
    return total / ROWS


def min_clearance(left_prof, left_x, right_prof, right_x):
    """Smallest per-scanline ink gap (negative = the glyphs collide)."""
    gaps = [
        (right_x + b) - (left_x + a)
        for a, b in zip(left_prof[1], right_prof[0])
        if a is not None and b is not None
    ]
    return min(gaps) if gaps else float("inf")


def place_after(left_prof, left_x, right_prof, target):
    """Origin x of the right glyph: optical_gap(...) == target, but never closer than
    MIN_CLEAR on any scanline (the mono L's long foot would otherwise run into the A)."""
    lo, hi = left_x - 2 * CAP, left_x + 6 * CAP
    for _ in range(60):
        mid = (lo + hi) / 2
        if optical_gap(left_prof, left_x, right_prof, mid) < target:
            lo = mid
        else:
            hi = mid
    clear = max(
        (left_x + a + MIN_CLEAR * CAP - b
         for a, b in zip(left_prof[1], right_prof[0])
         if a is not None and b is not None),
        default=lo,
    )
    return max((lo + hi) / 2, clear)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default=OUT, help="output .ts path (default: the committed geometry)")
    args = ap.parse_args()
    fr = TTFont(FRAUNCES)
    axes = {a.axisTag: (a.minValue, a.defaultValue, a.maxValue) for a in fr["fvar"].axes}
    pin = {"wght": 680, "opsz": 144, "SOFT": 100, "WONK": 0}
    pin = {k: v for k, v in pin.items() if k in axes}
    fr = instancer.instantiateVariableFont(fr, pin)
    fr_cap = fr["OS/2"].sCapHeight
    s_fr = CAP / fr_cap

    plex = TTFont(PLEX)
    px_cap = plex["OS/2"].sCapHeight
    s_px = CAP / px_cap

    baseline = CAP * 1.06  # leave room above cap for overshoot
    x = 0.0
    letters = []
    pearl = None
    placed = []  # (profile, origin x) of each BOBA glyph: the rhythm LAB is spaced to
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
            placed.append((circle_profile(d / 2, CAP / 2), cx))
            x += sb * 2 + d
            continue
        placed.append((glyph_profile(fr, ch, s_fr), x))
        d, adv, _ = glyph_outline(fr, ch, s_fr, x, baseline)
        letters.append(d)
        x += adv
    boba_end = x
    boba_gaps = [optical_gap(a[0], a[1], b[0], b[1]) for a, b in zip(placed, placed[1:])]
    rhythm = sum(boba_gaps) / len(boba_gaps)
    # LAB is laid out on its own first (L at 0), then the whole word is placed so the
    # A->L join is at least as open as the widest gap inside LAB.
    profs = [glyph_profile(plex, ch, s_px) for ch in "LAB"]
    rel = [0.0]
    for a, b in zip(profs, profs[1:]):
        rel.append(place_after(a, rel[-1], b, rhythm * LAB_AIR))
    inner = [optical_gap(a, ax, b, bx) for a, ax, b, bx in zip(profs, rel, profs[1:], rel[1:])]
    a_prof, a_x = placed[-1]
    l_x = place_after(a_prof, a_x, profs[0], max(rhythm * JOIN_AIR, max(inner)))
    join = optical_gap(a_prof, a_x, profs[0], l_x)
    lab = []
    for ch, dx in zip("LAB", rel):
        d, adv, _ = glyph_outline(plex, ch, s_px, l_x + dx, baseline)
        lab.append(d)
        x = l_x + dx + adv  # the last B keeps its own right side bearing
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
        # Optical gaps (mean capped scanline gap; cap height = 100): the BOBA pairs,
        # the A->L join, and L->A, A->B inside LAB. tests/unit/foundation asserts them.
        "spacing": {
            "boba": [r(g) for g in boba_gaps],
            "join": r(join),
            "lab": [r(g) for g in inner],
            "minClear": r(
                min(
                    min_clearance(a_prof, a_x, profs[0], l_x),
                    *(min_clearance(a, ax, b, bx) for a, ax, b, bx in zip(profs, rel, profs[1:], rel[1:])),
                )
            ),
        },
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
    with open(args.out, "w", encoding="utf-8", newline="\n") as f:
        f.write(ts)
    print("wrote", os.path.relpath(args.out, ROOT), "viewBox", data["viewBox"], "spacing", data["spacing"])


if __name__ == "__main__":
    main()
