/**
 * Project team (§D6.6): listed lab members only (linked when they have a
 * profile page), external collaborators only with consent: true, partners only
 * with public: true. The loader already filtered all three.
 */
import Link from "next/link";
import type { ProjectView } from "@/lib/content/load";
import { ROLE_LABELS, initials } from "@/lib/content/people";
import { Pearl } from "@/components/ui/Pearl";
import { DraftBadge } from "@/components/ui/Badge";

export function hasTeam(p: ProjectView): boolean {
  return p.teamRefs.length + p.visibleCollaborators.length + p.visiblePartners.length > 0;
}

export function TeamList({ project: p }: { project: ProjectView }) {
  return (
    <div className="pj-team">
      {p.teamRefs.length > 0 && (
        <ul className="pj-team__members" role="list" aria-label="Lab members">
          {p.teamRefs.map((m) => (
            <li key={m.slug} className="pj-member">
              <Pearl size="rail" initials={initials(m.name)} swatch={p.primaryDirection?.color} />
              <span className="pj-member__text">
                <span className="pj-member__name">
                  {m.hasProfile ? <Link href={`/people/${m.slug}/`}>{m.name}</Link> : m.name}
                </span>
                <span className="t-sm t-muted">
                  {m.isAlumni ? "Alumni · " : ""}
                  {m.role === "pi" && m.title ? m.title : ROLE_LABELS[m.role].one}
                </span>
                <DraftBadge show={m.draft} />
              </span>
            </li>
          ))}
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
