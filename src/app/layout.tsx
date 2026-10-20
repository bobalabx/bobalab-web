import type { Metadata, Viewport } from "next";
import "./globals.css";
import { fontVariables } from "@/fonts";
import { getContent, isPreview } from "@/lib/content/load";
import { lastUpdated } from "@/lib/site/build-info";
import {
  DEFAULT_DESCRIPTION,
  SITE_TITLE_HOME,
  TITLE_TEMPLATE,
  OG_IMAGE,
  metadataBase,
} from "@/lib/seo/metadata";
import { PrePaintScript } from "@/components/site/PrePaintScript";
import { SkipLink } from "@/components/site/SkipLink";
import { PreviewRibbon } from "@/components/site/PreviewRibbon";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { RouteFocus } from "@/components/site/RouteFocus";

/**
 * Content-Security-Policy via <meta> (GitHub Pages cannot send headers; brief §G4).
 * Production only: `next dev` needs eval and websockets for HMR.
 * 'unsafe-inline' scripts are required by Next's no-nonce static pattern.
 */
const CSP =
  "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; " +
  "img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'none'";

export async function generateMetadata(): Promise<Metadata> {
  const { site } = getContent();
  return {
    metadataBase: metadataBase(site.site_url),
    title: { default: SITE_TITLE_HOME, template: TITLE_TEMPLATE },
    description: DEFAULT_DESCRIPTION,
    applicationName: site.name,
    openGraph: { siteName: site.name, type: "website", images: [OG_IMAGE] },
    twitter: { card: "summary_large_image" },
    formatDetection: { email: false, address: false, telephone: false },
  };
}

export const viewport: Viewport = {
  // Never set maximumScale/userScalable (WCAG 1.4.4).
  width: "device-width",
  initialScale: 1,
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FCFAF6" },
    { media: "(prefers-color-scheme: dark)", color: "#17110E" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  const { site } = getContent();
  const preview = isPreview();
  return (
    <html
      lang="en"
      className={fontVariables}
      suppressHydrationWarning
      data-preview={preview ? "" : undefined}
    >
      <head>
        {process.env.NODE_ENV === "production" && (
          <meta httpEquiv="Content-Security-Policy" content={CSP} />
        )}
        <PrePaintScript />
      </head>
      <body>
        <SkipLink />
        <PreviewRibbon show={preview} />
        <SiteHeader />
        <main id="main" tabIndex={-1}>
          {children}
        </main>
        <SiteFooter site={site} lastUpdated={lastUpdated()} />
        <RouteFocus />
      </body>
    </html>
  );
}
