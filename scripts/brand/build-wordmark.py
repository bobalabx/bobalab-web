"""Generate the outlined BOBALAB wordmark geometry (DECISIONS D-13 item 2).

Usage (from the repo root):  python scripts/brand/build-wordmark.py

Input  : the self-hosted Archivo variable font src/fonts/archivo-latin-wdth-normal.woff2
         (copied from the pinned @fontsource-variable/archivo 5.3.0; OFL-1.1).
Output : src/components/brand/wordmark-geometry.ts (generated; committed).

* "BOBALAB" is set in Archivo instanced at wdth 68 (condensed) and wght 700
  (bold), the same voice as the h1 and the figure lane labels.
* The first O is replaced by the pearl: a flat disc whose diameter is the cap
  height plus a small overshoot (round shapes overshoot flat ones), centred on
  the cap height and sitting in the O's own advance plus its side bearings, so
  the word keeps the font's rhythm. It is the same matte tapioca pearl that
  ends each lane of Fig. 1 (no gloss, no rim, no numeral).
* Letters are placed by their advance widths plus the font's pair kerning
  (GPOS "kern" when present, read through fontTools' instancer output), then
  converted to SVG path data, so the mark never waits for web fonts.
* Requires Python 3 with fontTools (4.x). WOFF2 decoding uses the real
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

FONT = os.path.join(ROOT, "src", "fonts", "archivo-latin-wdth-normal.woff2")
OUT = os.path.join(ROOT, "src", "components", "brand", "wordmark-geometry.ts")

AXES = {"wdth": 68, "wght": 700}
WORD = "BOBALAB"
PEARL_AT = 1  # index of the O that becomes the pearl
CAP = 100.0  # output units: cap height normalised to 100
OVERSHOOT = 0.015  # pearl diameter = cap * (1 + 2 * overshoot)
PAD = 4.0  # margin around the ink in output units


def r2(v):
    return round(v, 2)


def kern_pairs(font):
    """Pair kerning from GPOS PairPos format 1 and 2 (first 'kern' lookups only)."""
    pairs = {}
    if "GPOS" not in font:
        return pairs
    gpos = font["GPOS"].table
    lookups = set()
    for fr in gpos.FeatureList.FeatureRecord:
        if fr.FeatureTag == "kern":
            lookups.update(fr.Feature.LookupListIndex)
    for li in sorted(lookups):
        lk = gpos.LookupList.Lookup[li]
        subs = lk.SubTable
        if lk.LookupType == 9:
            subs = [s.ExtSubTable for s in subs]
        for st in subs:
            if getattr(st, "LookupType", 2) != 2 and lk.LookupType != 9:
                continue
            if not hasattr(st, "Format"):
                continue
            cov = st.Coverage.glyphs
            if st.Format == 1:
                for i, g1 in enumerate(cov):
                    for pvr in st.PairSet[i].PairValueRecord:
                        v = getattr(pvr.Value1, "XAdvance", 0) or 0
                        pairs.setdefault((g1, pvr.SecondGlyph), v)
            elif st.Format == 2:
                c1 = st.ClassDef1.classDefs
                c2 = st.ClassDef2.classDefs
                for g1 in cov:
                    k1 = c1.get(g1, 0)
                    rec = st.Class1Record[k1]
                    for g2, k2 in list(c2.items()):
                        v = getattr(rec.Class2Record[k2].Value1, "XAdvance", 0) or 0
                        if v:
                            pairs.setdefault((g1, g2), v)
    return pairs


def main():
    font = TTFont(FONT)
    inst = instancer.instantiateVariableFont(font, AXES, inplace=False)
    gs = inst.getGlyphSet()
    cmap = inst.getBestCmap()
    cap_units = inst["OS/2"].sCapHeight
    scale = CAP / cap_units
    kerns = kern_pairs(inst)

    def bounds(gname):
        bp = BoundsPen(gs)
        gs[gname].draw(bp)
        return bp.bounds

    baseline = CAP + PAD + CAP * OVERSHOOT  # svg y of the baseline (room for the pearl overshoot)
    x = PAD
    glyphs = []
    prev = None
    for i, ch in enumerate(WORD):
        gname = cmap[ord(ch)]
        if prev is not None:
            x += kerns.get((prev, gname), 0) * scale
        adv = gs[gname].width * scale
        xmin, _, xmax, _ = bounds(gname)
        if i == 0:
            x -= xmin * scale  # first ink at PAD
        if i == PEARL_AT:
            # The pearl takes the O's place: centred on the O's ink, diameter = cap + overshoot.
            d = CAP * (1 + 2 * OVERSHOOT)
            o_mid = x + (xmin + xmax) / 2 * scale
            o_ink = (xmax - xmin) * scale
            # Widen the slot by the difference between the disc and the O's ink, split evenly.
            extra = d - o_ink
            cx = o_mid + extra / 2
            glyphs.append({"ch": "pearl", "cx": r2(cx), "cy": r2(baseline - CAP / 2), "r": r2(d / 2)})
            x += adv + extra
            prev = gname
            continue
        pen = SVGPathPen(gs, ntos=lambda v: ("%.2f" % v).rstrip("0").rstrip("."))
        gs[gname].draw(TransformPen(pen, (scale, 0, 0, -scale, x, baseline)))
        glyphs.append(
            {
                "ch": ch,
                "d": pen.getCommands(),
                "left": r2(x + xmin * scale),
                "right": r2(x + xmax * scale),
            }
        )
        x += adv
        prev = gname

    last = glyphs[-1]
    width = last["right"] + PAD
    height = baseline + PAD
    pearl = next(g for g in glyphs if g["ch"] == "pearl")
    letters = [g for g in glyphs if g["ch"] != "pearl"]
    # Ink boxes in reading order, the pearl included, for the spacing test.
    boxes = []
    for g in glyphs:
        if g["ch"] == "pearl":
            boxes.append([r2(g["cx"] - g["r"]), r2(g["cx"] + g["r"])])
        else:
            boxes.append([g["left"], g["right"]])
    gaps = [r2(boxes[i + 1][0] - boxes[i][1]) for i in range(len(boxes) - 1)]

    data = {
        "viewBox": [0, 0, r2(width), r2(height)],
        "axes": AXES,
        "cap": CAP,
        "baseline": r2(baseline),
        "word": WORD,
        "pearl": {"cx": pearl["cx"], "cy": pearl["cy"], "r": pearl["r"]},
        # B before the pearl, then B A L A B after it (kept as two lists for the component).
        "boba": [g["d"] for g in letters[:3]],
        "lab": [g["d"] for g in letters[3:]],
        "gaps": gaps,
    }
    body = json.dumps(data, indent=2)
    src = (
        "// GENERATED by scripts/brand/build-wordmark.py. Do not edit by hand.\n"
        "// Archivo (wdth 68, wght 700) for B-BALAB; the first O is the pearl (a flat disc).\n"
        "// Archivo is SIL OFL-1.1 (see src/fonts/OFL.txt). Glyphs are outlined.\n"
        f"export const WORDMARK = {body} as const;\n"
    )
    with open(OUT, "w", encoding="utf-8", newline="\n") as f:
        f.write(src)
    print(f"wrote {os.path.relpath(OUT, ROOT)}: viewBox {data['viewBox']}, gaps {gaps}")


if __name__ == "__main__":
    main()
