"use client";
/**
 * Primary navigation with aria-current (five items, one line at 375 px — brief
 * §D1). "People" goes to the home page's People section (the list page moved
 * there, owner 2026-10-29) and is current on a person's profile page.
 */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PEOPLE_HREF } from "@/components/people/anchor";

export const NAV_ITEMS = [
  { href: "/research/", label: "Research", match: ["/research/", "/projects/"] },
  { href: "/publications/", label: "Publications", match: ["/publications/"] },
  { href: PEOPLE_HREF, label: "People", match: ["/people/"] },
  { href: "/news/", label: "News", match: ["/news/"] },
  { href: "/join/", label: "Join", match: ["/join/"] },
] as const;

export function SiteNav() {
  const pathname = usePathname() ?? "/";
  const path = pathname.endsWith("/") ? pathname : `${pathname}/`;
  return (
    <nav className="bl-header__nav" aria-label="Main">
      <ul className="bl-nav__list">
        {NAV_ITEMS.map((item) => {
          const active = item.match.some((m) => path.startsWith(m));
          return (
            <li key={item.href}>
              <Link
                className="bl-nav__link"
                href={item.href}
                aria-current={active ? "page" : undefined}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
