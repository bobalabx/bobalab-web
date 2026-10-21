# WP5 request 6: advertise the RSS feed on every page

- File(s): `src/app/layout.tsx` (WP0)
- Why: brief §D10/§G3 put RSS at `/news/feed.xml` and the footer links it on every page, but feed readers and browsers discover feeds through `<link rel="alternate" type="application/rss+xml">` in `<head>`. WP5 adds it on `/news/` and `/news/{slug}/` only (`withFeedAlternate()` in `src/components/news/FeedLink.tsx`); pasting the home URL into a reader finds nothing.
- Proposed change, in `generateMetadata()` of the root layout:
  ```diff
     openGraph: { siteName: site.name, type: "website", images: [OG_IMAGE] },
  +  alternates: {
  +    types: { "application/rss+xml": [{ url: "news/feed.xml", title: `${site.name} news` }] },
  +  },
  ```
  (Relative URL so it resolves against `metadataBase`, which includes the base path. Pages that set their own `alternates.canonical` through `pageMetadata()` replace the whole `alternates` object, so `pageMetadata()` in `src/lib/seo/metadata.ts` should merge the same `types` entry; otherwise only pages without their own canonical keep it.)
- Blocking? no.
- Test that proves it: `curl -s http://localhost:3100/ | grep 'application/rss+xml'` finds one `<link rel="alternate">` on home, research, publications and people pages.
