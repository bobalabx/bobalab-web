/**
 * The project line (P3 `project.html` `.pl2`, Figure 1 of a project page):
 * the project's directions as lanes, its papers as dots on the lanes they
 * belong to (joined by a short ink tick when a paper sits on two), dated notes
 * from the lab's news above the lanes, and "now" with each direction's pearl.
 *
 * Geometry: one CSS grid whose rows (year, notes, lanes, labels) are shared
 * by every year column through `subgrid`, so the lanes line up however tall a
 * note or label wraps. Each event owns a column inside its year (packing in
 * projectLineModel). A news item about a paper from the paper's own year is
 * drawn in that paper's column (note above the lanes, dot on them, label
 * below). Below 48rem the same markup is a vertical, dated list whose paper
 * dots sit on the rail.
 * Marks are aria-hidden; every paper label is a link, every note links to its
 * news item, and the caption says what the figure shows.
 */
import Link from "next/link";
import type { CSSProperties } from "react";
import type { ProjectLineModel } from "./model";

type Vars = CSSProperties & Record<`--${string}`, string | number>;

export function ProjectLine({ model }: { model: ProjectLineModel }) {
  const notes = model.news > 0;
  return (
    <figure
      className="pjl-fig"
      aria-labelledby="pjl-cap"
      style={
        {
          "--lanes": model.lanes.length,
          "--cols": model.years.map((y) => `minmax(0, ${y.events.length}fr)`).join(" "),
        } as Vars
      }
    >
      <div className="pjl-grid">
        <div className="pjl-lab" aria-hidden="true">
          {model.lanes.map((l) => (
            <span key={l.slug} data-swatch={l.color}>
              {l.short_label}
            </span>
          ))}
        </div>
        {model.years.map((y) => (
          <div key={y.year} className="pjl-col" style={{ "--m": y.events.length } as Vars}>
            <p className="pjl-yr">{y.year}</p>
            <div className="pjl-lanes" aria-hidden="true">
              {model.lanes.map((l) => (
                <i key={l.slug} data-swatch={l.color} />
              ))}
            </div>
            {y.events.map((e, i) =>
              e.kind === "news" ? (
                <p key={e.key} className="pjl-note" style={{ "--c": i + 1 } as Vars}>
                  <time dateTime={e.date}>{e.day}</time>
                  <Link href={e.href}>{e.title}</Link>
                </p>
              ) : (
                <div key={e.key} className="pjl-ev" style={{ "--c": i + 1 } as Vars}>
                  {e.note && (
                    <p className="pjl-note">
                      <time dateTime={e.note.date}>{e.note.day}</time>
                      <Link href={e.note.href}>{e.note.title}</Link>
                    </p>
                  )}
                  <span className="pjl-dots" aria-hidden="true">
                    {e.lanes.map((li) => (
                      <span
                        key={li}
                        className="pjl-dot"
                        data-swatch={model.lanes[li]!.color}
                        style={{ "--l": li } as Vars}
                      />
                    ))}
                    {e.lanes.length > 1 && (
                      <span
                        className="pjl-tick"
                        style={
                          {
                            "--l0": Math.min(...e.lanes),
                            "--l1": Math.max(...e.lanes),
                          } as Vars
                        }
                      />
                    )}
                  </span>
                  <p className="pjl-paper">
                    <Link href={e.href}>
                      {e.title}
                      {e.title !== e.fullTitle && (
                        <span className="vh">{e.fullTitle.slice(e.title.length)}</span>
                      )}
                    </Link>
                    <span>{e.meta}</span>
                  </p>
                </div>
              ),
            )}
          </div>
        ))}
        <div className="pjl-now" aria-hidden="true">
          <span className="pjl-nl">now</span>
          <span className="pjl-pearls">
            {model.lanes.map((l, i) => (
              <b key={l.slug} style={{ "--l": i } as Vars} />
            ))}
          </span>
        </div>
      </div>
      <figcaption className="pjl-cap" id="pjl-cap">
        <b>Figure 1.</b>{" "}
        {notes ? "Papers and news for this project, by date." : "Papers for this project, by date."}
      </figcaption>
    </figure>
  );
}
