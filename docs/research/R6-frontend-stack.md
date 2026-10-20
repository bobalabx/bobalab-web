# R6: Frontend stack and quality tooling for the BOBALAB site (checked 2026-10-20)

Scope: Windows 11 Home, Node 24.19.0, npm 11.17.0 (checked locally with `node --version` and `npm --version`). Everything below was checked against official docs, release notes, npm registry metadata, or published source code on 2026-10-20 (UTC around 20:00).

**Evidence labels**

- **DOCUMENTED**: an official or primary source states it. The URL is given. For package versions and dates, the source is the npm registry (`https://registry.npmjs.org/<pkg>`, read with `npm view`).
- **CORROBORATED**: two or more independent sources agree.
- **HYPOTHESIS**: my inference. When I tested something locally, I say so in brackets, for example "(tested: lockfile resolution only)".
- **UNKNOWN**: I could not establish it.

Local experiments: I ran `npm install --package-lock-only --ignore-scripts` in throwaway folders. This resolves the dependency tree and writes only a lockfile. Nothing was installed, built, or executed. That surfaces peer-dependency conflicts but proves nothing about runtime behaviour. Raw evidence (registry time JSON, source files, issue JSON) is in `research/raw/r6/`.

---

## 0. Recommendation in short

| Layer | Pick (exact version) | Why |
|---|---|---|
| Framework | **next 16.4.2**, App Router, Turbopack (default) | Latest stable, published 2026-10-15. It includes the 2026-10-14 security fixes. |
| React | **react / react-dom 19.3.1** | Patches the critical RSC advisory GHSA-xqc2-xf4c-x3h3. create-next-app 16.4.2 still pins 19.3.0. |
| Language | **typescript 6.0.3** (not 7.0.2) | TypeScript 7 ships no JS API, and typescript-eslint 8.72.0 requires TypeScript `<6.1.0`. |
| CSS | **tailwindcss 4.3.3 + @tailwindcss/postcss 4.3.3** (+ @tailwindcss/typography 0.5.20) | The documented setup in both the Tailwind and Next docs. |
| Animation | **motion 14.4.0** (import from `motion/react`; use `LazyMotion` + `m` to keep bundles small) | Current major. v14 has no breaking changes for React users. |
| Rich text | **Markdoc** (`@markdoc/markdoc` 0.5.10) through the CMS. Use MDX only for developer-authored pages. | Keystatic's native rich-text field. No arbitrary JS in editor content. |
| Publication search | **minisearch 7.2.0** plus plain array filters. Pagefind 1.5.2 only for later site-wide search. | 50–200 records fit easily in memory. |
| BibTeX | **@citation-js/core + plugin-bibtex (+ plugin-csl) 0.9.0**, run at build time. **@retorquere/bibtex-parser 12.1.10** as a fallback for messy `.bib` imports. Copy with `navigator.clipboard.writeText`. | |
| Structured data | Inline `<script type="application/ld+json">` typed with **schema-dts 2.1.0**, plus Google Scholar `citation_*` meta tags through Metadata `other` | |
| E2E / a11y | **@playwright/test 1.64.1 + @axe-core/playwright 4.14.0** | |
| Unit | **vitest 5.0.5 + vite 8.3.4**, using the `node` environment for pure functions (BibTeX, search index, JSON-LD builders) | |
| Perf | **lighthouse 13.5.0** CLI. @lhci/cli 0.15.1 is optional and still bundles Lighthouse 12.6.1. | |
| Links | **linkinator 8.1.0** for internal links on every build. **lychee v0.24.2** (lychee-action v2.9.0) for scheduled external-link checks in CI. | |
| Lint/format | **eslint 10.13.0 + eslint-config-next 16.4.2 + eslint-config-prettier 10.1.8**, **prettier 3.9.10 + prettier-plugin-tailwindcss 0.8.1** | ESLint 9 has been end-of-life since 2026-08-06. |
| CMS (compat only; the choice belongs to another task) | Keystatic: **@keystatic/core 0.6.9 + @keystatic/next 5.0.5**. Sanity: **sanity 6.20.0 + next-sanity 13.3.4** | Both resolve cleanly against next 16.4.2 and React 19.3.1. Open issues are listed in §11. |

**The main architectural point.** Keystatic's admin needs server API routes, so it cannot live inside an `output: 'export'` build. Pick one of two shapes:

- **(A) Recommended.** Use normal Next output on a Node-capable host. Public pages are still prerendered to static HTML, and Keystatic runs in GitHub mode.
- **(B)** A static export for the public site, plus a separate small Node deployment (or local-only mode) for the admin. The static `out/` folder must be built on Linux CI, not Windows, because of open Next.js bug #85374 (§14).

---

## 1. Version table with publish dates

All dates are npm publish dates (UTC). DOCUMENTED: `https://registry.npmjs.org/<package>` (queried 2026-10-20). Extra sources are in the Notes column.

| Package | Recommended | Published | Latest tag on 2026-10-20 | Notes |
|---|---|---|---|---|
| next | 16.4.2 | 2026-10-15 | 16.4.2 (canary 16.5.0-canary.20) | 16.0 GA 2025-10-21; 16.4.0 on 2026-10-06; 16.4.1 on 2026-10-14 (security). Engines: node >=20.9.0 |
| react, react-dom | 19.3.1 | 2026-10-14 | 19.3.1 | 19.3.0 on 2026-09-09. Next 16.4 "ships with React 19.3" ([blog](https://nextjs.org/blog/next-16-4)) |
| typescript | 6.0.3 | 2026-04-16 | 7.0.2 (2026-07-08) | See §10 for why not 7 |
| @types/react, @types/react-dom | 19.3.0 | — | 19.3.0 | |
| @types/node | 24.19.2 | — | 26.6.5 | Matches the Node 24 runtime |
| tailwindcss, @tailwindcss/postcss | 4.3.3 | 2026-07-16 | 4.3.3 | v4.0 GA 2025-01-21; v4.3 on 2026-05-08 ([blog](https://tailwindcss.com/blog/tailwindcss-v4-3)) |
| @tailwindcss/turbopack | (alternative) 4.3.3 | first published 2026-07-31 | 4.3.3 | Used by create-next-app 16.4.2 when Turbopack and Tailwind are both chosen (§4) |
| postcss | 8.5.31 | — | 8.5.31 | next itself depends on postcss 8.5.23 |
| @tailwindcss/typography | 0.5.20 | 2026-06-08 (modified) | 0.5.20 | |
| motion | 14.4.0 | 2026-10-19 | 14.4.0 | 13.0.0 on 2026-08-05 (breaking); 14.0.0 on 2026-10-02. The GitHub changelog already lists 14.5.0 dated 2026-10-20, but it is not on npm yet |
| @markdoc/markdoc | 0.5.10 | 2026-09-16 | 0.5.10 | |
| @next/mdx | 16.4.2 | — | 16.4.2 | Only if MDX is used |
| @mdx-js/loader, @mdx-js/react | 3.1.1 | 2025-08-29 | 3.1.1 | |
| minisearch | 7.2.0 | 2025-09-16 | 7.2.0 | MIT, 0 dependencies |
| fuse.js | 7.5.0 | 2026-07-13 | 7.5.0 | Apache-2.0, 0 dependencies |
| pagefind | 1.5.2 | 2026-04-12 | 1.5.2 | Platform binaries include `@pagefind/windows-x64` |
| @citation-js/core, plugin-bibtex, plugin-csl | 0.9.0 | 2026-09-18 | 0.9.0 | engines node >=22.12.0 |
| @retorquere/bibtex-parser | 12.1.10 | 2026-10-19 | 12.1.10 | ISC |
| schema-dts | 2.1.0 | 2026-10-02 | 2.1.0 | Apache-2.0, types only |
| @playwright/test | 1.64.1 | 2026-10-14 | 1.64.1 | 1.64.0 on 2026-10-07; engines node >=20 |
| @axe-core/playwright, axe-core | 4.14.0 | 2026-10-15 | 4.14.0 | engines node >=22.12.0 |
| lighthouse | 13.5.0 | 2026-09-18 | 13.5.0 | engines node >=22.19 |
| @lhci/cli | 0.15.1 | 2025-06-25 | 0.15.1 | Pins lighthouse **12.6.1** internally |
| linkinator | 8.1.0 | 2026-08-29 | 8.1.0 | engines node >=22 |
| lychee (binary) | v0.24.2 | 2026-05-01 | — | DOCUMENTED: [GitHub releases](https://github.com/lycheeverse/lychee/releases) (Windows x86_64 zip available). lychee-action v2.9.0 on 2026-07-09 |
| vitest | 5.0.5 | 2026-10-15 | 5.0.5 (V4 line 4.1.12) | 5.0.0 on 2026-09-03. Requires **vite** as a non-optional peer: `^6.4 \|\| ^7 \|\| ^8` |
| vite | 8.3.4 | — | 8.3.4 | |
| @vitejs/plugin-react | 6.1.2 (optional) | — | 6.1.2 | Peer: vite ^8 |
| jsdom | 30.1.3 (optional) | — | 30.1.3 | engines node `^24.15.0` on the 24 line |
| @testing-library/react / dom | 16.3.3 / 10.4.2 (optional) | — | | |
| eslint | 10.13.0 | 2026-10-16 | 10.13.0 | 10.0.0 on 2026-02-06; maintenance tag 9.39.5 |
| eslint-config-next | 16.4.2 | 2026-10-15 | 16.4.2 | |
| eslint-config-prettier | 10.1.8 | 2025-07-20 | 10.1.8 | |
| typescript-eslint (transitive) | 8.72.0 | 2026-10-19 | 8.72.0 | Peer typescript `>=4.8.4 <6.1.0` |
| prettier | 3.9.10 | 2026-10-10 | 3.9.10 | |
| prettier-plugin-tailwindcss | 0.8.1 | 2026-07-15 | 0.8.1 | |
| @keystatic/core | 0.6.9 | 2026-08-26 | 0.6.9 | 0.6.0 on 2026-07-20 (minor with pinned react-aria 3.50.0, react-stately 3.48.0, @keystar/ui) |
| @keystatic/next | 5.0.5 | 2026-08-18 | 5.0.5 | Peer next >=14, react ^18.2 \|\| ^19 |
| sanity | 6.20.0 | 2026-10-19 | 6.20.0 | 6.0.0 on 2026-06-11. Peer react ^19.2.2, styled-components ^6.1.15; engines node >=22.12 |
| next-sanity | 13.3.4 | 2026-09-01 | 13.3.4 | Peer next ^16.0.0-0, react ^19.2.3, sanity ^5.29 \|\| ^6 |
| @sanity/image-url | 2.1.1 | 2026-03-30 | 2.1.1 | |
| styled-components | 6.6.0 | — | 6.6.0 | Sanity peer |

---

## 2. Runtime baseline: Node 24.19 and npm 11

- **DOCUMENTED** ([nodejs.org/dist/index.json](https://nodejs.org/dist/index.json); [Release schedule](https://raw.githubusercontent.com/nodejs/Release/main/schedule.json)):
  - Node 24.19.0 was released 2026-08-03.
  - The newest 24.x is 24.22.0 (2026-10-14).
  - The last Node 24 security release was 24.18.1 (2026-07-28), so 24.19.0 is not missing a security patch.
  - Node 24 enters Maintenance LTS on 2026-10-20 (today) and reaches end of life on 2028-04-30.
  - Node 26 becomes Active LTS on 2026-10-28.
- **HYPOTHESIS**: Stay on Node 24.x for this project. Optionally move to 24.22.0, and pin it with `"engines": {"node": ">=24.15 <25"}`. Every recommended tool's `engines` field accepts 24.19:
  - jsdom needs ^24.15.0.
  - lighthouse needs >=22.19.
  - vitest needs ^24.
  - ESLint 10 needs >=24.
  - citation-js and Sanity need >=22.12.
- **DOCUMENTED** ([Next 16.4 blog](https://nextjs.org/blog/next-16-4)): the experimental Turbopack `workerThreads` strategy falls back to child processes on Node ≥24.13.1 because of Node bug nodejs/node#65100. It is opt-in only, so it does not affect the default setup.
- npm printed a notice that npm 12.2.0 is available. **HYPOTHESIS**: do not change major npm versions mid-project. Everything here was resolved with npm 11.17.0.

---

## 3. Next.js 16.4 (App Router)

### 3.1 Release facts

- **DOCUMENTED** ([Next 16 blog](https://nextjs.org/blog/next-16), 2025-10-21):
  - Minimums: Node 20.9+ and TypeScript 5.1+.
  - Browsers: Chrome/Edge/Firefox 111+ and Safari 16.4+.
  - Turbopack is stable and the default bundler for both `next dev` and `next build`. Opt out with `--webpack`.
  - `next lint` is removed; use the ESLint CLI.
  - `middleware.ts` is renamed to `proxy.ts`.
  - Request APIs are async: `await params`, `await searchParams`.
  - `next/image` defaults changed: `qualities` is now `[75]`, `minimumCacheTTL` is 4 h, and `priority` is deprecated in favour of `preload`.
  - Local image `src` with a query string now needs `images.localPatterns`.
- **DOCUMENTED** ([16.1 blog](https://nextjs.org/blog/next-16-1), 2025-12-18): Turbopack's file-system cache for `next dev` is stable and **on by default**. It writes compiler artifacts to disk, which matters for OneDrive (see §14).
- **DOCUMENTED** ([16.4 blog](https://nextjs.org/blog/next-16-4), 2026-10-06):
  - React 19.3, which brings stable View Transitions and Fragment Refs.
  - Lazy server HMR, a 20–25% smaller Turbopack disk cache, a shared runtime chunk, and shorter CSS-module class names.
  - `ensureStatic` route config, which requires Cache Components.
  - **Cache Components is recommended for every app, and create-next-app now enables it by default.**
  - `next upgrade --agent` and an `experimental.agentFeedback` option. Agent feedback requires telemetry.
- **DOCUMENTED** ([security update 2026-10-14](https://nextjs.org/blog/nextjs-security-update-october-14-2026)): 16.4.1 and 15.5.28 fix three issues:
  - Critical RCE in `use cache` functions returning typed arrays.
  - Critical RCE in the Image Optimization API with SVG on glibc Linux. The workaround is sharp ≥0.35.5.
  - High-severity DoS through Server Actions.

  **DOCUMENTED** ([GHSA-xqc2-xf4c-x3h3](https://github.com/react/react/security/advisories/GHSA-xqc2-xf4c-x3h3), 2026-10-14): the upstream React RSC packages are patched in 19.3.1, 19.2.9, 19.1.10 and 19.0.9. next 16.4.2 resolves `sharp ^0.35.5` (DOCUMENTED, registry optionalDependencies).
- **DOCUMENTED** (source: [create-next-app templates/index.ts @ v16.4.2](https://raw.githubusercontent.com/vercel/next.js/v16.4.2/packages/create-next-app/templates/index.ts)): the 16.4.2 scaffold uses these dependency ranges and defaults:
  - It pins `react`/`react-dom` to **19.3.0**. Bump to 19.3.1 after scaffolding.
  - devDependencies are `typescript: "^5"`, `@types/node: "^20"` and `eslint: "^9"`.
  - With Turbopack and Tailwind it uses `@tailwindcss/turbopack` through `turbopack.rules` in `next.config` instead of `postcss.config.mjs`.
  - Flag handling ([index.ts @ v16.4.2](https://raw.githubusercontent.com/vercel/next.js/v16.4.2/packages/create-next-app/index.ts)): `--no-cache-components` disables Cache Components, `--no-agent-feedback` disables feedback, and passing any `--flag` skips all prompts and fills the rest with recommended defaults.
- **DOCUMENTED** ([telemetry](https://nextjs.org/telemetry)): opt out with `npx next telemetry disable` or `NEXT_TELEMETRY_DISABLED=1`.

### 3.2 Static export vs server output

| | `output: 'export'` (pure static `out/`) | Default output on a Node-capable host |
|---|---|---|
| Public pages | Prerendered HTML. Server Components run at build time. DOCUMENTED ([static exports](https://nextjs.org/docs/app/guides/static-exports)) | Also prerendered when they use no request-time APIs. HYPOTHESIS: enforce this with a route-group layout rather than in the root layout, so the CMS route is unaffected |
| Dynamic routes (`/research/[pearl]`, `/publications/[slug]`) | Must use `generateStaticParams`. `dynamicParams: true` is unsupported. DOCUMENTED | Same pattern works and can also run on demand |
| Route Handlers | Only `GET`, marked `export const dynamic = 'force-static'`. Handlers that read `Request` are unsupported. DOCUMENTED | Full support |
| Unsupported features | Cookies, rewrites, redirects, headers, Proxy, ISR, default image loader, Draft Mode, Server Actions, intercepting routes. DOCUMENTED | All available |
| Keystatic admin | Does not work in the export build (§11.1) | Works (GitHub mode) |
| next/image | Needs `images.unoptimized: true` or a custom `loaderFile` (§3.3) | Built-in optimizer works. Patch level matters for the SVG advisory |
| Windows build risk | Open bug #85374: prefetch file names are wrong when built on Windows (§14) | Not affected. The bug's investigator says the files are only produced and requested under `output: 'export'` |

**Cache Components and static export.** Next's config validation does not reject `cacheComponents` together with `output: 'export'`. DOCUMENTED (source: [config.ts @ v16.4.2](https://raw.githubusercontent.com/vercel/next.js/v16.4.2/packages/next/src/server/config.ts)). However, the static-export guide links its `dynamic` option to the "caching-without-cache-components" docs. I found no official statement that the combination is supported (UNKNOWN). **HYPOTHESIS**: scaffold with `--no-cache-components` for this content site. Neither shape needs it. If later wanted on the server-output shape, `ensureStatic = 'navigation'` in a route-group layout is the documented way to guarantee static pages (DOCUMENTED, [16.4 blog](https://nextjs.org/blog/next-16-4)).

### 3.3 Images under static export

- **DOCUMENTED** ([static exports](https://nextjs.org/docs/app/guides/static-exports); [Image API](https://nextjs.org/docs/app/api-reference/components/image), lastUpdated 2026-09-28): the default loader is unsupported. Options are:
  - `images.unoptimized: true`, which serves the source file as-is.
  - `images.loader: 'custom'` with `loaderFile`, for example an image CDN.
  - The `preload` prop replaces `priority` (since v16.0.0).
- **DOCUMENTED** (registry): of the third-party post-build optimizers, `next-image-export-optimizer` 1.21.2 (modified 2026-10-18) declares a `next ^16` peer. `next-export-optimize-images` 4.7.0 declares only `next 14.x||15.x`, so it is incompatible.
- **HYPOTHESIS**: for a lab site, headshots and figures are few. Pre-generate WebP/AVIF at 2–3 widths with a small `sharp` script, use `unoptimized`, and set explicit `width`/`height` to avoid layout shift. On the server-output shape, use the built-in optimizer and drop that step.

### 3.4 next/font

- **DOCUMENTED** ([Font](https://nextjs.org/docs/app/api-reference/components/font), lastUpdated 2026-09-24):
  - Google and local fonts are downloaded at build time and self-hosted. The browser sends no requests to Google.
  - Variable fonts are recommended.
  - The `variable` option exposes a CSS variable, which you map in Tailwind v4 with `@theme inline { --font-sans: var(--font-x); }`.
- **HYPOTHESIS**: `next/font/google` needs network access to Google Fonts on the build machine. Use `next/font/local` with committed `.woff2` files to keep builds hermetic and CI-safe.

### 3.5 Metadata API, sitemap.ts, robots.ts, next/og

- **DOCUMENTED** ([generateMetadata](https://nextjs.org/docs/app/api-reference/functions/generate-metadata), lastUpdated 2026-08-19):
  - Use a static `metadata` export or `generateMetadata`; both are Server Components only.
  - `metadataBase` is required whenever a URL field is relative, otherwise the build fails.
  - `title.template` and `alternates.canonical` are supported.
  - `other` emits arbitrary `<meta name=…>` tags, and array values produce repeated tags. That is how to emit Google Scholar `citation_author` tags (§9).
- **DOCUMENTED** ([sitemap](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/sitemap), lastUpdated 2026-08-18): `app/sitemap.ts` returns `MetadataRoute.Sitemap`. It is a special Route Handler, cached by default. In v16, `generateSitemaps` passes `id` as a Promise.
- **HYPOTHESIS**, supported by the static-export Route Handler rule and a [Vercel community thread](https://community.vercel.com/t/deployment-blocked-by-export-const-dynamic-error-on-sitemap-xml-with-output-export/30314): under `output: 'export'`, add `export const dynamic = 'force-static'` to `sitemap.ts` and `robots.ts`.
- **DOCUMENTED** (open issue [#98126](https://github.com/vercel/next.js/issues/98126)): nested dynamic `sitemap.ts` under a `generateStaticParams` segment is mishandled in export. Keep one root sitemap.
- **DOCUMENTED** ([opengraph-image](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/opengraph-image), lastUpdated 2026-07-09): `ImageResponse` from `next/og` is generated at build time and cached unless it uses request-time APIs. `params` is a Promise in v16.
- **HYPOTHESIS**: OG images work under export when every dynamic segment has `generateStaticParams`. This needs a spike. Static `opengraph-image.png` files are the zero-risk fallback.

### 3.6 Turbopack status

- **DOCUMENTED**: Turbopack is the default bundler for dev and build since 16.0. Its dev file-system cache has been on by default since 16.1. The 16.4 experimental flags are opt-in: `turbopackGc`, `turbopackLazyDynamicImports`, `turbopackPluginRuntimeStrategy`, and the Rust React Compiler. Sources: [16 blog](https://nextjs.org/blog/next-16), [16.1 blog](https://nextjs.org/blog/next-16-1), [16.4 blog](https://nextjs.org/blog/next-16-4).
- **DOCUMENTED** ([MDX guide](https://nextjs.org/docs/app/guides/mdx), lastUpdated 2026-08-10): with Turbopack, remark/rehype plugins must be given as strings with serializable options.

---

## 4. Tailwind CSS v4 with Next

- **DOCUMENTED** ([Tailwind Next guide](https://tailwindcss.com/docs/installation/framework-guides/nextjs); [Next CSS docs](https://nextjs.org/docs/app/getting-started/css), lastUpdated 2026-08-25): install `tailwindcss @tailwindcss/postcss postcss`. Configure `postcss.config.mjs` with `"@tailwindcss/postcss": {}`, and put `@import "tailwindcss";` in `app/globals.css`. There is no `tailwind.config.js` in v4; configure through `@theme` in CSS.
- **DOCUMENTED** (create-next-app source above): the 16.4.2 scaffold instead wires `@tailwindcss/turbopack`, a Turbopack loader first published 2026-07-31, and omits `postcss.config.mjs`.
- **HYPOTHESIS**: prefer `@tailwindcss/postcss`. It is the setup documented by both projects and keeps working if a tool or fallback (`next build --webpack`) bypasses Turbopack rules. If the scaffold produces the Turbopack variant, swap it (§12, step 3).
- **DOCUMENTED** ([prettier-plugin-tailwindcss README](https://github.com/tailwindlabs/prettier-plugin-tailwindcss)): with v4 you must set `tailwindStylesheet` to the CSS entry point in the Prettier config.

---

## 5. Motion for React

- **DOCUMENTED** ([installation](https://motion.dev/docs/react-installation)):
  - Install with `npm install motion` and import from `"motion/react"`.
  - Requires React ≥18.2. Peer range on npm: `react ^18 || ^19`.
  - In the App Router, either mark the file `"use client"` or use `import * as motion from "motion/react-client"` to ship less JS.
- **DOCUMENTED** ([upgrade guide](https://motion.dev/docs/react-upgrade-guide)):
  - v14 has no breaking changes.
  - v13 is breaking only for styled components: `@emotion/is-prop-valid` is no longer auto-detected, so pass it via `<MotionConfig isValidProp>`.
  - v12 has no React breaking changes.
  - Migrating from framer-motion means changing imports to `motion/react`.
- **DOCUMENTED** ([reduce bundle size](https://motion.dev/docs/react-reduce-bundle-size)):
  - `motion` is about 43 kB.
  - `m` (from `motion/react-m`) inside `<LazyMotion>` is about 5 kB initially. Add `domAnimation` (+24 kB) or `domMax` (+38 kB, which includes layout and drag).
  - The `strict` prop on `LazyMotion` throws if a full `motion` component is used.
- **DOCUMENTED** ([accessibility](https://motion.dev/docs/react-accessibility)): `<MotionConfig reducedMotion="user">` disables transform and layout animations when the OS asks for reduced motion. `useReducedMotion()` is available for custom fallbacks.
- **DOCUMENTED** ([CHANGELOG](https://github.com/motiondivision/motion/blob/main/CHANGELOG.md)): 13.4.0 (2026-09-14) added `AnimateView`, which builds on React 19.3's `ViewTransition`. The 14.x line adds hardware-accelerated transforms (14.2), stagger grid options (14.3), and many AnimatePresence and layout fixes (14.3.1). Releases are frequent: 14.0 through 14.4 shipped in 17 days.
- Core APIs for the "boba pearl" interactions (DOCUMENTED, [Motion for React](https://motion.dev/docs/react)): `motion.*` components, `animate`/`initial`/`transition`, `whileHover`/`whileTap`/`whileInView`, `layout` and `layoutId` (shared-element pearl→detail transitions), `AnimatePresence`/`exit`, `useScroll`, and SVG `pathLength`.
- **HYPOTHESIS**:
  - Pin `motion` to an exact version and update deliberately, given the release cadence.
  - Use `LazyMotion` + `m` with `domMax` loaded lazily, since layout animations need domMax.
  - Always wrap the app in `MotionConfig reducedMotion="user"`.

---

## 6. Rich text: MDX vs Markdoc

| | Markdoc | MDX |
|---|---|---|
| Packages | `@markdoc/markdoc` 0.5.10 (2026-09-16) | `@next/mdx` 16.4.2, `@mdx-js/loader`/`react` 3.1.1 (2025-08-29), `@types/mdx` 2.0.14 |
| Next integration | Use the core API directly in a Server Component (parse → validate → transform → React renderer). This is the pattern in the [Keystatic Next guide](https://keystatic.com/docs/installation-next-js). `@markdoc/next.js` 0.5.0 is documented only for the Pages Router ([markdoc.dev/docs/nextjs](https://markdoc.dev/docs/nextjs)), so do not use it | DOCUMENTED ([MDX guide](https://nextjs.org/docs/app/guides/mdx)): needs a root `mdx-components.tsx` and `pageExtensions`. Frontmatter is not built in. Turbopack plugins must be strings |
| CMS support | Keystatic `fields.markdoc`, stored as `.mdoc` (optionally `.md`), with custom components. DOCUMENTED ([Keystatic markdoc field](https://keystatic.com/docs/fields/markdoc)) | Keystatic also has `fields.mdx`. DOCUMENTED (same page links `/docs/fields/mdx`) |
| Safety for non-developer editors | HYPOTHESIS: better, because tags are declarative and there is no arbitrary JS in content | HYPOTHESIS: riskier. JSX in content can break builds |

**HYPOTHESIS:** use Markdoc for anything lab members edit, such as research-direction pages, news, and bios. Allow a small set of whitelisted custom tags, for example `{% figure %}` and `{% callout %}`. Reserve MDX, if used at all, for developer-written showcase pages. On Sanity, the native format is Portable Text instead (not evaluated here).

---

## 7. Client-side search and filter (50–200 publications)

| | MiniSearch 7.2.0 | Fuse.js 7.5.0 | Pagefind 1.5.2 |
|---|---|---|---|
| Model | In-memory inverted index. Supports prefix, fuzzy, field boosts, a filter callback, auto-suggest, add/remove. DOCUMENTED ([site](https://lucaong.github.io/minisearch/)) | Fuzzy (Bitap) scoring over an in-memory list. DOCUMENTED (registry: 0 dependencies, Apache-2.0) | Post-build indexer that crawls built HTML (`npx pagefind --site <dir>`). Component UI is new in 1.5.0. Filters via `data-pagefind-filter`. The JS API supports `search(null, {filters})` and `filters()` with counts. DOCUMENTED ([docs](https://pagefind.app/docs/), [JS filtering](https://pagefind.app/docs/js-api-filtering/)) |
| Size (my measurement from npm tarballs) | ES build unminified: 78.0 KB raw / 18.2 KB gzip. Minified size UNKNOWN; it will be smaller | `fuse.min.mjs` 26.1 KB raw / 9.1 KB gzip; `fuse.basic.min.mjs` 7.3 KB gzip. Bundlephobia reports 9.4 KB gzip (CORROBORATED) | Loads index chunks on demand. Size not measured |
| Fit | **Best.** Build a small JSON (title, authors, venue, year, abstract snippet, pearl tags) at build time and index it client-side | Fine at this scale, but lacks field-aware ranking | Needs an HTML output folder. Natural with `out/`, awkward with server output (HYPOTHESIS). Use it later for full-site search |

**HYPOTHESIS:** handle faceting (year, research pearl, type, author) with plain `Array.filter` plus URL query state. Use MiniSearch only for the free-text box.

---

## 8. BibTeX generation/parsing and copy-to-clipboard

- **DOCUMENTED** ([citation.js.org](https://citation.js.org/); registry): Citation.js 0.9.0 is modular. `@citation-js/core` plus `plugin-bibtex` handle BibTeX in and out, `plugin-csl` produces formatted citations such as APA, and `plugin-doi` does DOI lookup. It runs in Node and the browser. MIT; Node ≥22.12.
- **DOCUMENTED** ([README](https://github.com/retorquere/bibtex-parser)): `@retorquere/bibtex-parser` is the parser behind Better BibTeX for Zotero. It converts LaTeX commands to Unicode and has TypeScript and WASM entry points (ISC).
- **HYPOTHESIS**: proposed design:
  - The CMS stores structured fields per publication, which is the source of truth.
  - At build time, a pure TS function produces each entry's BibTeX string and a formatted citation, using citation-js. Both are unit-tested with Vitest.
  - The string is embedded in the page. No BibTeX library ships to the browser.
  - Use `@retorquere/bibtex-parser` only in a one-off import script, if the existing `.bib` from Prof. Park's CV or site needs bulk ingestion.
- **DOCUMENTED** ([MDN writeText](https://developer.mozilla.org/en-US/docs/Web/API/Clipboard/writeText)): `navigator.clipboard.writeText()` is Baseline widely available (since 2020) and needs a secure context (HTTPS or localhost). It throws `NotAllowedError` otherwise.
- **HYPOTHESIS**: also render the BibTeX in a selectable `<pre>` as a fallback, and announce "Copied" through an `aria-live` region.
- **DOCUMENTED** ([Playwright 1.62 notes](https://playwright.dev/docs/release-notes); [grantPermissions](https://playwright.dev/docs/api/class-browsercontext#browser-context-grant-permissions)): the headless clipboard has been isolated from the OS since 1.62. `clipboard-read`/`clipboard-write` can be granted, but support differs by browser. **HYPOTHESIS**: test copy in Chromium only.

---

## 9. JSON-LD and scholarly metadata

- **DOCUMENTED** ([Next JSON-LD guide](https://nextjs.org/docs/app/guides/json-ld), lastUpdated 2026-03-02):
  - Render a native `<script type="application/ld+json">` in the page or layout, not `next/script`.
  - Escape `<` as `\u003c` in `JSON.stringify` output.
  - Type the data with `schema-dts` (`WithContext<…>`).
- **DOCUMENTED** (schema.org V30.1, 2026-09-16):
  - [ScholarlyArticle](https://schema.org/ScholarlyArticle) is Thing › CreativeWork › Article › ScholarlyArticle. Use `author`, `datePublished`, `isPartOf`, `sameAs` (DOI URL), `identifier`, `about`.
  - [ResearchProject](https://schema.org/ResearchProject) is Thing › Organization › Project › ResearchProject. Use `funder`, `member`, `parentOrganization`, `funding`. It fits each pearl / research direction.
  - [ResearchOrganization](https://schema.org/ResearchOrganization) is in the "new" area, pending feedback. It fits the lab, with `parentOrganization` pointing to UC Berkeley Haas.
  - Person is a core type.
- **DOCUMENTED** ([Google search gallery](https://developers.google.com/search/docs/appearance/structured-data/search-gallery), updated 2026-10-16): Google rich results cover Article, Organization, Profile page, Dataset, and others. There is **no** ScholarlyArticle or Person rich result. **HYPOTHESIS**: JSON-LD here serves semantic correctness, knowledge-graph and AI consumers, and a ProfilePage for the PI page, not rich snippets.
- **DOCUMENTED** ([Google Scholar inclusion](https://scholar.google.com/intl/en/scholar/inclusion.html)):
  - Scholar reads Highwire `citation_*` meta tags. Required: `citation_title`, `citation_author` (one per author), and `citation_publication_date`.
  - `citation_pdf_url` must point to a PDF in the same subdirectory as the abstract page.
  - Abstracts must be visible without login, and each paper needs its own URL.
  - The page does not mention JSON-LD.
  - **HYPOTHESIS**: emit these through Metadata `other` on each `/publications/[slug]` page. This only matters if the lab hosts PDFs or abstract pages.

---

## 10. Quality tooling

### 10.1 TypeScript (strict)

- **DOCUMENTED** ([TS 7.0 announcement](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/), 2026-07-08): TS 7 is the native Go port. It ships **no JS compiler API**; a new API is expected in 7.1. For tools that need the API, Microsoft suggests aliasing `typescript` to `npm:@typescript/typescript6@^6.0.2`.
- **DOCUMENTED** (registry): typescript-eslint 8.72.0, which eslint-config-next depends on, has the peer `typescript >=4.8.4 <6.1.0`.
- **HYPOTHESIS** (tested: lockfile resolution only): with typescript 7.0.2, npm 11 overrides that peer with warnings, and typed lint rules would then load a TypeScript with no API.
- **DOCUMENTED** ([Next TS docs](https://nextjs.org/docs/app/api-reference/config/typescript), lastUpdated 2026-08-25): Next supports TS 7 for `next build` type-checking via the project-local `tsc` CLI, which is now the default (`experimental.useTypeScriptCli`).
- **Pick TypeScript 6.0.3.** DOCUMENTED ([TS 6.0 announcement](https://devblogs.microsoft.com/typescript/announcing-typescript-6-0/), 2026-03-23): 6.0 changes several defaults:
  - `strict` defaults to true.
  - `types` defaults to `[]`.
  - `noUncheckedSideEffectImports` defaults to true.
  - `target es5`, `moduleResolution node10` and `baseUrl` are deprecated.
- **DOCUMENTED** (source: [next/types/global.d.ts @ v16.4.2](https://raw.githubusercontent.com/vercel/next.js/v16.4.2/packages/next/types/global.d.ts)): Next's global types contain `/// <reference types="node" />` and `declare module '*.css' {}`. **HYPOTHESIS**: so the `types: []` and side-effect-import defaults should not break a scaffolded app. Next issue [#88197](https://github.com/vercel/next.js/issues/88197) about `noUncheckedSideEffectImports` is closed.
- **DOCUMENTED** (template [tsconfig.json @ v16.4.2](https://raw.githubusercontent.com/vercel/next.js/v16.4.2/packages/create-next-app/templates/app-tw/ts/tsconfig.json)): the template sets `"strict": true` and `"moduleResolution": "bundler"`, with no `baseUrl`. **HYPOTHESIS**: also add `noUncheckedIndexedAccess`, `noImplicitOverride` and `noFallthroughCasesInSwitch`, and run `tsc --noEmit` in CI.

### 10.2 ESLint (flat config) and Prettier

- **DOCUMENTED** ([ESLint version support](https://eslint.org/version-support/)): ESLint v10 is current (first release 2026-02-06). **v9 reached end of life on 2026-08-06.**
- **DOCUMENTED** ([Next ESLint docs](https://nextjs.org/docs/app/api-reference/config/eslint), lastUpdated 2026-10-15):
  - eslint-config-next supports ESLint 9 and 10. ESLint 10 support, including React version detection, arrived in 16.4.0.
  - "Some of the plugins … don't list ESLint 10 in their peer dependencies yet", so expect warnings, or failures if strict peer deps is on.
  - The flat config is `eslint.config.mjs` using `defineConfig`, `globalIgnores`, and the `eslint-config-next/core-web-vitals` and `eslint-config-next/typescript` entries.
  - Add Prettier through `eslint-config-prettier/flat`.
- **HYPOTHESIS** (tested: lockfile resolution only): eslint 10.13.0 + eslint-config-next 16.4.2 resolves under npm 11.17 with exactly three `ERESOLVE overriding peer dependency` warnings. They come from eslint-plugin-import 2.32.0 (peer `^9`), eslint-plugin-jsx-a11y 6.10.2 (`^9`) and eslint-plugin-react 7.37.5 (`^9.7`). Do **not** set `strict-peer-deps=true`. Runtime lint behaviour still needs a smoke test.
- **DOCUMENTED** ([Prettier options](https://prettier.io/docs/options#end-of-line)): `endOfLine` defaults to `"lf"`. Add `* text=auto eol=lf` to `.gitattributes` so Windows checkouts don't flip line endings.

### 10.3 Playwright + axe

- **DOCUMENTED** ([intro](https://playwright.dev/docs/intro)): requires Node 22, 24 or 26 and Windows 11+ (or Windows Server 2019+, or WSL). Install with `npm init playwright@latest`.
- **DOCUMENTED** ([browsers](https://playwright.dev/docs/browsers)):
  - Install one browser with `npx playwright install <name>`.
  - Windows cache: `%USERPROFILE%\AppData\Local\ms-playwright`. `PLAYWRIGHT_BROWSERS_PATH` overrides it, and `=0` puts browsers in node_modules.
  - Behind a proxy, use `HTTPS_PROXY` and `NODE_EXTRA_CA_CERTS`.
  - Unused browser versions are garbage-collected automatically.
  - **HYPOTHESIS**: `--with-deps` installs OS packages and matters on Linux CI, not on Windows.
- **DOCUMENTED** ([release notes](https://playwright.dev/docs/release-notes)): 1.64 bundles Chromium 156, Firefox 157 and WebKit 27.2. Breaking changes in 1.64:
  - Device descriptors now set `screen`.
  - Elements inside hidden iframes count as hidden.
  - `--update-snapshots=missing` now passes.
- **DOCUMENTED** ([accessibility testing](https://playwright.dev/docs/accessibility-testing); [axe API.md v4.14.0](https://raw.githubusercontent.com/dequelabs/axe-core/v4.14.0/doc/API.md)):
  - Use `new AxeBuilder({ page }).withTags([...]).analyze()`.
  - Tags include `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa` and `wcag22aa`.
  - Prefer a shared fixture. Use `exclude`/`disableRules` sparingly.
  - "Automated testing cannot detect all types of WCAG violations." Plan manual checks too, especially for the animated pearl UI and keyboard focus.

### 10.4 Lighthouse

- **DOCUMENTED** (registry):
  - lighthouse 13.5.0 (2026-09-18) needs Node ≥22.19.
  - @lhci/cli 0.15.1 (2025-06-25) is the latest LHCI release, and its `lighthouse` dependency is pinned at **12.6.1**.
  - The LHCI GitHub repo still had commits on 2026-10-19 ([repo](https://github.com/GoogleChrome/lighthouse-ci)).
- **HYPOTHESIS**: run `npx lighthouse <url> --output html --output-path …` against a production build for ad-hoc audits. Add LHCI only if you need assertion budgets in CI, and accept its older Lighthouse engine.

### 10.5 Link checking

- **DOCUMENTED** ([linkinator README](https://github.com/JustinBeckwith/linkinator)): scans remote URLs or local directories with `--recurse`. Options include `--markdown`, `--skip` regex, retry options, `--server-root`, `--clean-urls`, and a `linkinator.config.json` file.
- **DOCUMENTED** ([lychee releases](https://github.com/lycheeverse/lychee/releases)): lychee is a Rust binary, with a Windows zip for v0.24.2 and lychee-action v2.9.0.
- **HYPOTHESIS**:
  - Run linkinator on every build for internal links, either `npx linkinator ./out --recurse` or against `next start`.
  - Run lychee weekly in GitHub Actions for external DOI and venue links, which change slowly and rate-limit.

### 10.6 Vitest

- **DOCUMENTED** ([Vitest 5 announcement](https://vitest.dev/blog/vitest-5), 2026-09-03):
  - Requires Vite ≥6.4 and Node ≥22.12.
  - Behaviour changes: `clearMocks` now defaults to true, unawaited `resolves`/`rejects` fail, and locators are strict.
- **DOCUMENTED** (registry): `vite` is a **required** peer of vitest 5.0.5, so install it explicitly.
- **DOCUMENTED** ([Next Vitest guide](https://nextjs.org/docs/app/guides/testing/vitest), lastUpdated 2026-08-25): async Server Components are not supported, so test them end-to-end. The guide's setup is `@vitejs/plugin-react`, `vite-tsconfig-paths` and `jsdom`.
- **DOCUMENTED** (source): Next's own `with-vitest` example still pins vitest ^3.2.4 and plugin-react ^5. The vitest 5 + plugin-react 6 + vite 8 combination is therefore not exercised by Next's examples.
- **HYPOTHESIS**: start with `environment: 'node'` tests of pure modules (BibTeX, citation formatting, search-index builder, JSON-LD builders, slug and date utilities). Add jsdom and Testing Library only if component tests prove necessary.

---

## 11. CMS compatibility with next 16.4.2 / react 19.3.1

**HYPOTHESIS** (tested: lockfile resolution only): both stacks resolved with no peer conflicts other than the three ESLint-10 warnings.

- **Keystatic stack:** about 894 packages, including the test tooling. Resolved react-aria 3.50.0, react-stately 3.48.0 and @keystar/ui 0.10.0.
- **Sanity stack:** about 1,295 packages, without test tooling.

### 11.1 Keystatic (@keystatic/core 0.6.9, @keystatic/next 5.0.5)

- **Peer dependencies.** DOCUMENTED (registry):
  - core: `react ^18.2 || ^19`, `react-dom` same, plus exact peers `react-aria 3.50.0`, `react-stately 3.48.0` and `@keystar/ui ~0.10.0`.
  - next: `next >=14`.
  - DOCUMENTED ([core CHANGELOG](https://github.com/Thinkmill/keystatic/blob/main/packages/keystatic/CHANGELOG.md)): 0.6.0 pinned these libraries exactly and warns that patch releases may bump them. **Pin `@keystatic/core` exactly** and do not add your own react-aria.
- **Tested against Next 15.1.** DOCUMENTED ([packages/next/package.json](https://github.com/Thinkmill/keystatic/blob/main/packages/next/package.json)): `@keystatic/next` devDependency is `next ~15.1.10`. **HYPOTHESIS**: Next 16 is permitted by the peer range but not what upstream builds against.
- **Setup and hosting.** DOCUMENTED ([Next install guide](https://keystatic.com/docs/installation-next-js)):
  - Files: `keystatic.config.ts`, `app/keystatic/keystatic.ts` (`makePage`), `app/keystatic/layout.tsx`, `app/keystatic/[[...params]]/page.tsx`, and `app/api/keystatic/[...params]/route.ts` (`makeRouteHandler`, GET + POST).
  - Content is read with `createReader(process.cwd(), config)` on the server.
  - **The host must support Node.js for the API routes.**
- **GitHub mode.** DOCUMENTED ([GitHub mode](https://keystatic.com/docs/github-mode)):
  - Setup creates a GitHub App.
  - Env vars: `KEYSTATIC_GITHUB_CLIENT_ID`, `KEYSTATIC_GITHUB_CLIENT_SECRET`, `KEYSTATIC_SECRET`, `NEXT_PUBLIC_KEYSTATIC_GITHUB_APP_SLUG`.
  - **Only GitHub users with write access to the repo can use the admin.**
- **Open issues:**
  - [#1549](https://github.com/Thinkmill/keystatic/issues/1549) (open; opened 2026-06-18, last comment 2026-07-29). The GitHub-mode admin renders blank under `next dev` on Next 16. The cause, per a community comment: Keystatic redirects `localhost` to `127.0.0.1`, which Next 16's dev-origin protection blocks. **Workaround: `allowedDevOrigins: ['127.0.0.1']`.** That option is DOCUMENTED ([allowedDevOrigins](https://nextjs.org/docs/app/api-reference/config/next-config-js/allowedDevOrigins)). The commenter reports production works. The fix itself is a HYPOTHESIS until verified.
  - [#1593](https://github.com/Thinkmill/keystatic/issues/1593) (open since 2026-08-11). In 0.6.5+, clicking a `fields.blocks` row no longer opens its edit dialog. **HYPOTHESIS**: avoid `fields.blocks` in the schema, or verify it in 0.6.9 before relying on it.
  - [#1644](https://github.com/Thinkmill/keystatic/issues/1644) (open, 2026-10-19). Array-item editing in 0.6.9 has no visible edit or close buttons. This is an editor-usability concern for non-technical lab members.
  - [#1393](https://github.com/Thinkmill/keystatic/issues/1393) (open, 2025-01; reported on Next 14). Turbopack error in GitHub mode. Current relevance is UNKNOWN; #1549 reports the same blank page on both bundlers and a different cause.
- **Static export compatibility:**
  - DOCUMENTED ([#1341](https://github.com/Thinkmill/keystatic/issues/1341)): `output: 'export'` fails with "Page "/keystatic/[[...params]]" is missing "generateStaticParams()"".
  - DOCUMENTED ([discussion #826](https://github.com/Thinkmill/keystatic/discussions/826), maintainer answer 2023-12-19): the admin's API routes read and write the filesystem or GitHub on the server. The suggested approaches are to deploy the admin separately on Node with a static public site, or to enable Keystatic only in development (local mode).
  - DOCUMENTED ([discussion #1361](https://github.com/Thinkmill/keystatic/discussions/1361), Astro example): one repo, an env-switched config, the admin hosted on Netlify in GitHub mode, and the public site static on GitHub Pages.
- **Recommended patterns:**
  1. **(Preferred, HYPOTHESIS)** No static export. Deploy the whole app to a Node-capable host and use GitHub storage mode. Editors sign in at `/keystatic`, saving commits to the repo, and the host rebuilds. Public routes stay prerendered. Put them in an `(site)` route group so any static guard does not touch `/keystatic` or `/api/keystatic`.
  2. **(Static-only hosting, HYPOTHESIS)** Use two build targets from one repo:
     - `STATIC_EXPORT=1 next build` produces the public `out/`, built on Linux CI (§14). It must exclude the Keystatic routes. Options: a pre-build step that moves `app/keystatic` and `app/api/keystatic` aside, or a `pageExtensions` switch with admin files named like `page.admin.tsx`. `pageExtensions` does apply to `app/`, per the MDX guide, but the admin-suffix trick is unverified, so spike it.
     - A second deployment of the same repo without `output: 'export'` serves `/keystatic` in GitHub mode for editors. Local mode (`npm run dev` → `http://127.0.0.1:3000/keystatic`) suits developers only.

### 11.2 Sanity (sanity 6.20.0, next-sanity 13.3.4)

- **Peer dependencies.** DOCUMENTED (registry):
  - sanity: `react ^19.2.2`, `styled-components ^6.1.15`, node ≥22.12.
  - next-sanity: `next ^16.0.0-0`, `react ^19.2.3`, `sanity ^5.29 || ^6`, `@sanity/client ^7.26.2 || ^8`.
  - Both explicitly target Next 16 and React 19.2+, so 19.3.1 satisfies them.
- **Embedded Studio.** DOCUMENTED ([embedding Studio](https://www.sanity.io/docs/nextjs/embedding-sanity-studio-in-nextjs)): mount it at `app/studio/[[...tool]]/page.tsx` with `<NextStudio>`, `dynamic = 'force-static'`, and `metadata`/`viewport` re-exported from `next-sanity/studio`. `sanity.config.ts` needs `'use client'`. Requirements: Next 16+ and Node 20.9+.
- **Hosted Studio.** DOCUMENTED ([deployment](https://www.sanity.io/docs/studio/deployment)): `npx sanity@latest deploy` hosts the Studio at `*.sanity.studio`. It can also be self-hosted as a SPA with an `index.html` fallback, and its origin must be added to CORS.
- **Open issues:**
  - next-sanity has 3 open issues, none about Next 16.4 or React 19.3 (DOCUMENTED, GitHub search 2026-10-20).
  - sanity [#15261](https://github.com/sanity-io/sanity/issues/15261) (open; opened 2026-10-11, updated 2026-10-19): text typed into a new Portable Text block can be lost if the editor navigates away within about 1 s. This is a regression since 6.14.0, reproduced through 6.17 and later lines.
- **Static export (HYPOTHESIS):** use the hosted Studio. The Next site fetches content at build time, so no API routes are needed and `output: 'export'` works. Publishing then needs a rebuild trigger, such as a webhook to CI. The specifics of that trigger are UNKNOWN and were not checked. Prefer the hosted Studio over embedding it inside a static export, where `/studio/*` deep links would need host rewrites.

---

## 12. Install command list (PowerShell, Windows 11, Node 24.19 / npm 11)

```powershell
# 0) Work OUTSIDE OneDrive, on a short path (see §14). Optional, Git-only setting:
mkdir C:\dev; cd C:\dev
git config --global core.longpaths true

# 1) Scaffold with the CLI version pinned; disable Cache Components and agent feedback
npx create-next-app@16.4.2 bobalab --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm --no-cache-components --no-agent-feedback
cd bobalab
npx next telemetry disable          # optional (privacy)

# 2) Exact-pin the runtime (bumps React to the patched 19.3.1)
npm install --save-exact next@16.4.2 react@19.3.1 react-dom@19.3.1 motion@14.4.0 minisearch@7.2.0 @citation-js/core@0.9.0 @citation-js/plugin-bibtex@0.9.0 @citation-js/plugin-csl@0.9.0

# 3) Exact-pin the toolchain (replaces the scaffold's typescript ^5 / eslint ^9 / @types/node ^20)
npm install -D --save-exact typescript@6.0.3 @types/node@24.19.2 @types/react@19.3.0 @types/react-dom@19.3.0 tailwindcss@4.3.3 @tailwindcss/postcss@4.3.3 postcss@8.5.31 @tailwindcss/typography@0.5.20 eslint@10.13.0 eslint-config-next@16.4.2 eslint-config-prettier@10.1.8 prettier@3.9.10 prettier-plugin-tailwindcss@0.8.1 schema-dts@2.1.0
#    If the scaffold used the Turbopack Tailwind loader: remove `turbopack.rules` from next.config.ts,
#    add postcss.config.mjs ({ plugins: { "@tailwindcss/postcss": {} } }), then:
npm uninstall @tailwindcss/turbopack

# 4) Tests and quality
npm install -D --save-exact @playwright/test@1.64.1 @axe-core/playwright@4.14.0 vitest@5.0.5 vite@8.3.4 linkinator@8.1.0 lighthouse@13.5.0
npx playwright install chromium     # add firefox/webkit later if wanted; stored in %USERPROFILE%\AppData\Local\ms-playwright
#    optional component-test layer:
npm install -D --save-exact @vitejs/plugin-react@6.1.2 vite-tsconfig-paths@6.1.1 jsdom@30.1.3 @testing-library/react@16.3.3 @testing-library/dom@10.4.2
#    optional CI performance budgets (bundles Lighthouse 12.6.1):
npm install -D --save-exact @lhci/cli@0.15.1

# 5a) CMS path K (Keystatic + Markdoc)
npm install --save-exact @keystatic/core@0.6.9 @keystatic/next@5.0.5 @markdoc/markdoc@0.5.10
# 5b) CMS path S (Sanity), instead of 5a
npm install --save-exact sanity@6.20.0 next-sanity@13.3.4 @sanity/image-url@2.1.1 styled-components@6.6.0

# Optional extras
npm install -D --save-exact pagefind@1.5.2 @retorquere/bibtex-parser@12.1.10
npm install --save-exact fuse.js@7.5.0     # only if fuzzy-only search is preferred over MiniSearch
```

Expected install output: three `npm warn ERESOLVE overriding peer dependency` lines caused by ESLint 10 (§10.2). Do not "fix" them with `--legacy-peer-deps` or `--force`.

Suggested `.npmrc` (HYPOTHESIS): `save-exact=true` and `engine-strict=true`. Do **not** set `strict-peer-deps=true`.

Lychee for CI: use `lycheeverse/lychee-action@v2.9.0` in GitHub Actions. On Windows, the v0.24.2 `x86_64-pc-windows-msvc.zip` release asset exists (DOCUMENTED, GitHub releases). Downloading and running it locally is the user's call.

---

## 13. Minimal configuration shapes (my own, illustrative)

```ts
// next.config.ts: one config, two targets (HYPOTHESIS; verify in spike)
import type { NextConfig } from 'next'
const isExport = process.env.STATIC_EXPORT === '1'
const config: NextConfig = {
  allowedDevOrigins: ['127.0.0.1'],            // Keystatic GitHub-mode dev workaround (#1549)
  ...(isExport && { output: 'export', trailingSlash: true, images: { unoptimized: true } }),
}
export default config
```

```ts
// app/sitemap.ts (same idea for robots.ts)
import type { MetadataRoute } from 'next'
export const dynamic = 'force-static'          // needed under output: 'export' (HYPOTHESIS, §3.5)
export default function sitemap(): MetadataRoute.Sitemap { return [/* built from CMS reader */] }
```

```jsonc
// .prettierrc
{ "plugins": ["prettier-plugin-tailwindcss"], "tailwindStylesheet": "./src/app/globals.css" }
```

```js
// eslint.config.mjs: the scaffold's config plus Prettier
import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'
import prettier from 'eslint-config-prettier/flat'
export default defineConfig([...nextVitals, ...nextTs, prettier,
  globalIgnores(['.next/**', 'out/**', 'build/**', 'next-env.d.ts', 'playwright-report/**'])])
```

```ts
// e2e/a11y.spec.ts
import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
for (const path of ['/', '/research', '/publications', '/people']) {
  test(`axe ${path}`, async ({ page }) => {
    await page.goto(path)
    const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()
    expect(r.violations).toEqual([])
  })
}
```

`.gitattributes`: `* text=auto eol=lf`

---

## 14. Windows pitfalls

1. **Do not put the repo in OneDrive.** The current workspace is under `C:\Users\jiami\OneDrive\Desktop\…`.
   - DOCUMENTED ([OneDrive limits](https://support.microsoft.com/en-us/office/restrictions-and-limitations-in-onedrive-and-sharepoint-64883a5d-228e-48f5-b3d2-eb39e07630fa)):
     - Sync performance degrades above about 300,000 items. The Keystatic stack alone resolves to about 900 packages, many thousands of files.
     - Symbolic links and junctions are not supported.
     - Some names are invalid, for example `.lock`, `CON` and `desktop.ini`.
   - DOCUMENTED ([16.1 blog](https://nextjs.org/blog/next-16-1)): Turbopack's on-by-default dev cache writes continuously into `.next/`.
   - **HYPOTHESIS:** sync churn and file locks during sync cause `EPERM`/`EBUSY` on renames, slow installs, and missed file-watch events. Use `C:\dev\bobalab` (short path) or a Dev Drive, and rely on Git/GitHub for backup. This matches the existing Lumi setup in memory, which keeps `.git` outside OneDrive.
2. **Path length.**
   - DOCUMENTED ([MAX_PATH](https://learn.microsoft.com/en-us/windows/win32/fileio/maximum-file-path-limitation)): the limit is 260 characters unless the `LongPathsEnabled` registry value is 1 **and** the application's manifest declares `longPathAware`.
   - DOCUMENTED ([Git for Windows](https://gitforwindows.org/git-cannot-create-a-file-or-directory-with-a-long-path)): `git config core.longpaths true` is opt-in, and Explorer, cmd and many tools keep the 260 limit.
   - **HYPOTHESIS:** a short root path is the cheapest mitigation. Changing the registry is a system setting for the user to decide; I did not touch it.
3. **Building the static export on Windows produces broken prefetch files.**
   - DOCUMENTED (open [vercel/next.js#85374](https://github.com/vercel/next.js/issues/85374), reproduced on 16.0–16.3.5; root-cause comment 2026-09-28): `path.relative` yields backslashes, and `convertSegmentPathToStaticExportFilename` replaces only `/`. The client then requests `__next.….txt` files that do not exist and gets 404s.
   - DOCUMENTED (source [segment-value-encoding.ts @ v16.4.2](https://raw.githubusercontent.com/vercel/next.js/v16.4.2/packages/next/src/shared/lib/segment-cache/segment-value-encoding.ts) and [export/index.ts @ v16.4.2](https://raw.githubusercontent.com/vercel/next.js/v16.4.2/packages/next/src/export/index.ts)): the code is unchanged in 16.4.2.
   - DOCUMENTED: the fix, [PR #99058](https://github.com/vercel/next.js/pull/99058), is still **open and unmerged**.
   - **Mitigation (HYPOTHESIS):** build the deployable `out/` on Linux, for example GitHub Actions `ubuntu-latest`, or in WSL2 with the project inside the Linux filesystem. Treat local Windows export builds as preview only. This pitfall does not affect server output.
4. **Antivirus and filesystem speed.** DOCUMENTED ([Next local-dev guide](https://nextjs.org/docs/app/guides/local-development), lastUpdated 2026-09-02):
   - Next suggests a Defender folder exclusion **or** a Dev Drive, which uses Defender performance mode.
   - In WSL 2, keep the project in the Linux filesystem, not `/mnt/c`.
   - Avoid `watchOptions.pollIntervalMs` except as a last resort.
   - Dev Drive needs Win 11 build 22621.2338+, 50 GB minimum and admin rights, and can host the npm cache via `npm_config_cache` (DOCUMENTED, [Dev Drive](https://learn.microsoft.com/en-us/windows/dev-drive/)).
   - These are security and system settings for the user to choose. I did not change any.
5. **File watching.** DOCUMENTED (same guide): host-to-VM file sharing (Docker Desktop, WSL `/mnt/c`) can delay or drop file events. **HYPOTHESIS:** OneDrive Files-On-Demand placeholders add similar risk. That is one more reason for step 1.
6. **Keystatic dev on `127.0.0.1`.** Add `allowedDevOrigins: ['127.0.0.1']` (§11.1). Otherwise the GitHub-mode admin can render blank in dev.
7. **Line endings.** Add `.gitattributes` `* text=auto eol=lf` and keep Prettier `endOfLine: lf` (DOCUMENTED, Prettier). This avoids whole-file CRLF diffs.
8. **Playwright browsers** live in `%USERPROFILE%\AppData\Local\ms-playwright` (DOCUMENTED). **HYPOTHESIS:** this is outside OneDrive's Desktop/Documents folder sync, so no action is needed.
9. **Dev memory growth on Node 24.** DOCUMENTED (open [#100367](https://github.com/vercel/next.js/issues/100367), 2026-10-18): compilations are retained across server reloads that go through `deleteCache`. The reporter says the App Router default server-HMR path is unaffected; Pages Router, middleware and `.env`/`tsconfig` edits are affected. **HYPOTHESIS:** restart `next dev` after long sessions of config or `.env` edits.

---

## 15. Verification status and what still needs a spike

Verified from primary sources: all versions and dates (npm registry), and the Next.js, Tailwind, Motion, Playwright, axe, Vitest, ESLint, TypeScript, Keystatic and Sanity documentation cited above, plus the Next.js 16.4.2 source code for the scaffold defaults and the Windows export bug.

Lockfile-only resolution (no install or run):

- ESLint 10 + eslint-config-next: 3 peer warnings.
- TS 7 + eslint-config-next: peer overrides, typescript-eslint gets TS 7.
- Full Keystatic stack: clean except the ESLint warnings.
- Full Sanity stack: clean except the ESLint warnings.

Not verified (run a one-day spike before committing):

1. `next build` with `output: 'export'` plus `sitemap.ts`, `robots.ts` and `opengraph-image.tsx` with `force-static` and `generateStaticParams`.
2. Keystatic 0.6.9 admin on next 16.4.2 / React 19.3.1 in local and GitHub modes, including the `allowedDevOrigins` workaround and `fields.markdoc` rendering in a Server Component.
3. ESLint 10.13.0 actually linting with eslint-config-next 16.4.2: no runtime "context.getFilename" errors from the jsx-a11y or import plugins.
4. TypeScript 6.0.3 `next build` on the scaffold with `strict`, `noUncheckedIndexedAccess` etc.
5. Excluding Keystatic routes from the export build (`pageExtensions` suffix trick vs a move-aside script).
6. Motion `layoutId` pearl→page transitions across App Router navigations, plus `reducedMotion="user"`.
7. Vitest 5 + vite 8, with the optional plugin-react 6 and jsdom 30.

---

## 16. Sources (primary)

- Next.js: [blog index](https://nextjs.org/blog), [16](https://nextjs.org/blog/next-16), [16.1](https://nextjs.org/blog/next-16-1), [16.4](https://nextjs.org/blog/next-16-4), [security 2026-10-14](https://nextjs.org/blog/nextjs-security-update-october-14-2026), [static exports](https://nextjs.org/docs/app/guides/static-exports), [cacheComponents](https://nextjs.org/docs/app/api-reference/config/next-config-js/cacheComponents), [Image](https://nextjs.org/docs/app/api-reference/components/image), [Font](https://nextjs.org/docs/app/api-reference/components/font), [generateMetadata](https://nextjs.org/docs/app/api-reference/functions/generate-metadata), [sitemap](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/sitemap), [opengraph-image](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/opengraph-image), [JSON-LD](https://nextjs.org/docs/app/guides/json-ld), [MDX](https://nextjs.org/docs/app/guides/mdx), [CSS](https://nextjs.org/docs/app/getting-started/css), [TypeScript](https://nextjs.org/docs/app/api-reference/config/typescript), [ESLint](https://nextjs.org/docs/app/api-reference/config/eslint), [Vitest](https://nextjs.org/docs/app/guides/testing/vitest), [local development](https://nextjs.org/docs/app/guides/local-development), [allowedDevOrigins](https://nextjs.org/docs/app/api-reference/config/next-config-js/allowedDevOrigins), [telemetry](https://nextjs.org/telemetry), source at tag v16.4.2 (create-next-app `index.ts` and `templates/`, `server/config.ts`, `export/index.ts`, `segment-value-encoding.ts`, `types/global.d.ts`), issues [#85374](https://github.com/vercel/next.js/issues/85374), [#98126](https://github.com/vercel/next.js/issues/98126), [#100367](https://github.com/vercel/next.js/issues/100367), PR [#99058](https://github.com/vercel/next.js/pull/99058)
- React: [blog](https://react.dev/blog), [CHANGELOG](https://github.com/react/react/blob/main/CHANGELOG.md), [GHSA-xqc2-xf4c-x3h3](https://github.com/react/react/security/advisories/GHSA-xqc2-xf4c-x3h3)
- TypeScript: [7.0](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/), [6.0](https://devblogs.microsoft.com/typescript/announcing-typescript-6-0/)
- Tailwind: [Next guide](https://tailwindcss.com/docs/installation/framework-guides/nextjs), [blog](https://tailwindcss.com/blog), [prettier plugin](https://github.com/tailwindlabs/prettier-plugin-tailwindcss)
- Motion: [React docs](https://motion.dev/docs/react), [installation](https://motion.dev/docs/react-installation), [upgrade guide](https://motion.dev/docs/react-upgrade-guide), [bundle size](https://motion.dev/docs/react-reduce-bundle-size), [accessibility](https://motion.dev/docs/react-accessibility), [CHANGELOG](https://github.com/motiondivision/motion/blob/main/CHANGELOG.md)
- Content: [Keystatic Next install](https://keystatic.com/docs/installation-next-js), [GitHub mode](https://keystatic.com/docs/github-mode), [markdoc field](https://keystatic.com/docs/fields/markdoc), [core CHANGELOG](https://github.com/Thinkmill/keystatic/blob/main/packages/keystatic/CHANGELOG.md), [next CHANGELOG](https://github.com/Thinkmill/keystatic/blob/main/packages/next/CHANGELOG.md), discussions [#826](https://github.com/Thinkmill/keystatic/discussions/826) and [#1361](https://github.com/Thinkmill/keystatic/discussions/1361), issues [#1341](https://github.com/Thinkmill/keystatic/issues/1341), [#1393](https://github.com/Thinkmill/keystatic/issues/1393), [#1549](https://github.com/Thinkmill/keystatic/issues/1549), [#1593](https://github.com/Thinkmill/keystatic/issues/1593), [#1644](https://github.com/Thinkmill/keystatic/issues/1644); Sanity [embedding](https://www.sanity.io/docs/nextjs/embedding-sanity-studio-in-nextjs), [deployment](https://www.sanity.io/docs/studio/deployment), [next-sanity v12→v13](https://github.com/sanity-io/next-sanity/blob/main/packages/next-sanity/MIGRATE-v12-to-v13.md), [sanity#15261](https://github.com/sanity-io/sanity/issues/15261); [markdoc.dev Next](https://markdoc.dev/docs/nextjs)
- Search and citations: [MiniSearch](https://lucaong.github.io/minisearch/), [Pagefind](https://pagefind.app/docs/), [Pagefind JS filtering](https://pagefind.app/docs/js-api-filtering/), [Citation.js](https://citation.js.org/), [bibtex-parser](https://github.com/retorquere/bibtex-parser), [MDN writeText](https://developer.mozilla.org/en-US/docs/Web/API/Clipboard/writeText)
- Structured data: [schema.org ScholarlyArticle](https://schema.org/ScholarlyArticle), [ResearchProject](https://schema.org/ResearchProject), [ResearchOrganization](https://schema.org/ResearchOrganization), [Google search gallery](https://developers.google.com/search/docs/appearance/structured-data/search-gallery), [Google Scholar inclusion](https://scholar.google.com/intl/en/scholar/inclusion.html)
- Testing: [Playwright intro](https://playwright.dev/docs/intro), [browsers](https://playwright.dev/docs/browsers), [release notes](https://playwright.dev/docs/release-notes), [a11y testing](https://playwright.dev/docs/accessibility-testing), [grantPermissions](https://playwright.dev/docs/api/class-browsercontext#browser-context-grant-permissions), [axe API v4.14.0](https://github.com/dequelabs/axe-core/blob/v4.14.0/doc/API.md), [Vitest blog](https://vitest.dev/blog/), [Vitest 5](https://vitest.dev/blog/vitest-5), [ESLint version support](https://eslint.org/version-support/), [Prettier options](https://prettier.io/docs/options#end-of-line), [linkinator](https://github.com/JustinBeckwith/linkinator), [lychee releases](https://github.com/lycheeverse/lychee/releases), [lighthouse-ci](https://github.com/GoogleChrome/lighthouse-ci)
- Windows and Node: [MAX_PATH](https://learn.microsoft.com/en-us/windows/win32/fileio/maximum-file-path-limitation), [Dev Drive](https://learn.microsoft.com/en-us/windows/dev-drive/), [OneDrive limits](https://support.microsoft.com/en-us/office/restrictions-and-limitations-in-onedrive-and-sharepoint-64883a5d-228e-48f5-b3d2-eb39e07630fa), [Git for Windows long paths](https://gitforwindows.org/git-cannot-create-a-file-or-directory-with-a-long-path), [Node dist index](https://nodejs.org/dist/index.json), [Node release schedule](https://github.com/nodejs/Release)
- Registry: `https://registry.npmjs.org/<package>` for every version and date in §1, queried 2026-10-20. Raw JSON is in `research/raw/r6/time_*.json`.

---

## Verification (adversarial)

An independent pass checked these claims on 2026-10-20, about 21:00 UTC. It started skeptical: a claim without a primary source counts as UNVERIFIABLE.

**Method.**
- npm registry: `npm view` plus full `time` JSON.
- GitHub REST API: issue, PR and commit state.
- Raw source at tag `v16.4.2`.
- Official docs and blogs, fetched as public pages.
- A repeat of the lockfile-only resolution (`npm install --package-lock-only --ignore-scripts`) in two new empty folders.
- I also read the files of the existing local scaffold. I did not change them.

Nothing was installed, built or executed.

**Raw evidence.**
- `research/raw/r6-verify/`: registry time JSON, issue JSON, create-next-app source, the Node schedule and dist index, and copies of Next's vendored RSC file under `next-vendored/`.
- `research/resolve-tests/r6-verify-keystatic/` and `research/resolve-tests/r6-verify-sanity/`: the repeated lockfile resolutions.

**Scope note.** R6 makes no claims about pricing, free tiers, terms of service or university policy; those topics belong to R4. The decision-relevant claims here are versions, dates, peer ranges, engines, security fixes, platform and browser support, and open-issue status.

### Claim table

| # | Claim in R6 (section) | Result | Evidence / correction |
|---|---|---|---|
| 1 | next 16.4.2 is `latest`, published 2026-10-15. 16.4.0 came out 2026-10-06 and 16.4.1 (security) on 2026-10-14. (§0, §1) | CONFIRMED | Registry: dist-tag `latest: 16.4.2`. Publish times: 16.4.0 2026-10-06T18:35Z, 16.4.1 2026-10-14T17:43Z, 16.4.2 2026-10-15T20:57Z. Note: 16.0.0 reached npm 2025-10-22T00:12Z UTC; the blog date of 2025-10-21 is US time. |
| 2 | The 2026-10-14 update (16.4.1 / 15.5.28) fixes three issues: a critical RCE in `use cache` functions returning typed arrays, a critical RCE in Image Optimization with SVG on glibc Linux (workaround: sharp ≥0.35.5), and a high-severity DoS through Server Actions. next 16.4.2 resolves sharp ^0.35.5. (§3.1) | CONFIRMED | https://nextjs.org/blog/nextjs-security-update-october-14-2026 ; registry `next@16.4.2` `optionalDependencies.sharp = ^0.35.5`; the re-run resolved sharp 0.35.5. Two details R6 leaves out: the `use cache` RCE only affects apps that use Cache Components, and the DoS has its own React advisory, GHSA-h3gv-c5rc-p453. |
| 3 | react / react-dom 19.3.1 is `latest` (2026-10-14). The advisory's patched lines are 19.3.1, 19.2.9, 19.1.10 and 19.0.9. (§1, §3.1) | CONFIRMED | Registry; https://github.com/react/react/security/advisories/GHSA-xqc2-xf4c-x3h3 (Critical, CVSS 9.5, published 2026-10-14). |
| 4 | "react / react-dom 19.3.1: Patches the critical RSC advisory GHSA-xqc2-xf4c-x3h3." (§0 table rationale) | **REFUTED** (as worded) | The advisory lists only `react-server-dom-webpack`, `react-server-dom-turbopack` and `react-server-dom-parcel`, not `react` or `react-dom` (same URL). The App Router runs the React canary that ships inside Next ([Next 16 blog](https://nextjs.org/blog/next-16): App Router "uses the latest React Canary release"). In next 16.4.2, `dist/compiled/react` reports `19.3.0-canary-278794d7-20261002`. The vendored `react-server-dom-turbopack-server.node.production.js` changed between next 16.4.0 (sha256 `993f27fb…`) and 16.4.1/16.4.2 (`5296309d…`); copies from unpkg are in `raw/r6-verify/next-vendored/`. So this App Router site gets the fix from **next ≥16.4.1**, whatever react/react-dom version the app pins. Bumping to 19.3.1 is still reasonable hygiene (HYPOTHESIS), but it is not what fixes the advisory. |
| 5 | The create-next-app 16.4.2 scaffold pins react/react-dom 19.3.0 and uses devDependencies `typescript ^5`, `@types/node ^20` and `eslint ^9`. With Turbopack and Tailwind it wires `@tailwindcss/turbopack` through `turbopack.rules` and omits `postcss.config.mjs`. (§3.1, §4) | CONFIRMED | [templates/index.ts @ v16.4.2](https://raw.githubusercontent.com/vercel/next.js/v16.4.2/packages/create-next-app/templates/index.ts): `nextjsReactPeerVersion = "19.3.0"`, lines 78, 126–129 and 312–358. CORROBORATED by the scaffold already on disk at `C:\Users\jiami\OneDrive\Desktop\Claude\bobalab-website`: its `package.json` and `next.config.ts` match exactly. |
| 6 | 16.4 recommends Cache Components for every app, and create-next-app enables it by default. `--no-cache-components` and `--no-agent-feedback` exist. Passing any `--` flag skips all prompts. (§3.1) | CONFIRMED, with an omission | https://nextjs.org/blog/next-16-4 ; create-next-app `index.ts` @ v16.4.2, lines 54, 115–119, 241–354 and 617–621. Omitted: the same blog says Cache Components "will become the default in Next.js 17". Scaffolding with `--no-cache-components` (R6 §3.2, HYPOTHESIS) therefore implies a migration at Next 17. |
| 7 | Next 16 requires Node 20.9+ and TypeScript 5.1+, and supports Chrome, Edge and Firefox 111+ and Safari 16.4+. Turbopack is the default for dev and build (opt out with `--webpack`), and `next lint` is removed. The Turbopack dev file-system cache has been stable and on by default since 16.1. (§3.1, §3.6, §14) | CONFIRMED | https://nextjs.org/blog/next-16 (Version Requirements, Removals and Behavior Changes tables); https://nextjs.org/blog/next-16-1 (2025-12-18). |
| 8 | Static-export rules: the list of unsupported features (cookies, rewrites, redirects, headers, Proxy, ISR, the default image loader, Draft Mode, Server Actions, intercepting routes, `dynamicParams: true`), and Route Handlers limited to `GET` with `force-static`. (§3.2, §3.3) | CONFIRMED | https://nextjs.org/docs/app/guides/static-exports (lastUpdated 2026-08-09). |
| 9 | typescript `latest` is 7.0.2 (2026-07-08); 6.0.3 was published 2026-04-16. TS 7 ships no JS API, and a new API is expected in 7.1. Microsoft points tools that need the API to `@typescript/typescript6` npm aliases. (§1, §10.1) | CONFIRMED | Registry; https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/ ; `@typescript/typescript6` `latest` = 6.0.2. |
| 10 | typescript-eslint 8.72.0 (2026-10-19) has the peer `typescript >=4.8.4 <6.1.0`, and eslint-config-next depends on it. (§0, §10.1) | CONFIRMED | Registry: the peers of `typescript-eslint@8.72.0` and `@typescript-eslint/parser@8.72.0`. `eslint-config-next@16.4.2` depends on `typescript-eslint ^8.56.0`, which the re-run resolved to 8.72.0. This is the constraint that decides the TypeScript version. |
| 11 | Next type-checks with the project-local `tsc` CLI by default (`experimental.useTypeScriptCli`), so TS 7 works for `next build`. TS 6.0 defaults: `strict` true, `types` [], `noUncheckedSideEffectImports` true. `target es5`, `moduleResolution node10` and `baseUrl` are deprecated. (§10.1) | CONFIRMED | https://nextjs.org/docs/app/api-reference/config/typescript (lastUpdated 2026-08-25); https://devblogs.microsoft.com/typescript/announcing-typescript-6-0/ (2026-03-23). |
| 12 | ESLint v9 reached end of life on 2026-08-06, and v10 has been current since 2026-02-06. eslint `latest` is 10.13.0 (2026-10-16). eslint-config-next supports ESLint 9 and 10, with ESLint 10 support since 16.4.0, and some bundled plugins don't list ESLint 10 as a peer yet. Resolution prints exactly three `ERESOLVE overriding peer dependency` warnings, from eslint-plugin-import 2.32.0, eslint-plugin-jsx-a11y 6.10.2 and eslint-plugin-react 7.37.5. (§0, §10.2, §12) | CONFIRMED | https://eslint.org/version-support/ ; https://nextjs.org/docs/app/api-reference/config/eslint (lastUpdated 2026-10-15). Registry peers: `…\|\| ^9` for import and jsx-a11y, `…\|\| ^9.7` for react. My lockfile-only re-run printed exactly three warnings for both stacks. Nit: ESLint 10 engines are `^20.19.0 \|\| ^22.13.0 \|\| >=24`; R6 §2 shortens this to ">=24". Runtime lint behaviour is still unverified, as R6 itself says. |
| 13 | tailwindcss and @tailwindcss/postcss 4.3.3 are `latest` (2026-07-16). v4.0 came out 2025-01-21 and v4.3 on 2026-05-08. `@tailwindcss/turbopack` was first published 2026-07-31. The official Tailwind guide for Next uses `@tailwindcss/postcss` with `postcss.config.mjs`. prettier-plugin-tailwindcss needs `tailwindStylesheet` with v4. (§1, §4) | CONFIRMED | Registry; https://tailwindcss.com/docs/installation/framework-guides/nextjs (it does not mention the Turbopack loader); https://github.com/tailwindlabs/prettier-plugin-tailwindcss |
| 14 | motion 14.4.0 is `latest` (2026-10-19). 14.0.0 came out 2026-10-02 and 13.0.0 on 2026-08-05, and 14.5.0 is not on npm. The peer is `react ^18 \|\| ^19`, and the docs require React ≥18.2. v14 has no breaking changes, and v13 breaks only through `@emotion/is-prop-valid`. Sizes: `motion` 43 kB, `m` ~5 kB, `domAnimation` +24 kB, `domMax` +38 kB. (§1, §5) | CONFIRMED | Registry; https://motion.dev/docs/react-installation ; https://motion.dev/docs/react-upgrade-guide ; https://motion.dev/docs/react-reduce-bundle-size . Nit: R6 dates 13.4.0 to 2026-09-14 from the CHANGELOG, but it was published to npm on 2026-09-16. |
| 15 | vitest 5.0.5 (2026-10-15) has a non-optional `vite` peer: `^6.4 \|\| ^7 \|\| ^8`. Vitest 5 needs Vite ≥6.4 and Node ≥22.12. Next's `with-vitest` example still uses vitest ^3.2.4 and plugin-react ^5. (§1, §10.6) | CONFIRMED | Registry: `peerDependenciesMeta.vite.optional = false`; engines `^22.12.0 \|\| ^24.0.0 \|\| >=26.0.0`. https://vitest.dev/blog/vitest-5 ; [with-vitest package.json (canary)](https://raw.githubusercontent.com/vercel/next.js/canary/examples/with-vitest/package.json). |
| 16 | lighthouse 13.5.0 (2026-09-18) needs Node ≥22.19. @lhci/cli 0.15.1 (2025-06-25) is still the newest release and pins lighthouse 12.6.1. The LHCI repo had commits on 2026-10-19. (§10.4) | CONFIRMED | Registry; GitHub API commits on GoogleChrome/lighthouse-ci (latest 2026-10-19T21:37Z). |
| 17 | @playwright/test 1.64.1 was published 2026-10-14. The docs require Node 22, 24 or 26 and Windows 11+, Windows Server 2019+ or WSL. 1.64 bundles Chromium 156, Firefox 157 and WebKit 27.2. R6 lists three 1.64 breaking changes. (§10.3) | CONFIRMED, incomplete | https://playwright.dev/docs/intro ; https://playwright.dev/docs/release-notes . The notes list a **fourth** 1.64 breaking change: JSX in test files now follows `tsconfig.json`. |
| 18 | "@axe-core/playwright, axe-core 4.14.0: engines node >=22.12.0" (§1) | **REFUTED** (minor) | Only `@axe-core/playwright@4.14.0` declares `node >=22.12.0`; `axe-core@4.14.0` declares `node >=4` (registry). This does not change the pick. |
| 19 | @keystatic/core 0.6.9 (2026-08-26) has peers `react ^18.2 \|\| ^19` plus exact `react-aria 3.50.0`, `react-stately 3.48.0` and `@keystar/ui ~0.10.0`. The 0.6.0 CHANGELOG advises an exact pin. @keystatic/next 5.0.5 has the peer `next >=14` and the devDependency `next ~15.1.10`. (§11.1) | CONFIRMED | Registry; [core CHANGELOG](https://github.com/Thinkmill/keystatic/blob/main/packages/keystatic/CHANGELOG.md) (0.6.0 entry); [packages/next/package.json](https://github.com/Thinkmill/keystatic/blob/main/packages/next/package.json). The re-run resolved react-aria 3.50.0, react-stately 3.48.0 and @keystar/ui 0.10.0. |
| 20 | Keystatic's admin needs a Node-capable host for its API routes and fails under `output: 'export'`. GitHub mode creates a GitHub App and needs four env vars, and only users with write access to the repo can edit. (§0, §11.1) | CONFIRMED | https://keystatic.com/docs/installation-next-js (the host must support Node.js); https://keystatic.com/docs/github-mode (collaborators need `write` access). Issue #1341 is **closed** (2025-01-10): it was closed with a pointer to discussion #1361, not by a code change. R6 cites it only for the error message, which is accurate. |
| 21 | Keystatic issues #1549, #1593, #1644 and #1393 are open. #1549 is the blank GitHub-mode admin under `next dev` on Next 16, with the `allowedDevOrigins` workaround. (§11.1) | CONFIRMED, with caveat | GitHub API: all four are `open`, and their dates match R6. Caveat: #1549 was reproduced on @keystatic/core 0.5.50/0.5.51 with next 16.2.x, and the workaround comes from a non-maintainer. Whether it still occurs on 0.6.9 with 16.4.2 is UNKNOWN; keep spike item 2. |
| 22 | sanity 6.20.0 (2026-10-19) has peers react ^19.2.2 and styled-components ^6.1.15 and needs Node ≥22.12. next-sanity 13.3.4 has peers next ^16.0.0-0, react ^19.2.3 and sanity ^5.29 \|\| ^6. The embedded Studio needs Next 16+ and Node 20.9+. sanity#15261 is open, and next-sanity has 3 open issues. (§11.2) | CONFIRMED | Registry; https://www.sanity.io/docs/nextjs/embedding-sanity-studio-in-nextjs ; GitHub API (issue state and an issue search). |
| 23 | Next bug #85374 (wrong prefetch file names in Windows static exports) is open. Cause: `path.relative` produces backslashes, and `convertSegmentPathToStaticExportFilename` replaces only `/`. The code is unchanged at v16.4.2, and fix PR #99058 is open and unmerged. (§3.2, §14) | CONFIRMED, with caveat | GitHub API: #85374 is open (last update 2026-09-28), and PR #99058 is open with `merged_at` null. In the v16.4.2 source, line 80 replaces only `/`. Caveat: the root-cause comment comes from a non-member (`author_association: NONE`), not a Next maintainer. A commenter on 2026-04-21 saw similar 404s with `output: 'standalone'`, which that investigator attributes to separate proxy or basePath issues. |
| 24 | Node: 24.19.0 was released 2026-08-03, the newest 24.x is 24.22.0 (2026-10-14), and the last 24.x security release was 24.18.1 (2026-07-28). Node 24 enters Maintenance LTS on 2026-10-20 and reaches EOL on 2028-04-30. Node 26 becomes Active LTS on 2026-10-28. (§2) | CONFIRMED | https://nodejs.org/dist/index.json (24.19–24.22 have `security: false`; 24.18.1 has `true`); https://raw.githubusercontent.com/nodejs/Release/main/schedule.json |
| 25 | OneDrive: sync performance degrades above about 300,000 items, symbolic links and junctions are unsupported, and some names are reserved. (§14) | CONFIRMED | [OneDrive restrictions](https://support.microsoft.com/en-us/office/restrictions-and-limitations-in-onedrive-and-sharepoint-64883a5d-228e-48f5-b3d2-eb39e07630fa). This matters now because the real scaffold already lives inside OneDrive (see change 3 below). |

**Also checked (lower decision weight).**
- **Google Scholar tags: CONFIRMED.** Scholar requires `citation_title`, `citation_author` and `citation_publication_date`, the PDF must sit in the same subdirectory as the abstract page, and the page does not mention JSON-LD (https://scholar.google.com/intl/en/scholar/inclusion.html). Nuance: the floor is the first author's full name, so one `citation_author` per author is good practice rather than a requirement.
- **MDN `writeText`: CONFIRMED.** It is Baseline since March 2020, needs a secure context, and rejects with `NotAllowedError` (https://developer.mozilla.org/en-US/docs/Web/API/Clipboard/writeText).
- **Lockfile sizes ("about 894" and "about 1,295" packages): UNVERIFIABLE.** My re-runs gave 825 packages (Keystatic stack without the optional component-test layer) and 1,290 (Sanity stack). The package sets differ, so the numbers can't be compared exactly, but the order of magnitude holds.

**Tally:** 23 CONFIRMED (5 of them with a caveat or omission), 2 REFUTED (#4 and #18), 0 UNVERIFIABLE in the table, plus 1 UNVERIFIABLE among the extras.

### Verdict: HOLDS WITH CHANGES

The stack recommendation stands. The picks are next 16.4.2 on a Node-capable host (shape A), TypeScript 6.0.3 rather than 7, ESLint 10 with the three known peer warnings, Tailwind through `@tailwindcss/postcss`, motion 14.4.0, Markdoc, MiniSearch, citation-js, Playwright with axe, Vitest 5 with Vite 8, and Keystatic or Sanity (both compatible). Every version, date, peer range and engine that drives a pick checked out against the registry or official docs. Neither refutation changes a pick, but #4 changes which control actually provides security.

Required changes:

1. **§0 React row.** Reword it. The RSC advisory fix reaches this App Router site through **next ≥16.4.1**, which ships patched vendored `react-server-dom-*`. Make "never deploy next <16.4.1 (15.x: <15.5.28)" the explicit security floor. Keep the react/react-dom 19.3.1 bump as hygiene only.
2. **§3.2 Cache Components.** Add that Next 16.4 says Cache Components becomes the default in Next 17, so `--no-cache-components` defers a migration. Also note that the critical `use cache` typed-array RCE affects only apps with Cache Components enabled (fixed in 16.4.1). This is an explicit trade-off for the owner, not a free choice.
3. **§12 and §14 vs reality.** A scaffold already exists at `C:\Users\jiami\OneDrive\Desktop\Claude\bobalab-website`, inside OneDrive and with `.git` there too. It has next 16.4.2, react/react-dom 19.3.0, `cacheComponents: true`, `partialPrefetching: true`, `@tailwindcss/turbopack`, `eslint ^9`, `typescript ^5` and `@types/node ^20`. The install steps assume a fresh scaffold in `C:\dev`. Either move or re-scaffold outside OneDrive as §14.1 advises, or apply §12 steps 2–3 to this project. If you follow §3.2, also remove `cacheComponents` and `partialPrefetching` from its `next.config.ts`. That choice belongs to the owner. This pass changed nothing on disk.
4. **§1 table.** Fix the engines entry: `axe-core` declares `node >=4`, and only `@axe-core/playwright` declares `>=22.12.0`.
5. **§10.3.** Add the fourth Playwright 1.64 breaking change: JSX in test files follows `tsconfig.json`.
6. **§11.1 #1549.** Note that the evidence comes from Keystatic 0.5.x with Next 16.2.x and that the workaround is a non-maintainer's. Keep the spike.
7. **§14.3 #85374.** Attribute the root-cause analysis to a community commenter, not to Next maintainers. The conclusion (build `out/` on Linux) is unaffected.
8. **Nits.** ESLint 10 engines are `^20.19.0 || ^22.13.0 || >=24`. Scholar's minimum is the first author. motion 13.4.0 reached npm on 2026-09-16. Treat the package counts as approximate.
