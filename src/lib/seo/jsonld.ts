/**
 * JSON-LD builders (brief §G3), typed with schema-dts. Render with <JsonLd data={…} />.
 * Absolute URLs are built from siteOrigin() + base path.
 */
import type {
  NewsArticle,
  Person,
  ProfilePage,
  ResearchOrganization,
  ResearchProject,
  ScholarlyArticle,
  WithContext,
} from "schema-dts";
import type {
  SiteData,
  PublicationEntry,
  PersonEntry,
  NewsEntry,
  DirectionEntry,
  ProjectEntry,
} from "@/lib/content/schema";
import { siteOrigin } from "./metadata";

export function absoluteUrl(path: string, siteUrl?: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  return `${siteOrigin(siteUrl)}${base}${path.startsWith("/") ? path : `/${path}`}`;
}

export function organizationLd(site: SiteData): WithContext<ResearchOrganization> {
  return {
    "@context": "https://schema.org",
    "@type": "ResearchOrganization",
    "@id": absoluteUrl("/#organization", site.site_url),
    name: site.name,
    alternateName: site.long_name,
    url: absoluteUrl("/", site.site_url),
    email: site.email,
    address: { "@type": "PostalAddress", streetAddress: site.address },
    parentOrganization: {
      "@type": "EducationalOrganization",
      name: "Haas School of Business, University of California, Berkeley",
      url: "https://haas.berkeley.edu/",
      parentOrganization: {
        "@type": "CollegeOrUniversity",
        name: "University of California, Berkeley",
        url: "https://www.berkeley.edu/",
      },
    },
    sameAs: Object.values(site.social ?? {}),
  };
}

export function researchProjectLd(
  item: Pick<DirectionEntry, "title" | "summary"> | Pick<ProjectEntry, "title" | "summary">,
  path: string,
  site: SiteData,
): WithContext<ResearchProject> {
  return {
    "@context": "https://schema.org",
    "@type": "ResearchProject",
    name: item.title,
    description: item.summary,
    url: absoluteUrl(path, site.site_url),
    parentOrganization: { "@id": absoluteUrl("/#organization", site.site_url) },
  };
}

export function scholarlyArticleLd(
  p: Pick<
    PublicationEntry,
    "title" | "authors" | "year" | "venue" | "doi" | "in_brief" | "date_online"
  >,
  path: string,
  site: SiteData,
): WithContext<ScholarlyArticle> {
  return {
    "@context": "https://schema.org",
    "@type": "ScholarlyArticle",
    headline: p.title,
    name: p.title,
    author: p.authors.map((a) => ({
      "@type": "Person",
      name: a.name,
      ...(a.url ? { url: a.url } : {}),
    })),
    datePublished: p.date_online ?? (p.year ? String(p.year) : undefined),
    isPartOf: p.venue ? { "@type": "Periodical", name: p.venue } : undefined,
    identifier: p.doi ? { "@type": "PropertyValue", propertyID: "DOI", value: p.doi } : undefined,
    sameAs: p.doi ? `https://doi.org/${p.doi}` : undefined,
    abstract: p.in_brief,
    url: absoluteUrl(path, site.site_url),
  };
}

/**
 * Links that unambiguously identify the person (schema.org `sameAs`). A CV is a
 * document about the person, not an identity page, so it is left out (WP4 request 5).
 */
const IDENTITY_LINKS = ["haas", "website", "scholar", "orcid", "linkedin", "github"] as const;

function personNode(
  p: Pick<PersonEntry, "name" | "title" | "links">,
  path: string,
  site: SiteData,
): Person {
  const links: Partial<Record<string, string>> = p.links ?? {};
  const sameAs = IDENTITY_LINKS.map((k) => links[k]).filter(
    (v): v is string => typeof v === "string" && /^https:/.test(v),
  );
  return {
    "@type": "Person",
    name: p.name,
    jobTitle: p.title,
    url: absoluteUrl(path, site.site_url),
    // Named and typed, so a consumer reading this page alone knows the employer.
    worksFor: {
      "@type": "ResearchOrganization",
      "@id": absoluteUrl("/#organization", site.site_url),
      name: site.long_name,
    },
    sameAs,
  };
}

export function personLd(
  p: Pick<PersonEntry, "name" | "title" | "links">,
  path: string,
  site: SiteData,
): WithContext<Person> {
  return {
    "@context": "https://schema.org",
    ...(personNode(p, path, site) as Exclude<Person, string>),
  } as WithContext<Person>;
}

export function profilePageLd(
  p: Pick<PersonEntry, "name" | "title" | "links">,
  path: string,
  site: SiteData,
): WithContext<ProfilePage> {
  return {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    url: absoluteUrl(path, site.site_url),
    mainEntity: personNode(p, path, site),
  };
}

export function newsArticleLd(
  n: Pick<NewsEntry, "title" | "date" | "summary">,
  path: string,
  site: SiteData,
): WithContext<NewsArticle> {
  return {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: n.title,
    datePublished: n.date,
    description: n.summary,
    url: absoluteUrl(path, site.site_url),
    publisher: { "@id": absoluteUrl("/#organization", site.site_url) },
  };
}

/** Serialise for a <script type="application/ld+json">, escaping "<" (brief §G3). */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
