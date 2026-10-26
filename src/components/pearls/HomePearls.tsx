/**
 * The homepage pearl figure (DECISIONS D-15): the original Fig. 1 pearl cluster
 * (4740e10 src/components/figure/PearlFigure.tsx; docs/design/JUDGE.md),
 * polished to fit D-13/D-14. Server component; same tree at every width.
 *
 *   - A flat --tea panel (no border, radius or crop marks). From a 36em
 *     container the pearls sit in the original fixed slot templates (2×2 offset
 *     cluster for 4; templates for 2–8, src/lib/pearls/templates.ts); below it,
 *     and for 1 or more than 8 directions, a compact grid of two columns.
 *   - Each pearl: a matte dark tapioca body with a soft direction-colour halo
 *     (box-shadow on the body, so the halo travels inside the pearl-{slug} morph
 *     to the direction header, whose DirectionPearl carries the same halo), and
 *     a hairline orbit with one flat dot per counted paper (≤ 12, ±75° cap).
 *     No gloss, no numerals.
 *   - The labels are an <ol> of real links inside <nav aria-label="Research
 *     directions"> (no-JS: they simply work), Archivo in link style with a
 *     direction-colour underline; the count under each is muted.
 *   - The caption (figcaption) is one plain sentence; the client island
 *     (PearlsIsland) swaps it to the direction's question and counts on hover
 *     or focus. Each link is described by its own caption layer.
 *   - Under the panel, one quiet link to the timeline on /research/ (#map).
 */
import Link from "next/link";
import { ViewTransition, type CSSProperties } from "react";
import { DraftBadge } from "@/components/ui/Badge";
import { countsLine, papersLine, PEARLS_LEGEND, type PearlsModel } from "@/lib/pearls/model";
import { pearlVtName, TRANSITION, VT } from "@/lib/vt";
import { PearlsIsland } from "./PearlsIsland";
import "./halo.css";
import "./pearls.css";

type Vars = CSSProperties & Record<`--${string}`, string | number>;

const WORDS = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight"];

/** The quiet link under the figure. */
export function mapLinkText(n: number): string {
  return n === 1
    ? "See every paper on one timeline"
    : `See how the ${WORDS[n] ?? n} directions connect`;
}

/**
 * Slots that touch the first or last grid column hug that edge (cluster mode), so
 * the figure lines up with the caption on the left and the panel on the right
 * instead of floating in the middle of its outer cells (owner, 2026-10-26).
 */
export function edgeOf(col: number | undefined, columns: number | undefined) {
  if (!col || !columns) return undefined;
  if (col === 1) return "start";
  if (col + 1 === columns) return "end";
  return undefined;
}

export function HomePearls({ model }: { model: PearlsModel }) {
  const { items, template, n, state } = model;
  if (state === "empty") {
    return (
      <div className="pl-box">
        <p className="pl-soon">Research directions are coming soon.</p>
      </div>
    );
  }
  const vars: Vars = {};
  if (template) {
    vars["--pl-cols"] = template.columns;
    vars["--pl-D"] = template.diameter;
  }
  return (
    <div className="pl-box">
      <figure className="pl" data-state={state} data-n={n} style={vars}>
        <nav aria-label="Research directions">
          <ol role="list" className="pl-list">
            {items.map((it, i) => {
              const v: Vars = { "--i": Math.min(i, 7) };
              if (it.slot) {
                v["--row"] = it.slot.row;
                v["--col"] = it.slot.col;
                v["--dx"] = it.nudge.dx;
                v["--dy"] = it.nudge.dy;
              }
              return (
                <li
                  key={it.slug}
                  className="pl-item"
                  data-slug={it.slug}
                  data-swatch={it.swatch}
                  data-row={it.slot?.row}
                  data-edge={edgeOf(it.slot?.col, template?.columns)}
                  style={v}
                >
                  <Link
                    href={it.href}
                    className="pl-link"
                    transitionTypes={[TRANSITION.pearlOpen]}
                    aria-describedby={`pl-q-${it.slug}`}
                  >
                    <span className="pl-g" aria-hidden="true">
                      <span className="pl-orbit">
                        <span className="pl-ring" />
                        <span className="pl-seeds">
                          {it.seeds.map((s) => (
                            <i
                              key={s.k}
                              className="pl-seed"
                              style={{ "--a": `${s.angle}deg`, "--k": s.k } as Vars}
                            />
                          ))}
                        </span>
                      </span>
                      <ViewTransition name={pearlVtName(it.slug)} share={VT.morph} default="none">
                        <span className="pl-body" />
                      </ViewTransition>
                    </span>
                    <span className="pl-label">{it.label}</span>
                    <span className="pl-count">{papersLine(it.papers)}</span>
                  </Link>
                  {it.draft && <DraftBadge />}
                </li>
              );
            })}
          </ol>
        </nav>
        <figcaption className="pl-cap">
          <span className="pl-cap-l is-on" data-cap="legend">
            {PEARLS_LEGEND}
          </span>
          {items.map((it) => (
            <span
              key={it.slug}
              id={`pl-q-${it.slug}`}
              className="pl-cap-l"
              data-cap={it.slug}
              data-swatch={it.swatch}
              aria-hidden="true"
            >
              {it.question && <span className="pl-cap-q">{it.question}</span>}
              <span className="pl-cap-c">{countsLine(it)}</span>
            </span>
          ))}
        </figcaption>
        <PearlsIsland />
      </figure>
      <p className="pl-more">
        <Link href="/research/#map">{mapLinkText(n)}</Link>
      </p>
    </div>
  );
}
