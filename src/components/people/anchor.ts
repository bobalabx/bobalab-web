/**
 * Where the lab's people are listed: the home page's People section. It had a
 * page of its own (/people/) until the owner moved it onto the home page
 * (2026-10-29); content/site.yml redirects the old address here. A plain module
 * (no React), so the header's client navigation can import it too.
 */
export const PEOPLE_ANCHOR = "people";
/** The link to the People section from any page (header, breadcrumbs, "All people"). */
export const PEOPLE_HREF = `/#${PEOPLE_ANCHOR}`;
