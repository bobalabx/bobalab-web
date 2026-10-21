/**
 * /robots.txt (brief §G3, §D2; WP8).
 *
 * Production: allow everything except the CMS at /admin/, and point to the
 * root sitemap. Preview builds (`npm run dev`, `npm run build:preview`) render
 * drafts and are never deployed (DECISIONS D-03); if one ever were, it tells
 * crawlers to stay out entirely.
 *
 * Paths carry NEXT_PUBLIC_BASE_PATH. Note that crawlers only read robots.txt at
 * the origin root, so under a project-site base path this file is advisory;
 * /admin/ also carries its own `noindex` (WP6).
 */
import type { MetadataRoute } from "next";
import { getContent } from "@/lib/content/load";
import { siteOrigin } from "@/lib/seo/metadata";
import { BASE_PATH } from "@/lib/site/paths";

export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  const c = getContent();
  const sitemap = `${siteOrigin(c.site.site_url)}${BASE_PATH}/sitemap.xml`;
  const admin = `${BASE_PATH}/admin/`;
  if (c.preview) {
    return { rules: { userAgent: "*", disallow: [`${BASE_PATH}/`, admin] }, sitemap };
  }
  return { rules: { userAgent: "*", allow: `${BASE_PATH}/`, disallow: admin }, sitemap };
}
