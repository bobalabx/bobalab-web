/**
 * Project team (§D6.6) and the people roster of a direction page, as ruled
 * rows with a square photo (or a square initials tile when there is no
 * consented photo), the name and the role (D-13 item 5; P1/P2 square-photo
 * people, P3 `ol.ros`).
 *
 * Listed lab members are linked when they have a profile page; external
 * collaborators only with consent: true, partners only with public: true (the
 * loader already filtered all three). Team members without a public record in
 * this build are named as plain text only when they author one of the
 * project's papers (projectTeamRows; verify CON-11, D-06).
 */
import Link from "next/link";
import type { ProjectView } from "@/lib/content/load";
import type { PublicPerson } from "@/lib/content/people";
import { ROLE_LABELS, initials } from "@/lib/content/people";
import { Pearl } from "@/components/ui/Pearl";
import { Img } from "@/components/ui/Img";
import { DraftBadge } from "@/components/ui/Badge";
import { projectTeamRows } from "./model";

export function hasTeam(p: ProjectView): boolean {
  return projectTeamRows(p).length + p.visibleCollaborators.length + p.visiblePartners.length > 0;
}

export function roleLine(m: PublicPerson): string {
  const role =
    m.role === "pi" && m.title
      ? m.title
      : m.isAlumni
        ? `Alumni, ${ROLE_LABELS[m.role].one}`
        : ROLE_LABELS[m.role].one;
  return m.program && m.role !== "pi" ? `${role}, ${m.program}` : role;
}

/** One person row: square photo or initials tile, name (linked to a profile), role. */
export function PersonRow({ person: m }: { person: PublicPerson }) {
  return (
    <li className="pj-member">
      {m.photo ? (
        <Img
          src={m.photo}
          alt=""
          width={56}
          height={56}
          sizes="56px"
          className="pj-member__photo"
        />
      ) : (
        <Pearl size="card" initials={initials(m.name)} className="pj-member__ini" />
      )}
      <span className="pj-member__text">
        <span className="pj-member__name">
          {m.hasProfile ? <Link href={`/people/${m.slug}/`}>{m.name}</Link> : m.name}
        </span>
        <span className="pj-member__role">{roleLine(m)}</span>
        <DraftBadge show={m.draft} />
      </span>
    </li>
  );
}

/** A roster of listed people (direction page "People"). */
export function Roster({ people, label }: { people: PublicPerson[]; label: string }) {
  if (!people.length) return null;
  return (
    <ul className="pj-team__members pj-roster" role="list" aria-label={label}>
      {people.map((m) => (
        <PersonRow key={m.slug} person={m} />
      ))}
    </ul>
  );
}

export function TeamList({ project: p }: { project: ProjectView }) {
  const rows = projectTeamRows(p);
  return (
    <div className="pj-team">
      {rows.length > 0 && (
        <ul className="pj-team__members" role="list" aria-label="Lab members">
          {rows.map((row) =>
            row.kind === "name" ? (
              // No public record yet (D-06): the name only, as on the paper.
              <li key={row.slug} className="pj-member pj-member--plain">
                <span className="pj-member__ini pj-member__ini--blank" aria-hidden="true" />
                <span className="pj-member__text">
                  <span className="pj-member__name">{row.name}</span>
                </span>
              </li>
            ) : (
              <PersonRow key={row.person.slug} person={row.person} />
            ),
          )}
        </ul>
      )}
      {p.visibleCollaborators.length > 0 && (
        <div className="pj-team__group">
          <h3 className="pj-team__label">Collaborators</h3>
          <ul className="pj-team__plain" role="list">
            {p.visibleCollaborators.map((x) => (
              <li key={x.name}>
                {x.url ? (
                  <a href={x.url} rel="noopener noreferrer">
                    {x.name}
                  </a>
                ) : (
                  x.name
                )}
                {x.affiliation && <span className="t-muted">, {x.affiliation}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
      {p.visiblePartners.length > 0 && (
        <div className="pj-team__group">
          <h3 className="pj-team__label">Partners</h3>
          <ul className="pj-team__plain" role="list">
            {p.visiblePartners.map((x) => (
              <li key={x.name}>
                {x.url ? (
                  <a href={x.url} rel="noopener noreferrer">
                    {x.name}
                  </a>
                ) : (
                  x.name
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
