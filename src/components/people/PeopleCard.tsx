/**
 * Cards for the People index (brief §D9 "Card"):
 *   avatar (consented photo, else pearl initials) · name (linked only when the
 *   person has a profile page) · role and program · Draft badge (preview) ·
 *   at most 3 interests · direction tags · links / email (consent-gated).
 * Alumni use the compact <AlumniEntry>, with "Now at" only when now_at_public.
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

export function PeopleCard({ item, lead = false }: { item: PersonItem; lead?: boolean }) {
  const p = item.person;
  const id = `person-${p.slug}`;
  return (
    <article className={lead ? "pp-card pp-card--lead" : "pp-card"} aria-labelledby={id}>
      <PersonAvatar person={p} swatch={item.swatch} initials={item.initials} size="card" />
      <div className="pp-card__body">
        <h3 className="pp-card__name" id={id}>
          <Name item={item} />
        </h3>
        <p className="pp-card__role">{item.roleLine}</p>
        {p.draft && (
          <p className="pp-card__badges">
            <DraftBadge />
          </p>
        )}
        {p.interests.length > 0 && (
          <p className="pp-card__interests">
            <span className="vh">Interests: </span>
            {p.interests.slice(0, 3).join(" · ")}
          </p>
        )}
        <PearlTagList items={item.directions} label={`Research directions of ${p.name}`} />
        <PersonLinks name={p.name} links={personLinks(p)} />
      </div>
    </article>
  );
}

export function AlumniEntry({ item }: { item: PersonItem }) {
  const p = item.person;
  const id = `person-${p.slug}`;
  return (
    <article className="pp-alum" aria-labelledby={id}>
      <PersonAvatar person={p} swatch={item.swatch} initials={item.initials} size="row" />
      <div className="pp-alum__body">
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
      </div>
    </article>
  );
}
