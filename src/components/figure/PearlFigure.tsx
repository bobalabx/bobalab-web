/**
 * Fig. 1 "Lines" (DECISIONS D-13; prototype docs/redesign/prototypes/p3/index.html
 * + fig.js, JUDGE.md refinements 3–5). Server-rendered from the figure model, so it
 * draws without JavaScript:
 *
 *   - a year axis with "now" and "in progress";
 *   - one lane per direction (<nav aria-label="Research directions"><ol role="list">),
 *     each a real link whose accessible name ends in "N papers";
 *   - in each lane's track: its line from the first paper to "now", gaps where a
 *     link passes over it, link segments, one dot per paper, the pearl at "now"
 *     (the morph source, <ViewTransition name="pearl-{slug}">, one per name) and
 *     open rings for work in progress;
 *   - the zone after "now" and the dashed "now" rule (pseudo-elements of .f1-body);
 *   - a figcaption under the plate whose first layer is the caption and whose other
 *     layers (hidden) are the live captions the island swaps in (aria-live="off").
 * Below 48rem (and wherever the lanes cannot fit) each lane becomes a strip
 * (geometry.ts LIST_CSS). The client island adds linked highlighting and the
 * once-per-session arrival.
 *
 * The map variant (DECISIONS D-14, JUDGE.md "Where the timeline moves"): with a
 * `heading` the figure is /research/#map. It renders the heading beside a
 * one-sentence key with inline glyphs (B's key) and shrinks the caption to its
 * facts; the key sits inside the `f1` container, so its wording follows the
 * same container queries as the marks (links → twin rings when packed, "named
 * under each line" in the strip layout).
 */
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { DraftBadge } from "@/components/ui/Badge";
import { PUBLICATION_TYPE_LABELS } from "@/components/ui/labels";
import {
  joinAnd,
  laneCounts,
  numberWord,
  sharesSentence,
  type FigureLane,
  type FigureModel,
} from "@/lib/figure/buildFigure";
import { figureCss, plateVars } from "@/lib/figure/geometry";
import { pearlVtName, TRANSITION } from "@/lib/vt";
import { PearlBody } from "./parts";
import { FigureIsland } from "./FigureIsland";
import "./figure.css";

type Vars = CSSProperties & Record<`--${string}`, string | number>;

export interface PearlFigureProps {
  model: FigureModel;
  /** @deprecated Unused: the caption names the lab's directions, not the lab. */
  labName?: string;
  /**
   * The section heading of the map variant (/research/#map). When given, the
   * figure renders it with the one-sentence key and a short caption.
   */
  heading?: ReactNode;
}

function Track({ lane, model }: { lane: FigureLane; model: FigureModel }) {
  const firstDot = lane.dots.find((d) => d.col === lane.first);
  const items: ReactNode[] = [];
  let year = 0;
  lane.dots.forEach((d) => {
    if (d.year !== year) {
      items.push(
        <span key={`y${d.year}`} className={year ? "f1-y" : "f1-y f1-y--first"}>
          {d.year}
        </span>,
      );
      year = d.year;
    }
    items.push(
      <i
        key={d.s}
        className={d.twin ? "f1-dot is-tw" : "f1-dot"}
        data-s={d.s}
        data-ds={d.lanes.join(" ")}
        style={{ "--c": d.col, "--k": d.bin, "--t": `${d.t}ms` } as Vars}
      />,
    );
  });
  return (
    <div className="f1-track" aria-hidden="true">
      {firstDot && (
        <span
          className="f1-ln"
          data-ds={lane.slug}
          style={
            {
              "--c": firstDot.col,
              "--k": firstDot.bin,
              "--t": `${lane.lineT}ms`,
              "--dur": `${Math.max(0, model.end - lane.lineT)}ms`,
            } as Vars
          }
        />
      )}
      {lane.gaps.map((c) => {
        const p = model.papers.find((x) => x.col === c);
        return (
          <span key={`g${c}`} className="f1-gap" style={{ "--c": c, "--k": p?.bin ?? 0 } as Vars} />
        );
      })}
      {lane.segs.map((s) => {
        const p = model.papers.find((x) => x.slug === s.s);
        return (
          <span
            key={`s${s.s}`}
            className="f1-seg"
            data-part={s.part}
            data-s={s.s}
            data-ds={s.lanes.join(" ")}
            style={{ "--c": s.col, "--k": p?.bin ?? 0, "--t": `${s.t}ms` } as Vars}
          />
        );
      })}
      {items}
      <span
        className="f1-pearl-at"
        style={{ "--t": `${Math.max(0, model.end - 360) + (lane.index - 1) * 60}ms` } as Vars}
      >
        <PearlBody vtName={pearlVtName(lane.slug)} />
      </span>
      {lane.wip.map((w, j) => (
        <i
          key={w.slug}
          className="f1-ring"
          data-w={w.slug}
          data-ds={w.lanes.join(" ")}
          style={{ "--j": j } as Vars}
        />
      ))}
    </div>
  );
}

function Caption({ model }: { model: FigureModel }) {
  const shared = model.papers.some((p) => p.lanes.length > 1);
  const wip = model.lanes.some((l) => l.wip.length > 0);
  const kinds = model.maxShare > 2 ? "more than one direction" : "two directions";
  const merged = model.merged > 0 ? model.bins[0] : undefined;
  return (
    <>
      <b>Figure 1.</b> Papers in the lab’s {numberWord(model.n)} research{" "}
      {model.n === 1 ? "direction" : "directions"}, by year. Each filled dot is a paper;{" "}
      <span className="f1-cap-d">
        {shared ? (
          <>
            <span className="f1-cv-l">
              a vertical link joins a paper that belongs to {kinds}
              {model.passesOver ? ", passing over any line between them" : ""}
            </span>
            <span className="f1-cv-r">
              a ringed dot is a paper that belongs to {kinds} and appears on each of their lines
            </span>
            .
          </>
        ) : (
          "each line starts at its direction’s first paper."
        )}{" "}
        {merged && `The first column covers ${merged.from}–${merged.to}. `}
        {wip && " Open rings after the “now” line are work in progress."} Point at a line or a dot
        to see its name.
      </span>
      <span className="f1-cap-m">
        the large disc marks the direction today
        {wip ? ", and open rings after it are work in progress" : ""}.
        {shared && " Papers shared with another direction are listed under each line."}
      </span>
    </>
  );
}

/** A glyph of the key: the mark it names, drawn small (decorative). */
function K({ k }: { k: "dot" | "link" | "tw" | "pearl" | "ring" }) {
  return <i className={`f1-k f1-k--${k}`} aria-hidden="true" />;
}

/**
 * The map's one-sentence key (JUDGE.md "Where the timeline moves", B's inline
 * key): dot = a paper by year; vertical link (twin ring when packed; named
 * under each line in strips) = a paper shared by two directions; pearl = now;
 * open ring = work in progress. Each clause appears only when the data draws it.
 */
function Key({ model }: { model: FigureModel }) {
  const shared = model.papers.some((p) => p.lanes.length > 1);
  const wip = model.lanes.some((l) => l.wip.length > 0);
  const kinds = model.maxShare > 2 ? "more than one direction" : "two directions";
  return (
    <p className="f1-key">
      Each line is a direction and each <K k="dot" />
      dot a paper, placed by year.
      {shared && (
        <>
          <span className="f1-cap-d">
            {" "}
            <span className="f1-cv-l">
              A <K k="link" />
              vertical link joins a paper shared by {kinds}.
            </span>
            <span className="f1-cv-r">
              A <K k="tw" />
              ringed dot is a paper shared by {kinds}, drawn on each of their lines.
            </span>
          </span>
          <span className="f1-cap-m">
            {" "}
            Papers shared with another direction are listed under each line.
          </span>
        </>
      )}
      {wip ? (
        <>
          {" "}
          The <K k="pearl" />
          pearl marks today; <K k="ring" />
          open rings after it are work in progress.
        </>
      ) : (
        <>
          {" "}
          The <K k="pearl" />
          pearl marks today.
        </>
      )}
    </p>
  );
}

/** The map's caption: only what the key does not say. */
function ShortCaption({ model }: { model: FigureModel }) {
  const merged = model.merged > 0 ? model.bins[0] : undefined;
  return (
    <>
      <b>Figure 1.</b> The lab’s papers by direction and year.
      {merged && ` The first column covers ${merged.from}–${merged.to}.`}
      <span className="f1-cap-d f1-hint"> Point at a dot or ring to see the paper.</span>
    </>
  );
}

export function PearlFigure({ model, heading }: PearlFigureProps) {
  const listOnly = model.state !== "figure";
  const geo = { cols: model.cols, bins: model.bins.length, wipMax: model.wipMax };
  const markEach = model.draftCount > 0 && model.draftCount < model.n;
  const label = (slug: string) => model.lanes.find((l) => l.slug === slug)?.label ?? slug;

  return (
    <div
      className={["f1", listOnly && "f1--list", heading != null && "f1--map"]
        .filter(Boolean)
        .join(" ")}
    >
      <style>{figureCss(geo, listOnly)}</style>
      {heading != null && (
        <div className="f1-head">
          {heading}
          <Key model={model} />
        </div>
      )}
      <figure
        className="f1-plate"
        data-n={model.n}
        data-figure={listOnly ? "list" : "lines"}
        data-cols={model.cols}
        data-merged={model.merged || undefined}
        style={{ ...plateVars(geo), "--end": `${model.end}ms` } as Vars}
      >
        <div className="f1-body">
          <div className="f1-axis" aria-hidden="true">
            <div className="f1-axis__t">
              {model.bins.map((b, k) => (
                <span
                  key={b.label}
                  className="f1-yr"
                  data-narrow={b.cols <= 2 ? "" : undefined}
                  style={{ "--c0": b.col0, "--m": b.cols, "--k": k } as Vars}
                >
                  <span className="f1-yr-a">’</span>
                  {b.from === b.to ? (
                    <>
                      <span className="f1-yr-c">{String(b.from).slice(0, 2)}</span>
                      {String(b.from).slice(2)}
                    </>
                  ) : (
                    <>
                      <span className="f1-yr-c">{String(b.from).slice(0, 2)}</span>
                      {String(b.from).slice(2)}–<span className="f1-yr-a">’</span>
                      <span className="f1-yr-c">{String(b.to).slice(0, 2)}</span>
                      {String(b.to).slice(2)}
                    </>
                  )}
                </span>
              ))}
              <span className="f1-now-l">now</span>
              {model.wipMax > 0 && <span className="f1-wip-l">in progress</span>}
            </div>
          </div>
          <nav className="f1-nav" aria-label="Research directions">
            <ol role="list" className="f1-list">
              {model.lanes.map((l) => {
                const [count, rest] = laneCounts(l);
                const shares = sharesSentence(l.shares);
                return (
                  <li key={l.slug} className="f1-item" data-slug={l.slug} data-swatch={l.swatch}>
                    <div className="f1-lab">
                      <p className="f1-name">
                        <Link
                          href={l.href}
                          className="f1-link"
                          transitionTypes={[TRANSITION.pearlOpen]}
                        >
                          <span className="f1-label">{l.label}</span>
                          <span className="vh">, </span>
                          <span className="f1-count">{count}</span>
                        </Link>
                        {rest && <span className="f1-more">{rest}</span>}
                        {l.draft && markEach && (
                          <>
                            {" "}
                            <DraftBadge />
                          </>
                        )}
                      </p>
                      {shares && <p className="f1-shares">{shares}</p>}
                    </div>
                    <Track lane={l} model={model} />
                  </li>
                );
              })}
            </ol>
          </nav>
        </div>
        <figcaption className="f1-caption">
          <span className="f1-cap" aria-live="off">
            <span className="f1-cap-layer is-on" data-cap="legend">
              {heading != null ? <ShortCaption model={model} /> : <Caption model={model} />}
            </span>
            {!listOnly && (
              <>
                {model.lanes.map((l) => (
                  <span
                    key={l.slug}
                    className="f1-cap-layer"
                    data-cap={`d:${l.slug}`}
                    aria-hidden="true"
                    hidden
                  >
                    <b>{l.label}.</b> {l.question ?? l.summary ?? laneCounts(l).join("")}
                  </span>
                ))}
                {model.papers.map((p) => (
                  <span
                    key={p.slug}
                    className="f1-cap-layer"
                    data-cap={`p:${p.slug}`}
                    aria-hidden="true"
                    hidden
                  >
                    <b>{p.title}.</b> {PUBLICATION_TYPE_LABELS[p.type]}, {p.year}.{" "}
                    {p.lanes.length > 1 && `Shared by ${joinAnd(p.lanes.map(label))}. `}
                    {p.brief}
                  </span>
                ))}
                {model.lanes
                  .flatMap((l) => l.wip)
                  .filter((w, i, a) => a.findIndex((x) => x.slug === w.slug) === i)
                  .map((w) => (
                    <span
                      key={w.slug}
                      className="f1-cap-layer"
                      data-cap={`w:${w.slug}`}
                      aria-hidden="true"
                      hidden
                    >
                      <b>{w.title}.</b> In progress, {joinAnd(w.lanes.map(label))}.
                    </span>
                  ))}
              </>
            )}
          </span>
          {model.draftCount > 0 && (
            <span className="f1-foot-draft">
              <DraftBadge />{" "}
              <span>
                applies to{" "}
                {markEach
                  ? `${model.draftCount} of ${model.n} directions`
                  : model.n === 1
                    ? "this direction"
                    : `all ${model.n} directions`}
              </span>
            </span>
          )}
        </figcaption>
        {!listOnly && <FigureIsland />}
      </figure>
    </div>
  );
}
