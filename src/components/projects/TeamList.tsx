/**
 * Project team (§D6.6): listed lab members (linked when they have a profile
 * page), external collaborators only with consent: true, partners only with
 * public: true. The loader already filtered all three. Team members without a
 * public record in this build are named as plain text only when they author
 * one of the project's papers (projectTeamRows; verify CON-11, D-06).
 */
import Link from "next/link";
import type { ProjectView } from "@/lib/content/load";
import { ROLE_LABELS, initials } from "@/lib/content/people";
import { Pearl } from "@/components/ui/Pearl";
import { DraftBadge } from "@/components/ui/Badge";
import { projectTeamRows } from "./model";

export function hasTeam(p: ProjectView): boolean {
  return projectTeamRows(p).length + p.visibleCollaborators.length + p.visiblePartners.length > 0;
}

export function TeamList({ project: p }: { project: ProjectView }) {
  const rows = projectTeamRows(p);
  return (
    <div className="pj-team">
      {rows.length > 0 && (
        <ul className="pj-team__members" role="list" aria-label="Lab members">
          {rows.map((row) => {
            if (row.kind === "name") {
              // No public record yet (D-06): the name only, as on the paper.
              return (
                <li key={row.slug} className="pj-member pj-member--plain">
                  <span className="pj-member__text">
                    <span className="pj-member__name">{row.name}</span>
                  </span>
                </li>
              );
            }
            const m = row.person;
            return (
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
            );
          })}
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
