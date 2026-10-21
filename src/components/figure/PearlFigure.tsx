/**
 * Fig. 1, the Pearl Figure (brief §E, DECISIONS D-02a). Server-rendered from
 * the figure model: one <ol role="list"> of real links inside a labelled <nav>,
 * the same tree for every breakpoint (figure mode ≥ 46em container, list mode
 * below). The client island (FigureIsland) only adds the live caption, hover,
 * buoyancy, stir, Pause/Play and the intro hand-off; without JS the legend stays
 * and every link works.
 */
import Link from "next/link";
import type { CSSProperties } from "react";
import { DraftBadge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/icons";
import { formatDate } from "@/lib/content/dates";
import { pad2 } from "@/lib/content/directions";
import { metaLine, plural, type FigureItem, type FigureModel } from "@/lib/figure/buildFigure";
import { pearlVtName, TRANSITION } from "@/lib/vt";
import { Halo, PearlBody, SeedOrbit } from "./parts";
import { FigureIsland } from "./FigureIsland";
import "./figure.css";

type Vars = CSSProperties & Record<`--${string}`, string | number>;

export interface PearlFigureProps {
  model: FigureModel;
  /** Lab short name for the caption ("Research directions of BOBALAB."). */
  labName: string;
  /** id of the section heading (aria-labelledby). */
  headingId?: string;
}

function itemVars(it: FigureItem, i: number): Vars {
  const v: Vars = {
    "--i": i,
    "--fp": `${it.float.period}s`,
    "--fd": `${it.float.delay}s`,
  };
  if (it.slot) {
    v["--row"] = it.slot.row;
    v["--col"] = it.slot.col;
    v["--dx"] = it.nudge.dx;
    v["--dy"] = it.nudge.dy;
  }
  return v;
}

/** Year → 0…1 position on the shared dot-plot axis, with a per-year stack index. */
function trackDots(years: number[], range: [number, number]) {
  const [lo, hi] = range;
  const span = Math.max(1, hi - lo);
  const seen = new Map<number, number>();
  return years.map((y) => {
    const stack = seen.get(y) ?? 0;
    seen.set(y, stack + 1);
    return { year: y, x: hi === lo ? 0.5 : (y - lo) / span, stack };
  });
}

export function PearlFigure({ model, labName, headingId = "dirs-h" }: PearlFigureProps) {
  const { items, template } = model;
  const listOnly = model.state !== "figure";
  const dotplot = model.mode === "dotplot" && !listOnly;
  const plateVars: Vars = {};
  if (template && !dotplot) {
    plateVars["--f1-cols"] = template.columns;
    plateVars["--f1-D"] = template.diameter;
  }
  const asOf = formatDate(model.asOf);

  return (
    <section className={listOnly ? "f1 f1--list" : "f1"} aria-labelledby={headingId}>
      <figure
        className="f1-plate"
        aria-label={`Fig. 1, research directions of ${labName}`}
        data-n={model.n}
        data-template={template && !dotplot ? `t${template.n}` : undefined}
        data-kind={template?.kind}
        data-figure={dotplot ? "dotplot" : listOnly ? "list" : "cluster"}
        style={plateVars}
      >
        <figcaption className="f1-head">
          <h2 id={headingId} className="f1-h">
            Research directions
          </h2>
          <div className="f1-cap" aria-live="off">
            <div className="f1-cap-layer is-on" data-cap="legend">
              <p className="f1-cap-t">
                <span className="f1-cap-fig">Fig. 1</span>Research directions of {labName}.
              </p>
              <p className="f1-cap-b">
                Each pearl is a research direction
                {!listOnly && (
                  <span className="f1-in-fig">; each dot is one paper with a public version</span>
                )}
                .
              </p>
            </div>
            {!listOnly &&
              items.map((it) => (
                <div
                  key={it.slug}
                  className="f1-cap-layer"
                  data-cap={it.slug}
                  data-swatch={it.swatch}
                  aria-hidden="true"
                >
                  <p className="f1-cap-t">
                    <span className="f1-cap-fig">{pad2(it.index)}</span>
                    {it.label}
                  </p>
                  {it.summary && <p className="f1-cap-b">{it.summary}</p>}
                  <p className="f1-cap-m">
                    <span>{metaLine(it)}</span>
                    {it.draft && <DraftBadge />}
                  </p>
                </div>
              ))}
          </div>
        </figcaption>

        <nav aria-label="Research directions">
          <ol role="list" className="f1-list">
            {items.map((it, i) => (
              <li
                key={it.slug}
                className="f1-item"
                data-slot={i + 1}
                data-row={it.slot?.row}
                data-swatch={it.swatch}
                data-slug={it.slug}
                style={itemVars(it, i)}
              >
                <Link
                  href={it.href}
                  className="f1-link"
                  transitionTypes={[TRANSITION.pearlOpen]}
                  aria-describedby={it.summary ? `d-${it.slug}` : undefined}
                >
                  <span className="f1-group" aria-hidden="true">
                    <span className="f1-buoy">
                      <Halo />
                      {!dotplot && <SeedOrbit papers={it.papers} />}
                      <PearlBody index={it.index} vtName={pearlVtName(it.slug)} />
                    </span>
                  </span>
                  <span className="f1-label">
                    <span className="f1-lt">{it.label}</span>
                    <Icon name="arrow-right" className="f1-arr" />
                  </span>
                  <span className="f1-count">{plural(it.papers, "paper")}</span>
                </Link>
                {it.draft && <DraftBadge />}
                {dotplot && model.yearRange && (
                  <span className="f1-track" aria-hidden="true">
                    {trackDots(it.years, model.yearRange).map((d, k) => (
                      <i
                        key={k}
                        className="f1-track-dot"
                        style={{ "--x": d.x, "--stack": d.stack } as Vars}
                      />
                    ))}
                  </span>
                )}
                {it.summary && (
                  <p id={`d-${it.slug}`} hidden>
                    {it.summary}
                  </p>
                )}
              </li>
            ))}
          </ol>
        </nav>
        {dotplot && model.yearRange && (
          <div className="f1-axis" aria-hidden="true">
            <span />
            <span className="f1-axis-in">
              <span>{model.yearRange[0]}</span>
              <span>{model.yearRange[1]}</span>
            </span>
          </div>
        )}

        <div className="f1-foot">
          <span className="f1-key">
            {!listOnly && !dotplot && <i className="f1-key-dot f1-in-fig" aria-hidden="true" />}
            <span>
              {!listOnly && (
                <span className="f1-in-fig">
                  {dotplot
                    ? "Each dot is one paper with a public version, by year"
                    : "= 1 paper with a public version"}
                  {" · "}
                </span>
              )}
              counts as of {asOf}
            </span>
          </span>
          {model.draftCount > 0 && (
            <span className="f1-foot-draft">
              <DraftBadge />
              <span>
                applies to{" "}
                {model.draftCount === model.n
                  ? model.n === 1
                    ? "this direction"
                    : `all ${model.n} directions`
                  : `${model.draftCount} of ${model.n} directions`}
              </span>
            </span>
          )}
          {!listOnly && <FigureIsland />}
        </div>
      </figure>
    </section>
  );
}
