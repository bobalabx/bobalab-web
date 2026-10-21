/**
 * Direction page header band (brief §D5.1, §E5; DECISIONS D-02a).
 *
 * - Band in the direction tint (light) / computed dark band (dark) via the
 *   swatch tokens (`data-swatch` → --dir-band).
 * - Breadcrumb "Research / 02" and the "All directions" link back to Fig. 1
 *   (`pearl-close`, the reverse morph).
 * - The hero pearl is THE morph target: <ViewTransition name="pearl-{slug}">
 *   lives inside DirectionPearl. Archived directions have no index and no
 *   Fig. 1 pearl, so they get a quiet, unnamed pearl instead.
 * - <h1 tabIndex={-1}> so RouteFocus can land on it after a client navigation.
 */
import Link from "next/link";
import { ViewTransition } from "react";
import type { DirectionView } from "@/lib/content/load";
import { pad2 } from "@/lib/content/directions";
import { pearlVtName, TRANSITION, VT } from "@/lib/vt";
import { Badge, DraftBadge, OpenToRAsBadge } from "@/components/ui/Badge";
import { DateText } from "@/components/ui/DateText";
import { Icon } from "@/components/ui/icons";
import { DirectionPearl } from "./DirPearl";
import { directionStatusLine } from "./model";

/** Shared name for the band so direction → direction navigations crossfade it. */
export const BAND_VT_NAME = "dir-band";

export function DirectionHeader({ direction: d }: { direction: DirectionView }) {
  const archived = d.status === "archived" || d.index == null;
  return (
    <ViewTransition name={BAND_VT_NAME} share={VT.bandFade} default="none">
      <div className="dr-band" data-swatch={d.color}>
        <div className="bl-container dr-band__inner">
          <div className="dr-band__top">
            <nav aria-label="Breadcrumb" className="dr-crumbs">
              <ol role="list">
                <li>
                  <Link href="/research/">Research</Link>
                </li>
                <li aria-current="page">
                  {archived ? (
                    <span>Earlier research</span>
                  ) : (
                    <>
                      <span className="t-mono" aria-hidden="true">
                        {pad2(d.index!)}
                      </span>
                      <span className="vh">{d.short_label}</span>
                    </>
                  )}
                </li>
              </ol>
            </nav>
            <Link href="/" className="dr-back" transitionTypes={[TRANSITION.pearlClose]}>
              <Icon name="arrow-right" className="dr-back__icon" />
              <span>All directions</span>
            </Link>
          </div>
          <div className="dr-hero">
            <div className="dr-hero__pearl">
              {archived ? (
                // No index and no Fig. 1 source: a quiet pearl with its halo, no name, no seeds.
                <DirectionPearl
                  slug={d.slug}
                  index={null}
                  swatch={d.color}
                  seedCount={0}
                  size="hero"
                />
              ) : (
                <DirectionPearl
                  slug={d.slug}
                  index={d.index!}
                  swatch={d.color}
                  seedCount={d.counts.papers}
                  size="hero"
                  vtName={pearlVtName(d.slug)}
                  bloomOnMount
                />
              )}
            </div>
            <div className="dr-hero__text">
              <h1 tabIndex={-1} className="dr-title">
                {d.title}
              </h1>
              {d.question && <p className="dr-question">{d.question}</p>}
              <p className="dr-status">{directionStatusLine(d)}</p>
              {(archived || d.openToRAs || d.draft) && (
                <div className="dr-badges">
                  {archived && (
                    <Badge>
                      Archived
                      {d.archived_on ? (
                        <>
                          {" "}
                          · <DateText value={d.archived_on} />
                        </>
                      ) : null}
                    </Badge>
                  )}
                  {d.openToRAs && <OpenToRAsBadge />}
                  <DraftBadge show={d.draft} />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </ViewTransition>
  );
}
