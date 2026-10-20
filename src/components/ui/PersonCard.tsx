/**
 * Person card (brief §D9). Takes a PublicPerson, whose consent-gated fields
 * (photo, email, now_at) are already removed unless the flag is true.
 * Unlisted people must never reach this component (the loader drops them).
 */
import Link from "next/link";
import type { PublicPerson } from "@/lib/content/people";
import { ROLE_LABELS, initials } from "@/lib/content/people";
import type { DirectionView } from "@/lib/content/load";
import { Pearl } from "./Pearl";
import { Img } from "./Img";
import { DraftBadge } from "./Badge";
import { PearlTagList } from "./PearlTag";

const LINK_LABELS: Record<string, string> = {
  website: "Website",
  scholar: "Google Scholar",
  linkedin: "LinkedIn",
  github: "GitHub",
  orcid: "ORCID",
  cv: "CV",
};

export function PersonCard({
  person,
  directions = [],
  as: H = "h3",
}: {
  person: PublicPerson;
  directions?: DirectionView[];
  as?: "h2" | "h3" | "h4";
}) {
  const links = Object.entries(person.links ?? {}).filter(([, v]) => Boolean(v)) as Array<
    [string, string]
  >;
  const role = person.isAlumni
    ? `Alumni · ${ROLE_LABELS[person.role].one}`
    : person.title || ROLE_LABELS[person.role].one;
  return (
    <article className="bl-person" aria-labelledby={`person-${person.slug}`}>
      {person.photo ? (
        <Img
          src={person.photo}
          alt={person.photo_alt ?? ""}
          width={64}
          height={64}
          className="bl-person__photo"
        />
      ) : (
        <Pearl size="avatar" initials={initials(person.name)} swatch={directions[0]?.color} />
      )}
      <div className="bl-person__body">
        <H className="bl-person__name" id={`person-${person.slug}`}>
          {person.hasProfile ? (
            <Link href={`/people/${person.slug}/`}>{person.name}</Link>
          ) : (
            person.name
          )}
        </H>
        <p className="bl-person__role">
          {role}
          {person.program ? ` · ${person.program}` : ""}
        </p>
        <DraftBadge show={person.draft} />
        {person.now_at && <p className="t-sm">Now at {person.now_at}</p>}
        {person.interests.length > 0 && (
          <p className="t-sm t-muted">{person.interests.join(" · ")}</p>
        )}
        <PearlTagList items={directions} />
        {(links.length > 0 || person.email) && (
          <ul className="bl-person__links" aria-label={`Links for ${person.name}`}>
            {links.map(([k, href]) => (
              <li key={k}>
                <a href={href} rel="noopener noreferrer">
                  {LINK_LABELS[k] ?? k}
                  <span className="vh"> of {person.name}</span>
                </a>
              </li>
            ))}
            {person.email && (
              <li>
                <a href={`mailto:${person.email}`}>
                  Email<span className="vh"> {person.name}</span>
                </a>
              </li>
            )}
          </ul>
        )}
      </div>
    </article>
  );
}
