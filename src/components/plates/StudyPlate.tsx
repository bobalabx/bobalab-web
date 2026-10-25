/**
 * Renders a publication's study-design plate as a numbered figure (D-13 item
 * 8; P3 paper.html `figure.plate`), or nothing:
 *   - nothing when no plate is registered for the slug (registry.tsx);
 *   - nothing unless `plate_verified` is true or this is a preview build
 *     (`showStudyPlate`). In a preview build an unverified plate says
 *     "Draft figure, pending author check" beside its heading.
 *
 * The plate is framed by the page's two heavy rules (2 px ink, top and
 * bottom), coloured by the paper's first direction, and captioned with its
 * source. Server component; only the step-through is client code.
 */
import type { PublicationView } from "@/lib/content/load";
import { showStudyPlate } from "@/lib/content/queries";
import { PlateStepper } from "./PlateStepper";
import { plateFor } from "./registry";
import "./plates.css";

export function StudyPlate({
  pub,
  preview,
  figure = 1,
  headingLevel = "h2",
}: {
  pub: Pick<PublicationView, "slug" | "plate_verified" | "directionRefs">;
  /** Content.preview (or isPreview()). */
  preview: boolean;
  /** Figure number on this page. */
  figure?: number;
  headingLevel?: "h2" | "h3";
}) {
  const def = plateFor(pub.slug);
  if (!def || !showStudyPlate(pub, preview)) return null;
  const H = headingLevel;
  const id = `plate-${pub.slug}`;
  return (
    <section className="plate-sec" aria-labelledby={`${id}-h`}>
      <figure
        className="plate"
        data-swatch={pub.directionRefs[0]?.color}
        aria-labelledby={`${id}-cap`}
      >
        <PlateStepper
          heading={
            <H id={`${id}-h`} className="plate-h">
              Study design
            </H>
          }
          aside={
            pub.plate_verified ? undefined : (
              <span className="plate-draft">Draft figure, pending author check</span>
            )
          }
          steps={def.steps}
        >
          <def.Body />
        </PlateStepper>
        <figcaption className="plate-cap" id={`${id}-cap`}>
          <b>Figure {figure}.</b> {def.caption}
        </figcaption>
        <p className="plate-src">{def.source}</p>
      </figure>
    </section>
  );
}
