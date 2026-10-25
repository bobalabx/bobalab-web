/**
 * People index entries (brief §D9; D-13 item 5: people are lists with square
 * photos, no cards or circles). The `pp-card` / `pp-alum` class names stay for
 * the selector-based tests; what they draw is a ruled row.
 *   PeopleCard (lead): the PI, a 160 px square (photo or initials), name,
 *     title, the lab affiliation, direction segments and links.
 *   PeopleCard: a 64 px square, name (linked only when the person has a
 *     profile page), role and program, Draft marker (preview), at most 3
 *     interests, direction segments, links / email (consent-gated).
 *   AlumniEntry: compact text row (name, role, "Now at" only when
 *     now_at_public, links); no avatar.
 * Only listed people ever reach these components (the loader drops the rest).
 */
import Link from "next/link";
import { DraftBadge } from "@/components/ui/Badge";
import { PearlTagList } from "@/components/ui/PearlTag";
import { PersonAvatar } from "./PersonAvatar";
import { PersonLinks } from "./PersonLinks";
import { personLinks, type PersonItem } from "./model";

function Name({ item }: { item: PersonItem }) {
  const p = item.person;
  return p.hasProfile ? <Link href={`/people/${p.slug}/`}>{p.name}</Link> : <>{p.name}</>;
}

export function PeopleCard({
  item,
  lead = false,
  affiliation,
}: {
  item: PersonItem;
  lead?: boolean;
  /** The lab's affiliation (site.yml), shown under the PI's title. */
  affiliation?: string;
}) {
  const p = item.person;
  const id = `person-${p.slug}`;
  return (
    <article className={lead ? "pp-card pp-card--lead" : "pp-card"} aria-labelledby={id}>
      <PersonAvatar
        person={p}
        swatch={item.swatch}
        initials={item.initials}
        size={lead ? "lead" : "card"}
      />
      <div className="pp-card__body">
        <h3 className="pp-card__name" id={id}>
          <Name item={item} />
        </h3>
        <p className="pp-card__role">{item.roleLine}</p>
        {lead && affiliation ? <p className="pp-card__affil">{affiliation}</p> : null}
        {p.draft && (
          <p className="pp-card__badges">
            <DraftBadge />
          </p>
        )}
        {p.interests.length > 0 && (
          <p className="pp-card__interests">
            <span className="vh">Interests: </span>
            {p.interests.slice(0, 3).join(", ")}
          </p>
        )}
        <PearlTagList items={item.directions} label={`Research directions of ${p.name}`} />
        <PersonLinks name={p.name} links={personLinks(p)} variant={lead ? "lead" : "inline"} />
      </div>
    </article>
  );
}

export function AlumniEntry({ item }: { item: PersonItem }) {
  const p = item.person;
  const id = `person-${p.slug}`;
  return (
    <article className="pp-alum" aria-labelledby={id}>
      <h4 className="pp-alum__name" id={id}>
        <Name item={item} />
      </h4>
      <p className="pp-alum__role">{item.roleLine}</p>
      {p.now_at && <p className="pp-alum__now">Now at {p.now_at}</p>}
      {p.draft && (
        <p className="pp-card__badges">
          <DraftBadge />
        </p>
      )}
      <PearlTagList items={item.directions} label={`Research directions of ${p.name}`} />
      <PersonLinks name={p.name} links={personLinks(p)} />
    </article>
  );
}
