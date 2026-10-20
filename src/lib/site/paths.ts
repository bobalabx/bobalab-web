/**
 * Base-path helpers. next/link and metadata already apply `basePath`; plain
 * <img src>, <a href> to files in /public, and RSS/JSON-LD URLs do not.
 */
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/** Prefix a site-relative path ("/uploads/x.webp") with the base path. Leaves absolute URLs alone. */
export function withBasePath(path: string): string {
  if (!path || /^[a-z][a-z0-9+.-]*:/i.test(path) || path.startsWith("//")) return path;
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${BASE_PATH}${p}`;
}

/** Ensure a trailing slash on an internal page path (trailingSlash: true). */
export function pagePath(path: string): string {
  const [p, q] = path.split(/(?=[?#])/);
  const withSlash = p && !p.endsWith("/") && !/\.[a-z0-9]+$/i.test(p) ? `${p}/` : (p ?? "/");
  return q ? `${withSlash}${q}` : withSlash;
}

export const isExternalUrl = (href: string) => /^https?:\/\//i.test(href);
