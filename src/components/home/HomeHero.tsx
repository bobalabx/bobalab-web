/**
 * Home statement and lede (DECISIONS D-13; prototype p3/index.html `.hero`).
 *
 *   h1  the display statement (condensed, the only h1)
 *   row the lab's name and affiliation in the label column (the lab name is
 *       stated once on the page; the header wordmark is the home link), and the
 *       lede in the track: the mission from content/pages/home.yml, then "The work
 *       runs along four lines: …" with each direction name as a link that lights
 *       its line in Fig. 1 (data-dir) and opens the direction (pearl morph).
 */
import Link from "next/link";
import { Fragment } from "react";
import { DraftBadge } from "@/components/ui/Badge";
import type { SwatchId } from "@/lib/content/palette";
import { numberWord } from "@/lib/figure/buildFigure";
import { TRANSITION } from "@/lib/vt";
import "./home.css";

/**
 * The display line until content/pages/home.yml carries `statement`
 * (change request home-1). P3's paraphrase of the mission; the PI confirms the
 * wording (JUDGE refinement 8, NOTES known issue 11).
 */
export const HOME_STATEMENT = "How people learn to work with algorithms";

/** Keep "University of California" together (non-breaking spaces). */
export function affiliationText(text: string): string {
  return text.replace(/University of California/g, "University of California");
}

/**
 * "Haas School of Business, University of California, Berkeley" → two address
 * lines at the first comma: ["Haas School of Business", "University of California,
 * Berkeley"]. The line break stands in for the comma (P3 `.aff`); the comma stays
 * in the text for screen readers (visually hidden).
 */
export function splitFirst(text: string): string[] {
  const i = text.indexOf(", ");
  return i < 0 ? [text] : [text.slice(0, i), text.slice(i + 2)];
}

export interface LedeDirection {
  slug: string;
  label: string;
  swatch: SwatchId;
}

export function HomeHero({
  statement = HOME_STATEMENT,
  longName,
  affiliation,
  mission,
  missionDraft,
  directions,
}: {
  statement?: string;
  longName: string;
  affiliation: string;
  mission?: string;
  missionDraft?: boolean;
  /** Live directions in figure order (empty: no "lines" sentence). */
  directions: LedeDirection[];
}) {
  const n = directions.length;
  return (
    <section className="hm-hero" aria-labelledby="hm-h1">
      <h1 id="hm-h1" className="hm-h1" tabIndex={-1}>
        {statement}
      </h1>
      <div className="hm-row">
        <p className="hm-aff">
          <span>{longName}</span>{" "}
          {splitFirst(affiliationText(affiliation)).map((part, i, all) => (
            <span key={i}>
              {part}
              {i < all.length - 1 && <span className="vh">,</span>}{" "}
            </span>
          ))}
        </p>
        <p className="hm-lede">
          {mission}
          {mission && n > 0 && " "}
          {n > 1 && <>The work runs along {numberWord(n)} lines: </>}
          {n === 1 && <>The work runs along one line: </>}
          {directions.map((d, i) => (
            <Fragment key={d.slug}>
              {i > 0 && (i === n - 1 ? " and " : ", ")}
              <Link
                href={`/research/${d.slug}/`}
                className="hm-dl"
                data-dir={d.slug}
                data-swatch={d.swatch}
                transitionTypes={[TRANSITION.pearlOpen]}
              >
                <span className="bl-seg" aria-hidden="true" />
                {d.label}
              </Link>
            </Fragment>
          ))}
          {n > 0 && "."}
          {missionDraft && (
            <>
              {" "}
              <DraftBadge />
            </>
          )}
        </p>
      </div>
    </section>
  );
}

/** No live directions: the lede stands alone and says the directions are coming. */
export function DirectionsComingSoon() {
  return (
    <section className="hm-soon bl-sec" aria-labelledby="dirs-h">
      <h2 id="dirs-h">Research directions</h2>
      <p className="t-muted">Coming soon.</p>
    </section>
  );
}
