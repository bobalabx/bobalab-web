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
import { formatDate } from "@/lib/content/dates";
import { venueLine } from "@/lib/publications/csl";
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

/** "<cite>Management Science</cite> 2026, 72(1):733–755; online May 22, 2025". */
export function VenueLineText({ pub }: { pub: PublicationView }) {
  const v = venueLine(pub);
  if (!v.venue && !v.detail && !v.online) return null;
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

type StatusFields = Pick<
  PublicationView,
  "type" | "status" | "status_note" | "as_of" | "status_source"
>;

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
 * Ledger form: "Major revision at M&SOM, as of Apr 2026". The lab's own claim
 * is dated on the row; the page carries one provenance footnote instead of a
 * hedge on every row (D-13 item 7).
 */
export function statusText(p: StatusFields & { venue?: string }): string | null {
  // After "arXiv preprint" the status "Preprint v2" only adds the version.
  const s =
    p.status === "preprint" && /preprint/i.test(p.venue ?? "")
      ? (p.status_note ?? null)
      : reviewStatus(p);
  if (!s) return null;
  return p.as_of ? `${s}, as of ${formatDate(p.as_of)}` : s;
}

/** True when a review status shown on the page is the lab's own report. */
export const isSelfReportedStatus = (p: StatusFields) =>
  reviewStatus(p) !== null && p.status_source === "self-reported";

/**
 * Paper page: the status with its date and provenance in one muted line
 * (the page's one provenance note, D-13 item 7).
 */
export function StatusDetail({ pub }: { pub: PublicationView }) {
  const s = reviewStatus(pub);
  if (!s) return null;
  const when = pub.as_of ? `As of ${formatDate(pub.as_of, { long: true })}` : null;
  const source = pub.status_source === "self-reported" ? "as reported by the lab" : null;
  const meta = [when, source].filter(Boolean).join(", ");
  return (
    <>
      <span className="pub-status__main">{s}</span>
      {meta && (
        <span className="pub-status__meta">{meta.charAt(0).toUpperCase() + meta.slice(1)}.</span>
      )}
    </>
  );
}
