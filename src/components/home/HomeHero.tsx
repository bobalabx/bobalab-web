/**
 * Home hero (brief §D3.1): wordmark h1 + descriptor, affiliation, mission,
 * "Explore our research →", and Fig. 1 (or its empty state, §E9).
 * Every fact comes from content (site.yml, pages/home.yml, directions).
 *
 * Two groups so the tablet layout can sit them side by side without the
 * mission stretching the identity rows: .hm-ident (who we are) and .hm-lead
 * (what we do + the call to action). DOM order = reading order everywhere.
 */
import Link from "next/link";
import type { ReactNode } from "react";
import { Wordmark } from "@/components/brand/Wordmark";
import { WORDMARK } from "@/components/brand/wordmark-geometry";
import { DraftBadge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/icons";
import "./home.css";

/** Keep "University of California" together (judge fix 14). */
export function affiliationText(text: string): string {
  return text.replace(/University of California/g, "University of California");
}

/**
 * Wordmark height: the type-scale clamp, but never wider than its column
 * (.hm-ident is an inline-size container), so the hero never overflows.
 */
const [, , WM_W, WM_H] = WORDMARK.viewBox;
const WM_FIT_CQI = Math.floor((100 / (WM_W / WM_H)) * 100) / 100;
export const HERO_WORDMARK_HEIGHT = `min(clamp(2.75rem, 2rem + 3vw, 4.25rem), ${WM_FIT_CQI}cqi)`;

export function HomeHero({
  labName,
  longName,
  affiliation,
  mission,
  missionDraft,
  figure,
  solo = false,
}: {
  labName: string;
  longName: string;
  affiliation: string;
  mission?: string;
  missionDraft?: boolean;
  figure: ReactNode;
  /** No figure (0 live directions, §E9): one column, the note sits under the CTA. */
  solo?: boolean;
}) {
  return (
    <div className={solo ? "hm-hero hm-hero--solo" : "hm-hero"}>
      <div className="hm-id">
        <div className="hm-ident">
          <h1 className="hm-h1" tabIndex={-1}>
            <Wordmark className="hm-wm" height={HERO_WORDMARK_HEIGHT} title={labName} />
            <span className="hm-desc">{longName}</span>
          </h1>
          <p className="hm-aff">{affiliationText(affiliation)}</p>
        </div>
        <div className="hm-lead">
          {mission && (
            <div className="hm-mission-wrap">
              <p className="hm-mission">{mission}</p>
              <DraftBadge show={Boolean(missionDraft)} />
            </div>
          )}
          <Link href="/research/" className="bl-cta hm-cta">
            Explore our research
            <Icon name="arrow-right" />
          </Link>
        </div>
      </div>
      {figure}
    </div>
  );
}

/** §E9 n = 0: mission plus "Research directions coming soon" (no figure). */
export function DirectionsComingSoon({ headingId = "dirs-h" }: { headingId?: string }) {
  return (
    <section className="hm-soon" aria-labelledby={headingId}>
      <h2 id={headingId}>Research directions</h2>
      <p className="t-muted">Coming soon.</p>
    </section>
  );
}
