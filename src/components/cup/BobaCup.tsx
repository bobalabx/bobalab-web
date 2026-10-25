/**
 * The homepage boba cup (DECISIONS D-14; docs/simplify/JUDGE.md §5 and R2–R11,
 * R14–R17; prototype docs/simplify/prototypes/c). Server component.
 *
 *   - A flat line drawing (inline SVG, aria-hidden): the cup wall with a flared
 *     lip, the tea (the only use of --tea), the meniscus, a straw cut on the slant
 *     and three faint graduation ticks on the far wall. Two proportions are drawn
 *     (wide ≥ 80rem, narrow below) and CSS shows one.
 *   - The live directions' pearls on the floor in direction_order, each with a
 *     leader line out through the wall to its word label. The labels are an <ol>
 *     inside <nav aria-label="Research directions">: links to /research/<slug>/
 *     without JS; the client island (CupIsland) upgrades them to disclosure
 *     buttons that make the pearl rise and open its reveal panel.
 *   - Each panel (server-rendered, hidden until picked) holds at most three items
 *     (R7): the short question, then one finding OR "A first read", then
 *     "Explore <direction>" with its counts.
 *   - The hint ("Pick a pearl…" / "Tap a pearl…" on touch) and one quiet link to
 *     the timeline on /research/ (#map).
 * Nothing here is invented: every word comes from content (homePearls) except
 * the interface words ("Pick a pearl…", "A first read", "Explore", "One finding").
 */
import Link from "next/link";
import type { CSSProperties } from "react";
import type { HomePearl } from "@/lib/content/queries";
import { numberWord, plural } from "@/lib/figure/buildFigure";
import { TRANSITION } from "@/lib/vt";
import { CupIsland, type CupItem } from "./CupIsland";
import { cupGeometry, cupPaths, pearlVars, stageVars, type CupGeo } from "./geometry";
import "./cup.css";

/** "4 papers, 2 in progress" (the wording of the research pages). */
export function countsLine(c: { papers: number; inProgress: number }): string {
  return `${plural(c.papers, "paper")}${c.inProgress ? `, ${c.inProgress} in progress` : ""}`;
}

/** "Management Science, 2026" (whatever of venue and year the paper has). */
export function venueYear(p: { venue?: string; year?: number }): string {
  return [p.venue, p.year].filter(Boolean).join(", ");
}

function Drawing({ g }: { g: CupGeo }) {
  const d = cupPaths(g);
  return (
    <svg
      className={`cup-draw cup-draw--${g.kind}`}
      viewBox={`0 0 ${g.W} ${g.H}`}
      aria-hidden="true"
      focusable="false"
    >
      <path className="cup-tea" d={d.tea} />
      {d.ticks.map((t, i) => (
        <path key={i} className="cup-tick" d={t} />
      ))}
      <path className="cup-straw-in" d={d.strawIn} />
      <path className="cup-surface" d={d.surface} />
      <path className="cup-straw" d={d.strawOut} />
      <path className="cup-wall" d={d.wall} />
      <path className="cup-base" d={d.base} />
    </svg>
  );
}

function Panel({ pearl }: { pearl: HomePearl }) {
  const { direction: d, finding, firstRead } = pearl;
  const question = pearl.question ?? d.summary;
  return (
    <>
      {question && <p className="cup-q">{question}</p>}
      {finding ? (
        <p className="cup-read">
          One finding: <span className="cup-read-t">{finding.text}</span>
          {finding.publication && (
            <>
              {" "}
              <Link href={`/publications/${finding.publication.slug}/`}>
                Read the paper<span className="vh">: {finding.publication.title}</span>
              </Link>
            </>
          )}
        </p>
      ) : (
        firstRead && (
          <p className="cup-read">
            A first read:{" "}
            <Link href={`/publications/${firstRead.slug}/`} className="cup-read-t">
              {firstRead.title}
            </Link>
            {venueYear(firstRead) && <>, {venueYear(firstRead)}</>}.
          </p>
        )
      )}
      <p className="cup-go">
        <Link href={`/research/${d.slug}/`} transitionTypes={[TRANSITION.pearlOpen]}>
          Explore {d.short_label}
        </Link>{" "}
        <span className="cup-count">{countsLine(d.counts)}</span>
      </p>
    </>
  );
}

export function BobaCup({ pearls }: { pearls: HomePearl[] }) {
  const n = pearls.length;
  const chars = Math.max(0, ...pearls.map((p) => p.direction.short_label.length));
  const wide = cupGeometry(n, "wide", chars);
  const narrow = cupGeometry(n, "narrow", chars);
  const items: CupItem[] = pearls.map(({ direction: d }, i) => ({
    slug: d.slug,
    label: d.short_label,
    href: `/research/${d.slug}/`,
    swatch: d.color,
    style: { ...pearlVars(wide, i), ...pearlVars(narrow, i), "--i": i } as CSSProperties,
  }));
  const vars = { ...stageVars(wide), ...stageVars(narrow) } as CSSProperties;

  return (
    <figure className="cup" data-n={n} style={vars} aria-labelledby="cup-cap">
      <figcaption id="cup-cap" className="vh">
        {n > 0
          ? `Our ${numberWord(n)} research ${n === 1 ? "direction" : "directions"}, drawn as ${n === 1 ? "a pearl" : `${numberWord(n)} pearls`} in a cup of boba. Choose one to read the question it asks.`
          : "A cup of boba with no pearls yet: research directions are coming soon."}
      </figcaption>
      <CupIsland
        items={items}
        panels={pearls.map((p) => (
          <Panel key={p.direction.slug} pearl={p} />
        ))}
      >
        <Drawing g={wide} />
        <Drawing g={narrow} />
      </CupIsland>
      {n > 0 ? (
        <p className="cup-hint">
          <span className="cup-pick">
            <span className="cup-pick-m">Pick a pearl</span>
            <span className="cup-pick-t">Tap a pearl</span> to see the question behind it.
          </span>{" "}
          <Link href="/research/#map" className="cup-map">
            {n === 1
              ? "See every paper on one timeline"
              : `See how the ${numberWord(n)} directions connect`}
          </Link>
        </p>
      ) : (
        <p className="cup-hint cup-hint--soon">Research directions are coming soon.</p>
      )}
    </figure>
  );
}
