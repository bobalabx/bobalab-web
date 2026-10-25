/**
 * Small server pieces shared by the publications ledger and the paper page
 * (brief §D7–§D8; D-13 "Lines"): author list, venue line, review status.
 *
 * Lab members are set in weight 600 (the CV convention). On the paper page they
 * link to their profile when they are listed and have one, and an external
 * coauthor's name links to the web page entered for them (external coauthors
 * are not people, D-05). In the ledger every name is plain text (P3 `.au
 * .lab`): one link per row, the title, is enough, and a bold name always
 * means the same thing (an underlined name on 17 rows in a row read as noise,
 * and only some lab members have a profile to link to).
 */
import Link from "next/link";
import { Fragment, type ReactNode } from "react";
import type { AuthorView, PublicationView } from "@/lib/content/load";
import { typeWord, venueLine } from "@/lib/publications/csl";
import { PUBLICATION_STATUS_LABELS } from "@/components/ui/labels";

type AuthorVariant = "page" | "row";

const CLASSES: Record<AuthorVariant, { lab: string; ext: string }> = {
  page: { lab: "pub-author pub-author--lab", ext: "pub-author pub-author--ext" },
  row: { lab: "bl-pub__author--lab", ext: "" },
};

export function AuthorList({
  authors,
  variant = "page",
  currentPerson,
}: {
  authors: AuthorView[];
  variant?: AuthorVariant;
  /** Slug of the person whose page a list is on: their own name is not linked. */
  currentPerson?: string;
}) {
  const cls = CLASSES[variant];
  return (
    <>
      {authors.map((a, i) => {
        const sep =
          i === 0
            ? ""
            : i === authors.length - 1
              ? authors.length > 2
                ? ", and "
                : " and "
              : ", ";
        let name: ReactNode = a.name;
        if (a.isLab && a.person) {
          name =
            variant === "page" && a.person.hasProfile && a.person.slug !== currentPerson ? (
              <Link href={`/people/${a.person.slug}/`} className={cls.lab}>
                {a.name}
              </Link>
            ) : (
              <strong className={cls.lab}>{a.name}</strong>
            );
        } else if (a.url && variant === "page") {
          name = (
            <a href={a.url} rel="noopener noreferrer" className={cls.ext}>
              {a.name}
            </a>
          );
        }
        return (
          <Fragment key={`${a.name}-${i}`}>
            {sep}
            {name}
          </Fragment>
        );
      })}
    </>
  );
}

/**
 * "<cite>Management Science</cite> 2026, 72(1):733–755; online May 22, 2025".
 * Without a venue a bare year would look like a missing field, so the line
 * names the type: "Working paper, 2026".
 */
export function VenueLineText({ pub }: { pub: PublicationView }) {
  const v = venueLine(pub);
  if (!v.venue && !v.detail && !v.online) return null;
  if (!v.venue && !v.online && pub.year && v.detail === String(pub.year))
    return <span className="pub-venue__detail">{`${typeWord(pub)}, ${pub.year}`}</span>;
  const serial = pub.type === "journal" || pub.type === "conference" || pub.type === "chapter";
  return (
    <>
      {v.venue && <cite className="pub-venue__name">{v.venue}</cite>}
      {v.detail && (
        <span className="pub-venue__detail">
          {v.venue && serial ? " " : ""}
          {v.detail}
        </span>
      )}
      {v.online && <span className="pub-venue__online">; {v.online}</span>}
    </>
  );
}

type StatusFields = Pick<PublicationView, "type" | "status" | "status_note">;

/**
 * The review status worth stating: null for published papers, and for a bare
 * "Working paper" status on a working paper or "In progress" on work in
 * progress (each only repeats the type word: "Work in progress … In progress,
 * as of …" said the same thing twice on every such row).
 */
export function reviewStatus(p: StatusFields): string | null {
  if (p.status === "published") return null;
  const repeatsType =
    !p.status_note &&
    ((p.status === "working-paper" && p.type === "working-paper") ||
      (p.status === "in-progress" && p.type === "work-in-progress"));
  if (repeatsType) return null;
  return `${PUBLICATION_STATUS_LABELS[p.status]}${p.status_note ? ` ${p.status_note}` : ""}`;
}

/**
 * Ledger form, a plain academic label: "Major revision at Manufacturing &
 * Service Operations Management". No "as of" date and no provenance note (the
 * site is the lab's own; copy sweep, docs/CONTENT-QUESTIONS.md). After
 * "arXiv preprint" the status "Preprint v2" adds only the version, so it is
 * left out of the row (the paper page still gives it).
 */
export function statusText(p: StatusFields & { venue?: string }): string | null {
  if (p.status === "preprint" && /preprint/i.test(p.venue ?? "")) return null;
  return reviewStatus(p);
}

/** Paper page: the status as one plain line ("Preprint v2", "Submitted to …"). */
export function StatusDetail({ pub }: { pub: PublicationView }) {
  const s = reviewStatus(pub);
  if (!s) return null;
  return <span className="pub-status__main">{s}</span>;
}
