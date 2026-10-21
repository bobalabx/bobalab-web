# WP4 request 5: Person JSON-LD: identity links only in `sameAs`, and a named employer

- File(s): `src/lib/seo/jsonld.ts` (WP0), `personNode()`
- Why: brief §G3 "Person plus ProfilePage for the PI". The PI page today emits (MEASURED on `/people/park-sinchaisri/`, 2026-10-20):
  1. `sameAs` = every `https:` value of `links`, including `links.cv` (`…/files/cv.pdf`). schema.org `sameAs` is for pages that unambiguously identify the person (homepage, Scholar, ORCID, LinkedIn, GitHub); a PDF document is not one.
  2. `worksFor: { "@id": "<site>/#organization" }` only. The organization node with that `@id` is emitted on Home and About, not on the person page, so a consumer reading this page alone gets an employer with no name or type.
- Proposed change:

  ```ts
  const IDENTITY_LINKS = ["website", "scholar", "orcid", "linkedin", "github"] as const;
  …
  const sameAs = IDENTITY_LINKS.map((k) => p.links?.[k]).filter(
    (v): v is string => typeof v === "string" && /^https:/.test(v),
  );
  return {
    "@type": "Person",
    name: p.name,
    jobTitle: p.title,
    url: absoluteUrl(path, site.site_url),
    worksFor: {
      "@type": "ResearchOrganization",
      "@id": absoluteUrl("/#organization", site.site_url),
      name: site.long_name,
    },
    sameAs,
  };
  ```

- Blocking? No (semantics only; Google has no Person rich result, brief §G3).
- Test that proves it: `tests/unit/foundation` JSON-LD test: `personNode({ links: { cv: "https://x/cv.pdf", orcid: "https://orcid.org/0" } …}).sameAs` equals `["https://orcid.org/0"]`, and `worksFor.name === site.long_name`. WP4's e2e (`tests/e2e/people.spec.ts`, "PI profile") keeps passing unchanged.
