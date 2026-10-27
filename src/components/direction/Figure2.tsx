/**
 * Figure 2 on a direction page (P3 `research.html` `.f2`; D-13 item 2).
 *
 * The direction's papers sit on its line in year bins; a paper shared with
 * another direction rises into a short stub of that direction's line with an
 * "Also in …" link; the line ends at "now" in the direction's pearl, THE morph
 * target of Fig. 1 (`DirectionPearl` with `vtName = pearl-{slug}`, mounted
 * exactly once); open rings after "now" are the work in progress.
 *
 * Layout and packing: f2model.ts. Every paper label is a real link in DOM
 * (chronological) order; marks are aria-hidden and the caption explains them.
 * Below the `fit` width the same markup is drawn as a vertical list, oldest
 * first, so the visual order always matches the reading and focus order; the
 * pearl then moves beside the h1 (direction.css), so the morph lands in view.
 * Arrival (line draws, labels and stubs arrive with a 60 ms stagger) is CSS on
 * mount, finite, transform/opacity only and off under reduced motion.
 */
import Link from "next/link";
import type { CSSProperties } from "react";
import type { DirectionView } from "@/lib/content/load";
import { entryMark } from "@/lib/preview/mark";
import { pearlVtName } from "@/lib/vt";
import { DirectionPearl } from "./DirPearl";
import type { F2Item, F2Model } from "./f2model";

type Vars = CSSProperties & Record<`--${string}`, string | number>;

const STAGGER = 60;

function Others({ item }: { item: F2Item }) {
  return (
    <p className="dr-f2__other">
      Also in{" "}
      {item.others.map((o, i) => (
        <span key={o.slug}>
          {i > 0 ? (i === item.others.length - 1 ? " and " : ", ") : null}
          <Link href={`/research/${o.slug}/`}>{o.short_label}</Link>
        </span>
      ))}
    </p>
  );
}

function Column({ item, k, wip = false }: { item: F2Item; k: number; wip?: boolean }) {
  const first = item.others[0];
  return (
    <li
      className={wip ? "dr-f2__p dr-f2__p--wip" : "dr-f2__p"}
      data-slug={item.slug}
      style={{ "--t": `${k * STAGGER}ms` } as Vars}
      {...entryMark("publications", item.slug)}
    >
      <span className={wip ? "dr-f2__ring" : "dr-f2__dot"} aria-hidden="true" />
      <span className="dr-f2__lead" aria-hidden="true" />
      <p className="dr-f2__lab">
        {wip ? (
          <span className="dr-f2__t">{item.short}</span>
        ) : (
          <Link href={item.href} className="dr-f2__t">
            {item.short}
            {item.short !== item.title && (
              <span className="vh">{item.title.slice(item.short.length)}</span>
            )}
          </Link>
        )}
        <span className="dr-f2__m">{item.meta}</span>
      </p>
      {first && (
        <>
          <span className="dr-f2__stub" data-swatch={first.color} aria-hidden="true" />
          <span className="dr-f2__tw" data-swatch={first.color} aria-hidden="true" />
          <Others item={item} />
        </>
      )}
    </li>
  );
}

export function Figure2({
  direction: d,
  model,
  number,
}: {
  direction: DirectionView;
  model: F2Model;
  /** The figure's number on its page (the first figure of a direction page). */
  number: number;
}) {
  const live = d.index != null && d.status !== "archived";
  let k = 0;
  const lastBin = model.bins.length - 1;
  const wipNote =
    model.wip.length > 1
      ? " Open rings are work in progress."
      : model.wip.length
        ? " The open ring is work in progress."
        : "";
  return (
    <figure
      className="dr-f2"
      data-fit={model.fit}
      data-shared={model.shared ? "" : undefined}
      data-wip={model.wip.length ? "" : undefined}
      data-live={live ? "" : undefined}
      data-dense={model.columns >= 6 ? "" : undefined}
      data-swatch={d.color}
      aria-labelledby="dr-f2-cap"
    >
      <div className="dr-f2__track">
        {model.bins.map((b, bi) => (
          <div
            key={b.label}
            className="dr-f2__bin"
            data-last={bi === lastBin ? "" : undefined}
            style={{ "--n": b.items.length } as Vars}
          >
            <p className="dr-f2__yr">{b.label}</p>
            <ol className="dr-f2__list" role="list" aria-label={`Papers, ${b.label}`}>
              {b.items.map((it) => (
                <Column key={it.slug} item={it} k={k++} />
              ))}
            </ol>
          </div>
        ))}
        <div className="dr-f2__now" style={{ "--t": `${k * STAGGER}ms` } as Vars}>
          <span className="dr-f2__nl" aria-hidden="true">
            now
          </span>
          {/* The small disc at "now" in the list layout is the pearl's stand-in:
              earlier research has no pearl, so none. */}
          {live && <span className="dr-f2__mp" aria-hidden="true" />}
          {live && (
            <span className="dr-f2__pearl">
              <DirectionPearl
                slug={d.slug}
                index={d.index}
                swatch={d.color}
                seedCount={d.counts.papers}
                size="hero"
                vtName={pearlVtName(d.slug)}
              />
            </span>
          )}
        </div>
        {model.wip.length > 0 && (
          <div className="dr-f2__wip" style={{ "--n": model.wip.length } as Vars}>
            <p className="dr-f2__yr dr-f2__yr--wip">in progress</p>
            <ol className="dr-f2__list" role="list" aria-label="In progress">
              {model.wip.map((it) => (
                <Column key={it.slug} item={it} k={k++} wip />
              ))}
            </ol>
          </div>
        )}
      </div>
      <figcaption className="dr-f2__cap" id="dr-f2-cap">
        <b>Figure {number}.</b> {d.short_label} papers by year.
        {model.shared && (
          // Drawn figure only: the list layout (phones, or too many papers to
          // draw) names the other direction on each row ("Also in"), which
          // needs no key.
          <span className="dr-f2__cap-w">
            {" "}
            A paper shared with another direction branches toward that direction’s line.
          </span>
        )}
        {wipNote}
      </figcaption>
    </figure>
  );
}
