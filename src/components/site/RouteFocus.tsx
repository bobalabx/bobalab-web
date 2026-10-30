"use client";
/**
 * Moves focus to the page's <h1 tabIndex={-1}> after every client-side
 * navigation, but not on first load (brief §E5, R5 C5.10). Next's route
 * announcer reads the new <title>. Pages render `<h1 tabIndex={-1}>`.
 *
 * An address with a #section (the header's People link, /#people, D-21) moves
 * focus to that section's heading instead, where the page has scrolled to, so
 * keyboard focus and the view agree (WCAG 2.4.3).
 */
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

/** The element a #section address names, or null (no hash, or no such element). */
function hashTarget(): HTMLElement | null {
  const hash = window.location.hash.slice(1);
  if (!hash) return null;
  let id = hash;
  try {
    id = decodeURIComponent(hash);
  } catch {
    // A malformed escape: use the hash as it is.
  }
  const el = document.getElementById(id);
  if (!el || !el.closest("main")) return null;
  // A section is not a control: its heading takes the focus (and says where you are).
  return /^H[1-6]$/.test(el.tagName)
    ? el
    : (el.querySelector<HTMLElement>("h1, h2, h3, h4, h5, h6") ?? el);
}

export function RouteFocus() {
  const pathname = usePathname();
  // Compare with the previous pathname (not a "first run" flag): React
  // StrictMode re-runs effects in development, which must not steal focus.
  const prev = useRef(pathname);
  useEffect(() => {
    if (prev.current === pathname) return;
    prev.current = pathname;
    const target =
      hashTarget() ??
      document.querySelector<HTMLElement>('main h1[tabindex="-1"]') ??
      document.querySelector<HTMLElement>("main h1");
    if (!target) return;
    if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
    target.focus({ preventScroll: true });
  }, [pathname]);
  return null;
}
