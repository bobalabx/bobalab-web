# R4: Editing system, hosting, domain and ownership for the BOBALAB website

Research date: **2026-10-20**. Every source was read that day. Where a page shows a "last updated" date or a version, the Sources table at the end lists it.
Raw captures (npm metadata, policy text, package source greps) are in `research/raw/r4/`.

**Evidence labels**
- **DOCUMENTED**: an official or primary source says it. The URL is given here or in the Sources table, under the tag shown in brackets, such as [S12].
- **CORROBORATED**: two or more independent sources agree.
- **HYPOTHESIS**: my inference.
- **UNKNOWN**: no reliable public evidence found.

All prose is my own wording. Direct quotes are under 15 words.

---

## 0. Decision in one screen

**Primary recommendation: a static-first, Git-based stack.** Its content uses the Decap format.

| Layer | Choice |
|---|---|
| Content (single source of truth) | Markdown and YAML files in `content/` of a **public** repo `website` in a **lab-owned GitHub organization**, for example `bobalab-berkeley`. The login `bobalab` is already taken by an unrelated personal account. |
| Site | **Next.js App Router with `output: 'export'`**. Every page is pre-rendered to static HTML/CSS/JS, and the boba animations run client-side. |
| Editing UI | **Decap CMS 3.x**, a static single-page app at `/admin`. The bundle is vendored and pinned (3.17.1 today). `publish_mode: editorial_workflow` keeps every unpublished change on a `cms/…` branch with a pull request, never on `main`. |
| Editor sign-in | GitHub OAuth through a single-file (~440-line) **Cloudflare Worker** (`sveltia-cms-auth`) on Cloudflare's free tier. Its source uses the same postMessage handshake as Decap's authenticator, so it should work with Decap (HYPOTHESIS; verify at hookup). |
| Hosting | **GitHub Pages from the org repo**, deployed by a GitHub Actions workflow that runs only on `main`. Cloudflare Pages is an alternative if the lab wants access-protected full-site previews of drafts. |
| Safety net | A GitHub **ruleset on `main`** requires a PR and a passing `validate-content` check. Even a CMS bug cannot publish straight to the live site. |
| Domain | Preferred: a **berkeley.edu hostname** via the campus offsite-hosting process. Interim and fallback: `bobalab-berkeley.github.io`. Alternative: the lab's existing **bobalab.org**, but only after confirming who owns it. |

**Upgrade path inside the primary.** **Sveltia CMS** reads the same `config.yml` and content files. It has a nicer and faster UI and scored 81 against Decap's 82. The lab can swap the `<script>` tag later, once Sveltia's editorial workflow (shipped 2026-09-10) has matured and the project has more than one maintainer.

**Runner-up: Keystatic in GitHub mode.** It has the best Next.js integration and least-privilege GitHub App auth. It needs a Node or Workers server runtime. Choose it only if the lab accepts either of these:
- Vercel Pro at about $20/month.
- A verified Cloudflare Workers + OpenNext deployment. This adds adapter, bundle-size and custom-domain caveats.

**Excluded by the hard constraints:**
- **Sanity**: needs a sanity.io account and project even for local development.
- **Pages CMS**: needs a GitHub App plus Postgres even to run locally.
- **Plain github.com editing**: needs github.com, and its UX is poor for non-developers.
- **TinaCMS**: the free tier has 2 users, and editorial workflow is on paid plans.
- **Payload**: needs a database and server. It is over-built for this site.

**Hosting exclusions:**
- **Vercel Hobby**: limited to non-commercial personal use, and it blocks deployments from non-owner commit authors.
- **Netlify Free**: 300 credits, and the site goes offline when they run out.

---

## 1. Hard constraints and how each option fares

| Constraint | What satisfies it | Who fails |
|---|---|---|
| **Local end-to-end demo with no account**: edit in a browser UI, then the public site changes | **Decap**: `npx decap-server` plus `local_backend: true` (DOCUMENTED [S20], [S21]). **Keystatic**: local mode writes to disk (DOCUMENTED [S1]). **Sveltia**: "Work with Local Repository", Chromium only, via the native folder picker (DOCUMENTED [S27]). **TinaCMS**: local mode with no login (DOCUMENTED [S33]). **Payload**: SQLite adapter (DOCUMENTED [S40]). | **Sanity** lists "A Sanity account and project" as a prerequisite (DOCUMENTED [S9]). **Pages CMS** needs Postgres plus a created GitHub App (DOCUMENTED [S36]). **github.com editing** requires GitHub. |
| **One source of truth; public site never shows drafts** | Git CMS plus editorial workflow: drafts live on `cms/<collection>/<slug>` branches with PRs, and merging is "publish" (DOCUMENTED Decap [S22], Sveltia [S28]). The site builds only from `main`. A ruleset on `main` enforces this (DOCUMENTED rulesets are free on public repos [S47]). | **Keystatic** saves straight to `main` unless the editor branches. With a PR-required ruleset it forces "Create branch and save" (DOCUMENTED in the package source [S5]), but publishing then means merging on github.com. |
| **Portability and ownership transfer** | Every Git option: files in the repo, moved with GitHub repo or org transfer (DOCUMENTED [S49], [S50]). | **Sanity**: data in Content Lake, exported as NDJSON (HYPOTHESIS; export format not fetched). **Payload**: database. **Pages CMS**: collaborators are stored in its own database (DOCUMENTED [S37]). |

A note on the local demo for the primary. The builder can demo Decap's **simple** mode locally: edit, file written, `next dev` hot-reloads, then `next build` creates `out/` with the change. The **editorial workflow cannot be demoed locally**: Decap's docs say it is not supported in the local proxy (DOCUMENTED [S21]). The builder should also add a `draft: true` front-matter flag that the build filters out, with a unit test. That makes "drafts never rendered" demonstrable offline. PR-based drafts get verified by the lab after hookup (HYPOTHESIS: an acceptable split).

---

## 2. Decision matrix

Scores run from 0 to 5 and are multiplied by the weights. The total is out of 100. C1 is also a pass/fail gate.

| Criterion (weight) | **Decap 3.x** (static) | **Sveltia** (static) | **Keystatic** (GitHub mode) | **Payload** | **TinaCMS** (Cloud) | **Sanity** (embedded `/studio`) | **github.com editing** | **Pages CMS** (hosted) |
|---|---|---|---|---|---|---|---|---|
| C1 Local, no-account demo (10) | 4 | 3 | 5 | 5 | 4 | **0 FAIL** | **0 FAIL** | **0 FAIL** |
| C2 Non-developer editor UX (15) | 3 | 4 | 4 | 5 | 5 | 4 | 1 | 4 |
| C3 Drafts, preview, publish safety (15) | 4 | 4 | 3 | 5 | 2 | 4 | 3 | 1 |
| C4 Longevity, maintenance, bus factor (15) | 4 | 3 | 3 | 2 | 3 | 3 | 5 | 2 |
| C5 $0 for the PI plus ~12 editors (10) | 5 | 5 | 3 | 2 | 1 | 3 | 5 | 5 |
| C6 Fit with free/static hosts and a berkeley.edu CNAME (10) | 5 | 5 | 2 | 1 | 3 | 4 | 5 | 5 |
| C7 Portability and ownership transfer (10) | 5 | 5 | 5 | 2 | 4 | 3 | 5 | 4 |
| C8 Security and least privilege (5) | 3 | 4 | 5 | 4 | 3 | 2 | 4 | 2 |
| C9 Media, including PDFs (5) | 4 | 4 | 4 | 5 | 3 | 4 | 3 | 4 |
| C10 Relations: pubs, people, projects, directions (5) | 4 | 4 | 4 | 5 | 4 | 5 | 1 | 4 |
| **Weighted total /100** | **82** | **81** | **73** | 70 | 64 | 64 (gate fail) | 65 (gate fail) | 59 (gate fail) |

All scores are HYPOTHESIS: my judgment applied to the DOCUMENTED facts in §3 and §4.

**Reasons for the key scores**
- **Decap vs Sveltia (82 vs 81).**
  - Sveltia has the better UX. It also narrows the OAuth scope: its auth worker's source shows an `auth_scope` option [S29].
  - Decap wins on maturity and on the local demo:
    - Decap has 100+ contributors, the top one with roughly 20% of listed commits. It releases monthly, most recently 3.17.1 on 2026-10-14 (DOCUMENTED [S23], [S46]).
    - Sveltia has one maintainer with about 99% of commits. Its post "feature complete, including editorial workflow" is dated 2026-09-10 and says the project is "built by a single maintainer" (DOCUMENTED [S30], [S46]).
    - Decap's local demo is a plain HTTP proxy (`decap-server`) that an automated agent can drive. Sveltia's local mode needs a native OS folder-picker in Chromium (DOCUMENTED [S27]). The agent's browser tooling may not be able to operate that picker (HYPOTHESIS).
- **Keystatic (73).**
  - Strengths: polished UI, official App Router integration, a typed reader API, and an org-owned GitHub App with repo-scoped tokens.
  - Weaknesses: GitHub mode needs a host that runs Node (DOCUMENTED [S2]), which rules out GitHub Pages and static export. Each free server host has a blocker (§4). Its packages are still 0.x, and `@keystatic/next` went 18 months without a release, from 5.0.4 on 2025-02-26 to 5.0.5 on 2026-08-18 (DOCUMENTED [S45]).
- **Payload (70)** scores high on UX and drafts but needs a database, a server and blob storage. Content does not live in plain files, which breaks the portability preference. It is a reference point only.
- **TinaCMS**: the best visual editing. However, Tina Cloud Free allows 2 users, and editorial workflow is "available on select paid plans" (DOCUMENTED [S31], [S34]). Self-hosting adds a database plus Auth.js (DOCUMENTED [S32]).
- **Sanity, Pages CMS and github.com editing** fail C1. Sanity Free also offers only Administrator and Viewer roles, so every editor would be an admin, and keeps 3 days of history (DOCUMENTED [S8], [S10]).

**Sensitivity check** (HYPOTHESIS). If UX weight doubles to 30 and longevity drops to 0, Keystatic (~83) and Sveltia (~85) pass Decap. In that scenario, Sveltia is the right swap: same architecture and content files, no server.

---

## 3. Each system

### 3.1 Decap CMS (primary UI)

- **Version and health**:
  - Versions: `decap-cms` 3.17.1 and `decap-cms-app` 3.17.1 (2026-10-14), `decap-cms-backend-github` 3.9.1, `decap-server` 3.11.5. All MIT (DOCUMENTED [S45]).
  - Repo: about 19.4k stars, last commit 2026-10-14, 532 open issues (DOCUMENTED [S46]).
  - A paid managed tier, **Decap Turbo**, exists: Free is 1 site and 1 seat; Pro is €19/month for 5 seats (DOCUMENTED [S24]). This project does not need it.
- **Editor UX**:
  - A form-based single-page app at `/admin` (DOCUMENTED [S25]).
  - The editorial-workflow board shows Drafts, In review and Ready.
  - The UI is older and slower on large collections. The large-collection part is HYPOTHESIS and does not matter at lab scale.
- **Auth and permissions**:
  - The GitHub backend "requires a server for authentication". The default is Netlify's provider, at `base_url` `https://api.netlify.com`. Non-Netlify setups use an **external OAuth client** with `base_url` and `auth_endpoint` (DOCUMENTED [S19], [S26]).
  - All 21 listed OAuth clients are "community-maintained" (DOCUMENTED [S26]).
  - Every editor needs **push access** to the repo (DOCUMENTED [S19]).
  - The backend source shows a `backend.auth_scope` option. Its default is `repo`; set `public_repo` for a public repo (DOCUMENTED [S23b]).
  - Roles beyond what GitHub provides: none. Use GitHub teams and rulesets (HYPOTHESIS).
- **Draft, preview and publish**:
  - `publish_mode: editorial_workflow` creates a `cms/<collection>/<slug>` branch and a PR per entry. Publishing merges the PR and deletes the branch. It works with GitHub, GitLab and Bitbucket (DOCUMENTED [S22]).
  - The local proxy does **not** support editorial workflow, and `local_backend` is labeled "currently in beta" (DOCUMENTED [S21], [S25b]).
  - Previews come from an in-CMS preview pane, with custom React preview templates possible (HYPOTHESIS; not fetched). A "deploy preview" link appears only if the host posts commit statuses (`preview_context`, DOCUMENTED [S19]). GitHub Pages does not build PR branches, so there is no full-site preview there (HYPOTHESIS).
- **History and restore**: the Git history. Undo a publish with GitHub's **Revert** button on the merged PR. That opens a new revert PR, and anyone with write access can do it (DOCUMENTED [S48]). Decap itself has no restore UI (HYPOTHESIS).
- **Media and PDFs**: `media_folder` and `public_folder` commit uploads into the repo (DOCUMENTED [S25b]). Git LFS is not supported (DOCUMENTED [S19]). Keep PDFs small and link to the publisher or SSRN for large files (HYPOTHESIS).
- **Relations**: the `relation` widget has `collection`, `value_field`, `search_fields`, `display_fields`, `multiple` and `min`/`max` (DOCUMENTED [S22b]). Reverse lookups, such as a person's publications, are computed at build time. A CI script should fail the build on dangling slugs (HYPOTHESIS: needed because renames break references).
- **Cost**: $0. The OAuth worker runs on the Cloudflare Workers free tier of 100k requests/day (DOCUMENTED [S54]).
- **Lock-in**: minimal. Content is plain Markdown and YAML. The same `config.yml` runs Sveltia (DOCUMENTED [S28], [S30]).
- **Next.js App Router and static hosting**:
  - The admin is static, so it sits in `public/admin/` and is copied to `out/admin/`.
  - Content is read with `fs` and a YAML/front-matter parser in Server Components at build time (HYPOTHESIS: standard).
  - Static export supports Server Components and pre-rendered GET route handlers. It does not support ISR, middleware/proxy, cookies, redirects or headers, default image optimization, Draft Mode or Server Actions (DOCUMENTED [S42]). The site design must avoid those.
- **Security**:
  - The OAuth token is kept in the browser on the site's origin (HYPOTHESIS, consistent with how Sveltia describes token storage [S27b]).
  - Keep the site free of third-party scripts, vendor the CMS bundle (not a CDN), and use `auth_scope: public_repo` (HYPOTHESIS).
  - Optionally serve `/admin` from a separate origin (HYPOTHESIS).
- **Ownership transfer**: the GitHub OAuth App can be org-owned, and repos and orgs transfer (DOCUMENTED [S49], [S50]).

### 3.2 Sveltia CMS (alternative UI on the same files)

- **Version and health**:
  - `@sveltia/cms` 0.249.1 (2026-10-20), MIT. Releases come almost daily, with 5 versions from 2026-10-17 to 2026-10-20 (DOCUMENTED [S45]).
  - One npm maintainer. The 2026-09-10 announcement says it is "built by a single maintainer" and funded by GitHub Sponsors (DOCUMENTED [S30]).
- **Local mode**: Chromium browsers only (Chrome, Edge, Brave with a flag). No proxy is needed, and `decap-server`/`local_backend` are ignored (DOCUMENTED [S27]).
- **Auth**: either "Sign In with Token", a PAT stored in browser local storage, or OAuth through the `sveltia-cms-auth` Cloudflare Worker (DOCUMENTED [S27b], [S29]).
  - The worker uses a classic GitHub **OAuth App**. Its env vars are `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` and `ALLOWED_DOMAINS` (DOCUMENTED [S29]).
  - The source defaults to scope `repo,user` and allows narrowing to `public_repo` (DOCUMENTED [S29b]).
  - The worker uses the same `authorization:github:…` postMessage handshake as Decap's authenticator. It should therefore work for Decap too (HYPOTHESIS based on the source; the builder should test it, and the lab should verify after hookup).
- **Editorial workflow**: supported since 2026-09-10. It uses draft PRs and `sveltia-cms/*` labels. On GitHub it needs auto-merge allowed, and it waits up to 1 hour for required checks (DOCUMENTED [S28], [S30]).
- **Media**: `media_folder`, a configurable `max_file_size`, and optional WebP conversion of raster images (DOCUMENTED [S27c]).

### 3.3 Keystatic (runner-up)

- **Version and health**:
  - `@keystatic/core` 0.6.9 (2026-08-26), `@keystatic/next` 5.0.5 (2026-08-18; peer `next >=14`), MIT (DOCUMENTED [S45]).
  - Thinkmill org, about 2.5k stars, last commit 2026-10-01, 67+ contributors with the top one at about 45% (DOCUMENTED [S46]).
- **Modes**:
  - **local**: content goes to the local filesystem (DOCUMENTED [S1]).
  - **github**: users log in with GitHub, and anyone with **write** access can use `/keystatic` (DOCUMENTED [S2]).
  - **cloud**: keystatic.cloud handles auth. Editors do **not** need GitHub accounts. Free allows 3 users per team; Pro is $10/month plus $5 per user beyond 3, which comes to about $60/month for 13 users (DOCUMENTED [S3]).
- **Next.js App Router**:
  - Official setup uses `src/app/keystatic/…` pages plus the route handler `src/app/api/keystatic/[...params]/route.ts`. Content is read server-side with `createReader` (DOCUMENTED [S4]).
  - It needs Node-capable hosting (DOCUMENTED [S2], [S4]). Deployment docs say "Coming soon" (DOCUMENTED [S2]).
- **GitHub mode setup**:
  - Env vars: `KEYSTATIC_GITHUB_CLIENT_ID`, `KEYSTATIC_GITHUB_CLIENT_SECRET`, `KEYSTATIC_SECRET` and `NEXT_PUBLIC_KEYSTATIC_GITHUB_APP_SLUG` (DOCUMENTED [S2]).
  - The setup creates a GitHub App by manifest. The package source supports creating it under an **organization** (`/organizations/{org}/settings/apps/new`). The OAuth callback is `/api/keystatic/github/oauth/callback` (DOCUMENTED [S5]).
- **Drafts**:
  - There is a branch picker with "Create branch" and "Create pull request" (DOCUMENTED [S5]).
  - When `main` requires PRs, the UI says changes must go through a PR and offers "Create branch and save" (DOCUMENTED [S5]).
  - There is no review board; publishing means merging on github.com (HYPOTHESIS).
- **Fields**:
  - `relationship` stores a slug and breaks if the slug changes (DOCUMENTED [S6]).
  - `multiRelationship` exists in the 0.6.9 type declarations (DOCUMENTED [S5]).
  - `file` and `image` commit into the repo, with `directory` and `publicPath` options (DOCUMENTED [S7], [S7b]).
- **Runtime portability**:
  - The package ships a `worker` build of the API handler. It is fetch-based and uses WebCrypto. Local mode explicitly refuses to run on non-Node runtimes (DOCUMENTED [S5]).
  - Cloudflare Workers is therefore plausible for GitHub mode (HYPOTHESIS: not verified end-to-end).
- **Security**: a GitHub App gives repo-scoped, installation-limited access and is org-owned and transferable (DOCUMENTED [S51]). This is the strongest least-privilege story in the set (HYPOTHESIS).

### 3.4 TinaCMS

- **Version**: `tinacms` 3.15.0 and `@tinacms/cli` 4.0.3 (2026-10-19), Apache-2.0 (DOCUMENTED [S45]).
- **Pricing** (DOCUMENTED [S31]):
  - Tina Cloud Free: $0, 2 users, 2 roles.
  - Team: $24 per project per month, with 3 users included and up to 10.
  - Team Plus: $41 per month, with 5 users included and up to 20.
  - Business: $249 per month.
  - All plans include unlimited repos and documents, with a 100 MB asset cap.
  - No education discount is listed.
- **Editorial workflow**: "available on select paid plans" (DOCUMENTED [S34]).
- **Local mode**: no login, loads from the filesystem, and expects a server at `localhost:4001` (DOCUMENTED [S33]).
- **Self-hosting**: needs an Auth.js auth provider, a database adapter (MongoDB or Postgres) and a Git provider, run as a Node serverless function. It lacks Git-backed media, runtime branch switching and search (DOCUMENTED [S32], [S33]).
- **App Router**: supported, including visual editing (DOCUMENTED [S35]).
- **Verdict**: 12 or more editors would need a paid plan, or a self-hosted database plus server. Rejected.

### 3.5 Sanity (embedded Studio at `/studio` vs hosted)

- **Embedded Studio**: a catch-all `app/studio/[[...tool]]/page.tsx` rendering `NextStudio`, configured with `NEXT_PUBLIC_SANITY_PROJECT_ID` and `NEXT_PUBLIC_SANITY_DATASET`. Prerequisites list a Sanity account and project (DOCUMENTED [S9]). `next-sanity` 13.3.4 has the peer `next ^16` (DOCUMENTED [S45]).
- **Local dev**: needs a sanity.io project because content lives in Sanity's hosted backend. This **fails C1** (DOCUMENTED [S9]).
- **Free plan** (DOCUMENTED [S8]):
  - 20 seats, 2 roles (Administrator and Viewer), and 2 datasets, all public.
  - 10k documents, 250k API requests, 1M CDN requests and 100 GB bandwidth per month; 100 GB of assets.
  - No comments, content releases or scheduled drafts.
  - Growth costs $15 per seat per month. A non-profit plan exists; whether a public university qualifies is UNKNOWN.
- **Drafts**: stored under the `drafts.` path and never served to unauthenticated requests, even in public datasets (DOCUMENTED [S11]).
- **History**: kept for 3 days on Free, 90 on Growth, 365 on Enterprise (DOCUMENTED [S10]).
- **Verdict**:
  - It fails the no-account local demo.
  - Every free-plan editor would be an Administrator.
  - The 3-day history is too short to undo mistakes.
  - Content would live with a vendor.

### 3.6 Pages CMS (pagescms.org)

- **What it is**: free and MIT. Hosted at app.pagescms.org, or self-hosted (DOCUMENTED [S36b]).
- **Collaborators**: invited by email, and **no GitHub account is needed**. Their commits use the GitHub App installation token (DOCUMENTED [S37]).
- **Self-hosting or local use** needs (DOCUMENTED [S36]):
  - PostgreSQL.
  - A GitHub App created with the helper script.
  - `DATABASE_URL`, `BETTER_AUTH_SECRET` and `CRYPTO_KEY`.
  - A public tunnel for webhooks.

  This **fails C1**.
- **Permissions**: the GitHub App requests **Contents RW, Administration RW and Actions RW** (DOCUMENTED [S38]). Under the hosted model, a third-party service holds those permissions on the lab repo (HYPOTHESIS: a security concern).
- **Workflow**: no editorial or draft workflow is documented on the pages I read (UNKNOWN).
- **Relations**: a `reference` field exists (DOCUMENTED [S39]).
- **Maintenance**: the repo sits under an individual's account, `hunvreus/pagescms`. The last commit on the default branch was 2026-06-08 and the last push 2026-10-16 (DOCUMENTED [S46]).
- **Possible later use**: email-only editors could be useful for editors who refuse GitHub (HYPOTHESIS). It cannot be the primary.

### 3.7 Baseline: plain files edited on github.com

- **Browser editing**: uploads are capped at **25 MiB** per file; up to 100 MiB via the CLI; larger needs LFS (DOCUMENTED [S47b]).
- **Drafts and safety**: PRs and rulesets are free on public repos (DOCUMENTED [S47]). History and revert are excellent (DOCUMENTED [S48]).
- **UX**: hostile to non-developers. YAML hand-editing breaks easily, and there are no relation pickers (HYPOTHESIS).
- **Role**: it remains the **fallback editor** for the primary stack, since files are files.

### 3.8 Payload (over-built reference)

- **Version**: `payload` 3.91.0 (2026-10-15), MIT. It runs inside a Next.js app (DOCUMENTED [S40], [S45]).
- **Databases**: MongoDB or Postgres per the overview, plus a SQLite adapter, `@payloadcms/db-sqlite` 3.91.0 (DOCUMENTED [S45]).
- **Drafts**: drafts on top of versions, autosave, scheduled publish that needs a jobs queue, and "revert to published" (DOCUMENTED [S41]).
- **Ownership**: acquired by Figma in June 2025 (CORROBORATED by multiple secondary reports [S41b]; the exact date of Figma's own announcement was not fetched).
- **Verdict**: production needs a persistent database, file storage and a server. That is more infrastructure than a lab with student turnover should run, and content is not in plain files (HYPOTHESIS).

---

## 4. Hosting

| Host | Terms for a lab site | Server routes (OAuth, Keystatic) | Static export | `bobalab.berkeley.edu` via CNAME | Draft-preview protection | Verdict |
|---|---|---|---|---|---|---|
| **GitHub Pages** (org) | Public repos on GitHub Free orgs; private repos need Pro, Team or Enterprise (DOCUMENTED [S43]). Not for a business, e-commerce or SaaS (DOCUMENTED [S44], [S44b]). Limits: 1 GB site, 100 GB/month soft bandwidth, 10 builds/hour soft (no limit with a custom Actions workflow), 10-minute deploy timeout (DOCUMENTED [S44]). | **No**: static only. The OAuth worker lives elsewhere. | Yes. Next.js links an official template (DOCUMENTED [S42]). | **Yes**: CNAME to `<org>.github.io`, then Enforce HTTPS; verify the domain for the org (DOCUMENTED [S53]). | No PR previews, so drafts are never deployed anywhere (HYPOTHESIS). | **Primary.** |
| **Cloudflare Pages** | Free: 500 builds/month, 1 concurrent build, 20k files, 25 MiB per file, 100 custom domains (DOCUMENTED [S55], updated 2026-09-05). Cloudflare now says "Start new projects with Workers" but does not deprecate Pages (DOCUMENTED [S56]). | Pages Functions, which count against the Workers quota (DOCUMENTED [S55]). | Yes. | **Yes**: a CNAME for a subdomain without moving the zone (DOCUMENTED [S57]). | Preview URLs are **public by default**; "Enable access policy" adds Cloudflare Access (DOCUMENTED [S58]). | **Alternative**, if the lab wants full-site draft previews. |
| **Cloudflare Workers** (static assets plus code) | Free: 100k requests/day, 10 ms CPU per invocation, **static asset requests free and unlimited** (DOCUMENTED [S54]). Workers Builds: 3,000 minutes/month, 20-minute timeout (DOCUMENTED [S59]). Free Worker size is 3 MiB compressed (DOCUMENTED [S60]). | Yes. Next.js runs via vinext (beta, per Cloudflare's guide) or the OpenNext adapter. OpenNext: "Windows support isn't guaranteed" (DOCUMENTED [S60], [S61]). | Yes. | **No**: Custom Domains need an active Cloudflare zone and fail on an existing CNAME (DOCUMENTED [S62]). Fine for bobalab.org, whose DNS is on Cloudflare. | Version URLs are public; protect them with Access (DOCUMENTED [S63]). | Hosts the **OAuth worker** in the primary. Hosts Keystatic only if the domain is bobalab.org and a spike passes. |
| **Vercel Hobby** | "Hobby teams are restricted to non-commercial personal use only." Commercial use includes a paid employee writing the code (DOCUMENTED [S12]). Pricing FAQ: Hobby is for personal, non-commercial use (DOCUMENTED [S13]). "Collaboration has never been permitted on Hobby plans", and only the owner's commits deploy (DOCUMENTED [S14]). Private repos owned by orgs are blocked; public org repos are allowed (CORROBORATED: Vercel staff forum posts dated 2025-07-16 [S15]). One developer seat (DOCUMENTED [S13]). | Yes. | Yes. | Yes. | Vercel Authentication is available on Hobby (DOCUMENTED [S16]). | **Do not use.** A lab site is institutional, not personal, and RAs are often paid (HYPOTHESIS). Commits from RAs through a CMS would not deploy. |
| **Vercel Pro** | $20 per developer seat per month; viewer seats free (DOCUMENTED [S16]). For private repos, commit authors must be team members (DOCUMENTED [S14]). Rules for public repos: UNKNOWN. | Yes. | Yes. | Yes. | Yes. | Simplest **paid** host for the Keystatic runner-up. |
| **Netlify Free** | 300 credits/month, hard limit. A production deploy costs 15 credits, bandwidth 20 credits/GB, web requests 2 credits per 10k. Previews are unmetered (DOCUMENTED [S17], updated 2026-09-01). When credits run out, **all projects are paused and the site goes offline** until the next cycle (DOCUMENTED [S18], updated 2026-09-03). Org-owned private repos are not available on Free; there is 1 Team Owner (DOCUMENTED [S17]). Personal is $9/month for 1,000 credits; Pro is $20/month (DOCUMENTED [S13b]). | Yes. | Yes. | Yes. | Yes. | **Do not use free.** Twenty production deploys a month cannot absorb CMS publishing, and a paused site is unacceptable. |
| **UC Berkeley Pantheon** (DIY Drupal/WordPress) | Any campus unit; owners need @berkeley.edu Pantheon accounts. Primary domain must be berkeley.edu. Free development sandbox; production is paid via a chart string. P1 data only. MOU effective through 2027-06-30 (DOCUMENTED [S64]). Current prices: UNKNOWN; a 2024 page listed tiers that may be stale. | PHP CMS, not Next.js. | No. | Native. | Pantheon dev/test environments. | Not a fit for a custom Next.js site (HYPOTHESIS). |
| **Berkeley Web Builder** (successor to Open Berkeley) | Drupal 10, generally available, uses updated Berkeley brand design (DOCUMENTED [S65], [S66]). Eligibility and cost: UNKNOWN. Open Berkeley is labeled "legacy" (DOCUMENTED [S67]). | n/a | No. | Native. | n/a | Credible, but template-driven. Custom boba animation is unlikely to be possible (HYPOTHESIS). Could host a minimal official stub page if Haas prefers. |
| **Haas web** (haas.berkeley.edu) | Haas lists research labs on its site (DOCUMENTED [S68]). The process for a faculty-lab page: UNKNOWN; ask Haas MarCom at brand@haas.berkeley.edu (DOCUMENTED [S72]). | n/a | n/a | n/a | n/a | Useful as a **link-in** (an entry on the Haas Research Labs page), not as the host. |

**Precedents** (DOCUMENTED by DNS lookup on 2026-10-20):
- `cmr.berkeley.edu` (Haas's *California Management Review*) is a CNAME to a `netlify.app` site.
- `newsroom.haas.berkeley.edu` points to WP Engine.
- `haas.berkeley.edu` is served by the campus nameservers `adns1-3.berkeley.edu`.

Haas berkeley.edu hostnames on third-party static hosts are therefore an established pattern (HYPOTHESIS: they were approved through the offsite process).

---

## 5. Domain

### 5.1 A berkeley.edu hostname (`bobalab.berkeley.edu` or `bobalab.haas.berkeley.edu`)

**Who and what the process requires** (all DOCUMENTED from KB0015380 v4.0, modified 2026-09-18 [S69], and the DNS Service Policy, issued 2024-02-01 with an admin update on 2026-09-22 [S70]):

1. **Who may request.** Groups of faculty, staff or students that are a registered, sponsored or affiliated campus organization, or a sponsored departmental organization. A faculty lab fits through its department, Haas [S70].
2. **Offsite hosting needs ISO approval.** The **department's Security Contact** registers the offsite hostname in **Socreg**. They supply:
   - the hostname;
   - the hosting service;
   - the data protection level (the KB's example: Pantheon is approved for P1 only);
   - a description;
   - the host's DNS details.

   A **Resource Proprietor** takes responsibility for policy compliance, including a **privacy statement** [S69].
3. **Top-level berkeley.edu names need the Domain Approval committee.** It asks for the purpose and mission fit, a responsible contact, and an acknowledgement of policies including web accessibility [S69].
   - The DNS policy prefers names inside a **departmental subdomain** unless the name meets top-level criteria. Those criteria are broad campus impact, user experience, and a name that represents the entity [S70].
   - My read: `bobalab.haas.berkeley.edu` may be the easier ask (HYPOTHESIS).
4. **Records pointing off-campus are an exception.** They are reviewed by the **DNS Policy Committee** and must comply with the IT Accessibility Policy, the Campus Online Activities Policy and UC IS-3 [S70].
5. **Site-level obligations** [S69]:
   - a Security Contact;
   - a privacy statement;
   - no third-party ads, and no analytics that pass visitors' personal data to third parties;
   - **Siteimprove** accessibility scanning.

   "No-code" hosts such as Squarespace, Wix, Weebly and Webflow are not suitable. GitHub Pages and Cloudflare are not on that list.
6. **Which hosts are approved for P1**: UNKNOWN for GitHub Pages and for Cloudflare. ISO decides during registration.
7. **Timeline**: UNKNOWN.

**Status today.** Neither `bobalab.berkeley.edu` nor `bobalab.haas.berkeley.edu` resolves (DOCUMENTED, DNS NXDOMAIN on 2026-10-20).

### 5.2 Alternatives

- **`bobalab.org`.**
  - It is already in use. It 302-redirects to `scheduler.bobalab.org`, whose metadata says it schedules weekly lab meetings for the Berkeley Operations and Behavioral Analytics Lab. It is `noindex` (DOCUMENTED [S71]). Its nameservers are Cloudflare's (DOCUMENTED, NS lookup).
  - Registrant and controller: **UNKNOWN**. The page suggests a lab member runs it (HYPOTHESIS).
  - Campus policy: a campus entity's domain outside berkeley.edu needs **Office of Communications and Public Affairs approval** and policy compliance (DOCUMENTED [S70]).
  - If used, move the registration and DNS into a lab-controlled account with two admins before launch (HYPOTHESIS: required for turnover).
- **`bobalab-berkeley.github.io`.** No approvals are needed. Name the repo `bobalab-berkeley.github.io` so the site serves at the root (HYPOTHESIS: standard GitHub Pages behavior; not fetched). Good as the interim URL while campus approval runs.
- **GitHub org name.** `bobalab` is an existing personal account created in 2020; any relation to the lab is UNKNOWN. `bobalab-berkeley`, `berkeley-bobalab` and `bobalab-haas` were all free on 2026-10-20 (DOCUMENTED, GitHub API 404).

**Recommendation** (HYPOTHESIS):
1. Launch on `bobalab-berkeley.github.io`.
2. In parallel, the PI asks the Haas Security Contact for `bobalab.haas.berkeley.edu`, or `bobalab.berkeley.edu` if approved, pointing to GitHub Pages.
3. Keep `bobalab.org` for the scheduler, or redirect it once ownership is settled.

---

## 6. Branding: what BOBALAB may and may not do

**May**
- Use **Berkeley Blue `#002676`** and **California Gold `#FDB515`**, with accessible pairings, as accents (DOCUMENTED palette [S73]). Using the colors is not the same as using a mark (HYPOTHESIS). Haas's palette is **Haas Blue `#003057`**, California Gold, white and three grays; its fonts are Larken, Barlow and Inter (DOCUMENTED [S74]).
- Credit the lab in **plain text**, for example "Haas School of Business, University of California, Berkeley". Haas's default advice to groups is to use the official logo and type the group's name in the document (DOCUMENTED [S74]).
- Have a **lab identity that does not use, imitate or combine university marks**, such as a playful boba wordmark or illustration. This is HYPOTHESIS. Campus guidance discourages units from creating their own logo ("avoid creating a unique 'logo' for your unit") and notes that not every program should have one (DOCUMENTED [S75]). No rule specific to labs was found, so treat this as a **check with Haas MarCom**. Any lab mark that already exists, such as the scheduler's logo files, is UNKNOWN (see R1/R2).
- **Request an official lockup** for the Berkeley logo:
  - Only Strategic Communications produces campus lockups. Units request them with the "Request a Lockup" form, take about 2 weeks, and receive 5 colorways (DOCUMENTED [S75]). Whether labs are eligible is UNKNOWN.
  - Haas: "contact Haas MarCom to request a lockup" (DOCUMENTED [S74]). Haas program lockups are for merchandise, not for electronic or print communications (DOCUMENTED [S74]).

**May not**
- Recreate, retype, recolor, stretch or add effects to the UC Berkeley logo (DOCUMENTED [S76]). Logo minimum digital size is 200 px, or 250 px for the expanded version (DOCUMENTED [S76]).
- Use the Haas wordmark to build the lab's own logo ("Don't use the UC Berkeley Haas wordmark to create your own logo"), or alter or type out the Haas logo (DOCUMENTED [S74]).
- Use the Haas logo on a personal website. Haas restricts website use to official departmental websites and student clubs (DOCUMENTED [S74]). Whether a faculty lab site counts: **UNKNOWN; ask MarCom.**
- Use the **seal** without permission:
  - The primary logo and seal are granted only in limited cases, with permission from Brand Protection (DOCUMENTED [S77]).
  - The seal may not appear on personal websites (DOCUMENTED [S78]).
  - Use it "with restraint and not as the primary focus" (DOCUMENTED [S79]).
  - Recommendation: do not use it.
- Let **students** apply official campus branding. "UC Berkeley students are prohibited from using official campus branding" (DOCUMENTED [S77]). RAs therefore should not add Berkeley or Haas logos on their own. Any official mark goes in only with the PI's or the department's approval (HYPOTHESIS: practical reading).
- Use the Cal script or walking bear outside athletics and spirit contexts, or modify the "B" favicon (DOCUMENTED [S76], [S79]). The site needs its **own favicon**.
- Imply university endorsement of products, services or causes (DOCUMENTED [S78], [S74]).

**"Berkeley" in the lab's long name.** Under the Use of Name policy, deans, directors and chairs authorize sponsored departmental organizations to use the campus name for identification. Other independent groups may not use it (DOCUMENTED [S78]). The PI should confirm the name with the Haas dean's office or the area chair (HYPOTHESIS: routine).

---

## 7. Recommended architecture (primary) in detail

```
repo bobalab-berkeley/website  (public; owners: PI + 1)
├─ content/            ← single source of truth (YAML for people/pubs/directions, MD for project pages)
├─ public/admin/       ← index.html + vendored decap-cms.js (3.17.1) + config.yml
├─ public/files/       ← PDFs (size-capped), images
├─ app/ …              ← Next.js App Router, output:'export'
├─ scripts/validate-content.ts   ← schema + reference integrity (CI-required check)
└─ .github/workflows/deploy.yml  ← on push to main: validate → next build → deploy-pages
```

- **Publish path**:
  1. An editor signs in at `/admin` with GitHub, through the Cloudflare OAuth worker.
  2. Saving a change commits to `cms/...` and opens a PR. That is the draft.
  3. Editors move the item from "In review" to "Ready", then click **Publish**. The PR merges into `main`, where the ruleset requires a PR and a passing validation check.
  4. Actions builds and deploys to Pages.
- **Rollback**: use **Revert** on the PR.

---

## 8. Production setup steps (performed by the lab, not the builder)

Placeholders: `<ORG>` = `bobalab-berkeley`; `<HOST>` = the final hostname; `<WORKER>` = `bobalab-cms-auth.<subdomain>.workers.dev`.

**A. Accounts and ownership** (PI, about 30 minutes)
1. The PI uses the existing GitHub account. A user `parksinchaisri` exists (DOCUMENTED, GitHub API). Enable 2FA.
2. Create the organization `<ORG>` on the **Free** plan. Add a **second Owner**, such as a co-PI, lab manager or Haas staff member. GitHub recommends at least 2 owners (DOCUMENTED [S52]).
3. Optional: apply to GitHub Education as a teacher, then "Apply for free GitHub Team" (DOCUMENTED [S52b]). Team enables private repos with Pages and rulesets.
4. Create a **lab-controlled email** to own non-GitHub accounts. The PI's site lists a lab address at berkeley.edu (SELF-REPORTED per R2). Use it for Cloudflare and any registrar, and record the credentials in the PI's password manager.

**B. Repository and deploys**
1. Create the repo `<ORG>/website`, public. A lab member pushes the builder's local repo: `git remote add origin …` then `git push -u origin main`.
2. Org → Teams:
   - `web-editors`: **Write** on `website`.
   - `web-maintainers`: **Maintain**.
   - Org base permission: Read or None.
3. Repo → Settings → **Pages** → Source: **GitHub Actions**. The workflow is already in the repo, and its deploy job uses `permissions: pages: write, id-token: write`.
4. Repo → Settings → **Rules → Rulesets** → New branch ruleset `protect-main`:
   - Target: the default branch.
   - Require a pull request: 0 approvals, or 1 if the PI wants to review everything.
   - Require status check `validate-content`.
   - Block force pushes and restrict deletions.
   - Bypass: organization admins only.
5. Repo → Settings → General: allow **squash merging**. Allow **auto-merge** if Sveltia is adopted later (DOCUMENTED requirement [S28]).
6. Org → Settings → Third-party access:
   - Keep the OAuth app policy **restricted**.
   - Approve only the lab's own OAuth App, created in step C1.
   - Restrict GitHub App installation to owners (DOCUMENTED capability [S52c]).

**C. Sign-in bridge (Cloudflare Worker)**
1. Org → Settings → Developer settings → **OAuth Apps → New**:
   - Name: "BOBALAB website CMS".
   - Homepage: `https://<HOST>`.
   - Callback: `https://<WORKER>/callback` (DOCUMENTED pattern [S29]).
   - Generate a client secret.
2. Create a **Cloudflare account** with the lab email. Enable 2FA and add the second admin as a member. Members on any account are DOCUMENTED [S80]; Free-plan role limits are UNKNOWN.
3. Fork `sveltia/sveltia-cms-auth` into `<ORG>` at a pinned commit. In Cloudflare, go to Workers & Pages → Create → Import repository, or run `wrangler deploy`.
4. Worker → Settings → Variables:
   - `GITHUB_CLIENT_ID`
   - `GITHUB_CLIENT_SECRET`, type **Secret**
   - `ALLOWED_DOMAINS` = `<HOST>,<ORG>.github.io`

   Then deploy (DOCUMENTED [S29]).
5. Through a PR, edit `public/admin/config.yml`:
   - `backend: { name: github, repo: <ORG>/website, branch: main, base_url: https://<WORKER>, auth_scope: public_repo }`
   - `publish_mode: editorial_workflow`
   - `site_url: https://<HOST>`

   Use `auth_scope: repo` instead if the repo becomes private.
6. Smoke test: Login → edit → "Save" creates a PR → Publish → Actions turns green → the change is live. Then click Revert on the PR and confirm the rollback.

**D. Domain**
1. **Interim**: `https://<ORG>.github.io/website/`. This needs `basePath`, which the builder provides as an env switch. Alternatively, rename the repo `<ORG>.github.io` to serve at the root (HYPOTHESIS: standard behavior).
2. **berkeley.edu**: the PI emails the Haas departmental Security Contact, or finds them through Socreg. ISO helps identify that person (DOCUMENTED [S69]). The registration includes:
   - Hostname: `bobalab.haas.berkeley.edu` or `bobalab.berkeley.edu`.
   - Hosting: GitHub Pages.
   - Protection level: P1.
   - Description of the site.
   - DNS: `CNAME <HOST> → <ORG>.github.io.`, plus the TXT record GitHub shows for org domain verification.

   Also provide:
   - The Resource Proprietor: the PI.
   - The privacy statement URL, which the builder ships at `/privacy`.
   - The accessibility acknowledgement.

   Answer the Domain Approval prompts on purpose, contact and policies.
3. After DNS is live:
   - Org → Settings → Pages → **Add a verified domain**.
   - Repo → Pages → Custom domain `<HOST>`, then **Enforce HTTPS** (DOCUMENTED [S53]).
4. Set up Siteimprove scanning per campus requirement (DOCUMENTED [S69]). The procedure is UNKNOWN; ask ISO or the Digital Accessibility Program.
5. **bobalab.org** (optional):
   - Confirm the registrant and move it to the lab Cloudflare account.
   - Get OCPA approval (DOCUMENTED [S70]).
   - Then point `www` at `<ORG>.github.io` per GitHub's custom-domain docs.

**E. Editors**
1. Each RA creates a free GitHub account with 2FA. The PI adds them to `web-editors`.
2. The RA opens `https://<HOST>/admin/`, clicks Login with GitHub, and authorizes "BOBALAB website CMS".
3. **Each term**:
   - Remove departing RAs from the org.
   - Review the members list.
   - Rotate the OAuth client secret yearly. Update both the GitHub OAuth App and the Worker secret.

**F. Runner-up hookup (Keystatic), if chosen instead**
1. Keep the same org, repo and ruleset.
2. The host is Vercel **Pro**, with the team owned by the PI. Use a public repo, because commit-author rules apply to private repos (DOCUMENTED [S14]). Alternatively use Cloudflare Workers through `@opennextjs/cloudflare` 1.20.12 after a spike that checks:
   - the 3 MiB bundle limit;
   - Linux builds;
   - a domain whose zone is on Cloudflare.
3. An org owner runs the site with `storage: { kind: 'github', repo: '<ORG>/website' }`, opens `/keystatic`, and creates the GitHub App **under the org**. Copy the generated `.env` values into the host:
   - `KEYSTATIC_GITHUB_CLIENT_ID`
   - `KEYSTATIC_GITHUB_CLIENT_SECRET`
   - `KEYSTATIC_SECRET`
   - `NEXT_PUBLIC_KEYSTATIC_GITHUB_APP_SLUG`

   Add the callback `https://<HOST>/api/keystatic/github/oauth/callback` (DOCUMENTED [S2], [S5]).
4. Install the app on the `website` repo **only**.

---

## 9. Ownership and turnover

| Asset | Owner of record | Second admin | Transfer method |
|---|---|---|---|
| GitHub org, repo, OAuth App | PI | Co-owner | Org ownership transfer; OAuth/GitHub App transfer (DOCUMENTED [S50], [S51]) |
| Cloudflare account (auth worker, optional DNS) | Lab email | PI plus one | Account members (DOCUMENTED [S80]) |
| Domain | Campus DNS (berkeley.edu) or lab registrar (bobalab.org) | Haas Security Contact or a second admin | Socreg record owner; registrar transfer |
| Secrets | PI's password manager | Co-owner | Rotate on handover |

Ship a `HANDOVER.md` in the repo that covers: the owners list; where each secret lives; how to bump Decap (one file); the Node LTS used; how to revert; how to add or remove editors; and campus contacts (HYPOTHESIS: a builder deliverable).

---

## 10. Risks and mitigations

| # | Risk | Label | Mitigation |
|---|---|---|---|
| 1 | Decap's pace or quality slips, or Sveltia's single maintainer leaves | HYPOTHESIS | Files and config are shared, so swapping the UI is one `<script>` change. github.com editing is the last-resort fallback. |
| 2 | OAuth App tokens (`repo` scope) reach beyond this repo, and they live in the browser | DOCUMENTED that OAuth Apps use scopes [S29b], [S23b] | Use `auth_scope: public_repo`. Allow no third-party scripts on the site. Vendor the CMS bundle. Optionally move `/admin` to its own origin. Use 2FA. Remove leavers each term. |
| 3 | Public repo: draft branches and git history are publicly readable on github.com, even though the site never renders them | HYPOTHESIS (inherent to public repos) | Never put embargoed or personal data in drafts. If that is unacceptable, use a private repo with free GitHub Team via GitHub Education (DOCUMENTED [S52b]). Pages then works on Team (DOCUMENTED [S43]). |
| 4 | Campus approval for an offsite hostname is slow or denied; approval of GitHub Pages for P1 is UNKNOWN | UNKNOWN | Launch on `github.io`. The Netlify precedent at cmr.berkeley.edu suggests it is feasible. Fallback is bobalab.org with OCPA approval. |
| 5 | Repo bloat from PDFs and images | HYPOTHESIS | Cap upload size in config. Link large papers to the publisher, SSRN or arXiv. GitHub Pages limits are 1 GB site and 1 GB recommended repo (DOCUMENTED [S44]). |
| 6 | Broken references after slug renames | DOCUMENTED for Keystatic [S6]; HYPOTHESIS for Decap | Make `validate-content` a required check; it blocks the merge. |
| 7 | Someone later moves the site to Vercel Hobby or Netlify Free | DOCUMENTED terms [S12], [S14], [S18] | Explain why in `HANDOVER.md`. |
| 8 | Static-export limits: no ISR, middleware, default image optimization or Draft Mode | DOCUMENTED [S42] | Design for build-time rendering. Pre-size images at upload; Sveltia can convert to WebP [S27c]. |
| 9 | Accessibility compliance, including heavy animation | DOCUMENTED requirement [S69] | Honor `prefers-reduced-motion`, keep keyboard paths, run a Siteimprove scan before go-live. |
| 10 | Branding misstep by students | DOCUMENTED [S77] | Use no official marks until MarCom confirms. Use text attribution, and keep the lab mark visually separate. |
| 11 | Editors without GitHub accounts or willingness to use them | HYPOTHESIS | GitHub accounts are free. If adoption fails, consider Keystatic Cloud (editors need no GitHub; 3 free users) or Pages CMS for those editors. Both are paid or third-party trade-offs. |
| 12 | The OAuth worker template is community software | DOCUMENTED [S26] | Fork into the org at a pinned commit and review the single ~440-line source file. It is the only server component. |

---

## 11. Open questions for the lab

1. Who owns and controls **bobalab.org** and the scheduler? Should the website live there, or under berkeley.edu?
2. Does the PI want a **review gate**, meaning one required approval on `main`, or should RAs publish on their own?
3. Is a **public repo** acceptable, given that drafts are visible on GitHub but never on the site? Or should the PI get GitHub Team via GitHub Education and go private?
4. Who is Haas's **departmental Security Contact** for Socreg? Will Haas sponsor `bobalab.haas.berkeley.edu` or `bobalab.berkeley.edu`?
5. Haas MarCom questions: may a faculty-lab site carry the Berkeley Haas logo or a lockup? Is a standalone BOBALAB boba mark acceptable?
6. Do any RAs lack GitHub accounts, or refuse to create one?
7. Does the lab have any budget? About $20/month would make the Keystatic runner-up on Vercel Pro viable.

---

## 12. Sources (all read 2026-10-20)

| Tag | Source | Version / date shown |
|---|---|---|
| S1 | https://keystatic.com/docs/local-mode | n/a |
| S2 | https://keystatic.com/docs/github-mode | deploy section "Coming soon" |
| S3 | https://keystatic.com/docs/cloud | n/a |
| S4 | https://keystatic.com/docs/installation-next-js | n/a |
| S5 | `@keystatic/core@0.6.9` package source (https://registry.npmjs.org/@keystatic/core/-/core-0.6.9.tgz): `keystatic-core-ui.js`, `keystatic-core-api-generic.worker.js`, `dist/declarations/.../multiRelationship` | 0.6.9 |
| S6 | https://keystatic.com/docs/fields/relationship | n/a |
| S7 / S7b | https://keystatic.com/docs/fields/file ; https://keystatic.com/docs/fields/image | n/a |
| S8 | https://www.sanity.io/pricing | © 2026 |
| S9 | https://www.sanity.io/docs/nextjs/embedding-sanity-studio-in-nextjs | n/a |
| S10 | https://www.sanity.io/docs/user-guides/history-experience | n/a |
| S11 | https://www.sanity.io/docs/content-lake/drafts | n/a |
| S12 | https://vercel.com/docs/limits/fair-use-guidelines | last_updated 2026-09-14 |
| S13 / S13b | https://vercel.com/pricing ; https://www.netlify.com/pricing/ | n/a |
| S14 | https://vercel.com/kb/guide/why-aren-t-commits-triggering-deployments-on-vercel | updated 2026-10-16 |
| S15 | https://community.vercel.com/t/why-cant-hobby-accounts-deploy-from-organizations/10015 | staff posts 2025-07-16/17 |
| S16 | https://vercel.com/docs/plans/hobby | last_updated 2026-09-14 |
| S17 | https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/credit-based-pricing-plans/ | 2026-09-01 |
| S18 | https://docs.netlify.com/manage/accounts-and-billing/billing/resume-paused-projects/ | 2026-09-03 |
| S19 | https://decapcms.org/docs/github-backend/ | n/a |
| S20 / S21 | https://decapcms.org/docs/decap-proxy/ (local backend) | n/a |
| S22 / S22b | https://decapcms.org/docs/editorial-workflows/ ; https://decapcms.org/docs/widgets/relation/ | n/a |
| S23 / S23b | npm metadata for `decap-cms` and `decap-cms-app`; `decap-cms-backend-github@3.9.1` source `src/AuthenticationPage.js` (`auth_scope`) | 3.17.1 / 3.9.1 (2026-10-14) |
| S24 | https://decapcms.org/turbo/ | n/a |
| S25 / S25b | https://decapcms.org/docs/basic-steps/ ; https://decapcms.org/docs/configuration-options/ | n/a |
| S26 | https://decapcms.org/docs/external-oauth-clients/ ; https://decapcms.org/docs/backends-overview/ | n/a |
| S27 / S27b / S27c | https://sveltiacms.app/en/docs/workflows/local ; https://sveltiacms.app/en/docs/backends/github ; https://sveltiacms.app/en/docs/media/internal | n/a |
| S28 | https://sveltiacms.app/en/docs/workflows/editorial | n/a |
| S29 / S29b | https://github.com/sveltia/sveltia-cms-auth (README) ; `src/index.js` (`providerScopes`) | main, read 2026-10-20 |
| S30 | https://github.com/sveltia/sveltia-cms/discussions/957 ; https://github.com/sveltia/sveltia-cms | posted 2026-09-10 |
| S31 | https://tina.io/pricing | n/a |
| S32 | https://tina.io/docs/self-hosted/overview | n/a |
| S33 | https://tina.io/docs/introduction/faq | n/a |
| S34 | https://tina.io/docs/drafts/editorial-workflow/ | n/a |
| S35 | https://tina.io/docs/frameworks/next/app-router | edited 2025-10-21 |
| S36 / S36b | https://pagescms.org/docs/guides/installing/ ; https://pagescms.org/ | v2.x docs |
| S37 | https://pagescms.org/docs/configuration/collaborators/ | n/a |
| S38 | https://pagescms.org/docs/guides/installing/github-app/ | n/a |
| S39 | https://pagescms.org/docs/configuration/fields/reference/ | n/a |
| S40 | https://payloadcms.com/docs/getting-started/what-is-payload | n/a |
| S41 / S41b | https://payloadcms.com/docs/versions/drafts ; secondary reports on Figma's acquisition (cmswire.com and others) | n/a |
| S42 | https://nextjs.org/docs/app/guides/static-exports | lastUpdated 2026-08-09 |
| S43 | https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site (plan availability sentence) | n/a |
| S44 / S44b | https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits ; https://docs.github.com/en/site-policy/github-terms/github-terms-for-additional-products-and-features | n/a |
| S45 | npm registry metadata (https://registry.npmjs.org/<pkg>) for @keystatic/core, @keystatic/next, decap-cms(-app), decap-server, @sveltia/cms, tinacms, @tinacms/cli, sanity, next-sanity, payload, @payloadcms/db-sqlite, next (16.4.2, 2026-10-15), @opennextjs/cloudflare (1.20.12) | as listed |
| S46 | GitHub REST API: repos and contributors for Thinkmill/keystatic, decaporg/decap-cms, sveltia/sveltia-cms, hunvreus/pagescms, tinacms/tinacms, payloadcms/payload | 2026-10-20 |
| S47 / S47b | https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/about-rulesets ; https://docs.github.com/en/repositories/working-with-files/managing-files/adding-a-file-to-a-repository | n/a |
| S48 | https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/incorporating-changes-from-a-pull-request/reverting-a-pull-request | n/a |
| S49 | https://docs.github.com/en/repositories/creating-and-managing-repositories/transferring-a-repository | n/a |
| S50 | https://docs.github.com/en/organizations/managing-organization-settings/transferring-organization-ownership | n/a |
| S51 | https://docs.github.com/en/apps/maintaining-github-apps/transferring-ownership-of-a-github-app | n/a |
| S52 / S52b / S52c | https://docs.github.com/en/organizations/managing-peoples-access-to-your-organization-with-roles/maintaining-ownership-continuity-for-your-organization ; https://docs.github.com/en/education/about-github-education/github-education-for-teachers/about-github-education-for-teachers ; https://docs.github.com/en/organizations/managing-programmatic-access-to-your-organization/limiting-oauth-app-and-github-app-access-requests ; also https://github.com/pricing (Free org: unlimited repos and collaborators, 2,000 Actions minutes, Pages and repository rules for public repos only; Team $4/user/month) | n/a |
| S53 | https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site | n/a |
| S54 | https://developers.cloudflare.com/workers/platform/pricing/ | updated 2026-10-02 |
| S55 | https://developers.cloudflare.com/pages/platform/limits/ | updated 2026-09-05 |
| S56 | https://developers.cloudflare.com/pages/ | updated 2026-08-25 |
| S57 | https://developers.cloudflare.com/pages/configuration/custom-domains/ | updated 2026-04-21 |
| S58 | https://developers.cloudflare.com/pages/configuration/preview-deployments/ | updated 2026-10-12 |
| S59 | https://developers.cloudflare.com/workers/ci-cd/builds/limits-and-pricing/ | updated 2026-05-29 |
| S60 | https://opennext.js.org/cloudflare | n/a |
| S61 | https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/ | updated 2026-08-25 |
| S62 | https://developers.cloudflare.com/workers/configuration/routing/custom-domains/ | updated 2026-09-29 |
| S63 | https://developers.cloudflare.com/workers/configuration/previews/ | updated 2026-09-22 |
| S64 | https://web.berkeley.edu/web-hosting-pantheon/memorandum-understanding-and-terms-service | changelog 2026-08-28; effective through 2027-06-30 |
| S65 / S66 / S67 | https://web.berkeley.edu/berkeley-web-builder ; https://webbuilder.berkeley.edu/ ; https://web.berkeley.edu/ | © 2026 |
| S68 | https://haas.berkeley.edu/mors/research/labs-centers/ | n/a |
| S69 | https://berkeley.service-now.com/kb_view.do?sysparm_article=KB0015380 ("Guidelines for berkeley.edu websites") | v4.0, modified 2026-09-18 |
| S70 | https://oercs.berkeley.edu/policies/campus-policy-library/domain-name-system-dns-service-policy-and-resources | issued 2024-02-01; next review Jan 2029 |
| S71 | https://bobalab.org/ → https://scheduler.bobalab.org/ (HTML meta only; not explored) | 2026-10-20 |
| S72 | https://haas.berkeley.edu/brand-toolkit/contacts-resources/ | n/a |
| S73 | https://brand.berkeley.edu/visual-identity/colors/ | © 2026 |
| S74 | https://haas.berkeley.edu/brand-hub/visual-identity/ | © 2026 |
| S75 | https://brand.berkeley.edu/visual-identity/signature-system/ ; https://brand.berkeley.edu/resources/faq/ | n/a |
| S76 | https://brand.berkeley.edu/visual-identity/logos/ | n/a |
| S77 | https://brand.berkeley.edu/downloads/brand-essentials-toolkit/ | n/a |
| S78 | https://bcbp.berkeley.edu/use-name-policy | no policy date shown |
| S79 | https://brand.berkeley.edu/visual-identity/icons-secondary-marks/ | n/a |
| S80 | https://developers.cloudflare.com/fundamentals/manage-members/ | updated 2026-04-20 |

DNS and GitHub-name facts come from direct lookups on 2026-10-20 (`nslookup` via 1.1.1.1; `api.github.com/users/<name>`):
- NXDOMAIN for bobalab.berkeley.edu and bobalab.haas.berkeley.edu.
- bobalab.org's nameservers are on Cloudflare.
- cmr.berkeley.edu points to netlify.app; newsroom.haas.berkeley.edu points to wpeproxy.com.
- The GitHub name `bobalab` is taken; `bobalab-berkeley` is free.

---

## Verification (adversarial)

An independent pass checked these claims on 2026-10-20. Every row was re-read from its primary source that day, not taken from the report. Raw captures are in `research/raw/r4-verify/`: npm metadata, policy HTML, package tarballs and GitHub API JSON.

Method note: two quick page summaries misreported GitHub's plan-availability text. So every row that matters was checked against the raw HTML with grep, not against a summary.

**Status key**
- **CONFIRMED**: the primary source says it today.
- **REFUTED**: the primary source says something different. The correct fact is given.
- **PARTLY REFUTED**: the core holds, but a detail is wrong.
- **UNVERIFIABLE**: no primary source is available.

### Claim table

| # | Claim in the report (section) | Status | What the primary source says today | Source |
|---|---|---|---|---|
| V1 | `decap-cms` and `decap-cms-app` 3.17.1 (2026-10-14), `decap-cms-backend-github` 3.9.1, `decap-server` 3.11.5, all MIT (§3.1) | CONFIRMED | npm `latest` tags and publish times match. Recent releases: 3.16.1 (09-08), 3.16.2 (09-10), 3.16.3 (09-22), and 3.17.0/3.17.1 (10-14). So "monthly" slightly understates the pace. The vendorable bundle `dist/decap-cms.js` at 3.17.1 resolves (HTTP 200). | https://registry.npmjs.org/decap-cms ; https://unpkg.com/decap-cms@3.17.1/dist/decap-cms.js |
| V2 | Decap's local proxy does not support editorial workflow; `local_backend` is "currently in beta" (§1, §3.1) | CONFIRMED | The proxy page says `editorial_workflow` "is not supported in this environment". The configuration page links `local_backend` to "currently in beta". The proxy runs with `npx decap-server`. | https://decapcms.org/docs/decap-proxy/ ; https://decapcms.org/docs/configuration-options/ |
| V3 | The GitHub backend needs an auth server; every editor needs push access; Git LFS is not supported (§3.1) | CONFIRMED | The GitHub backend page states all three. | https://decapcms.org/docs/github-backend/ |
| V4 | Decap has `backend.auth_scope`; the default is `repo`, and it can be set to `public_repo` (§3.1) | CONFIRMED, with a nuance | In `AuthenticationPage.js` (3.9.1), the scope is `auth_scope` if set. Otherwise it is `public_repo` when `open_authoring` is on, else `repo`. It is sent to the auth endpoint as `&scope=`. | `decap-cms-backend-github@3.9.1` and `decap-cms-lib-auth@3.3.3` tarballs (npm) |
| V5 | Decap lists 21 external OAuth clients, all "community-maintained" (§3.1, risk 12) | CONFIRMED | 21 are listed. Note: `sveltia-cms-auth` is **not** on Decap's list. | https://decapcms.org/docs/external-oauth-clients/ |
| V6 | `sveltia-cms-auth` should work with Decap; the report labels this HYPOTHESIS (§0, §3.2) | CONFIRMED; upgrade to DOCUMENTED | The worker's README says it is compatible with Netlify CMS (now Decap CMS).<br><br>The source uses Decap's handshake. The popup posts `authorizing:github`, then sends `authorization:github:success:{...}` to the opener's origin. `decap-cms-lib-auth` listens for exactly that message.<br><br>Other details: env vars `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` and `ALLOWED_DOMAINS`; callback at `<worker>/callback`; default scope `repo,user`; allowed scopes include `public_repo`. `src/index.js` is 437 lines.<br><br>Still smoke-test at hookup. | https://github.com/sveltia/sveltia-cms-auth (README and `src/index.js`, main branch) |
| V7 | Decap Turbo: Free is 1 site and 1 seat; Pro is €19/month for 5 seats (§3.1) | CONFIRMED | Pro is €19/month and includes 1 site and 5 seats. An extra seat costs €6; an extra site costs €10. | https://decapcms.org/turbo/ |
| V8 | `@sveltia/cms` 0.249.1 (2026-10-20), MIT; 5 releases from 10-17 to 10-20; one npm maintainer; about 99% of commits by one person; a post dated 2026-09-10 says it is "built by a single maintainer" (§2, §3.2) | CONFIRMED | The 5 releases are 0.247.0, 0.248.0, 0.248.1, 0.249.0 and 0.249.1. The only npm maintainer is `kyoshino`. The top contributor has 99.2% of first-page contributions. The maintainer opened discussion #957 on 2026-09-10. | https://registry.npmjs.org/@sveltia/cms ; GitHub REST API (repos and contributors); https://github.com/sveltia/sveltia-cms/discussions/957 |
| V9 | Sveltia's local mode is Chromium-only, and `decap-server` and `local_backend` are ignored (§3.2) | CONFIRMED | It relies on the File System Access API. It does not work in Firefox or Safari, and Brave needs a flag. | https://sveltiacms.app/en/docs/workflows/local |
| V10 | Sveltia's editorial workflow needs auto-merge on GitHub and waits up to 1 hour for required checks (§3.2, §8 B5) | CONFIRMED, with a missing caveat | It waits **only when checks are the sole blocker**. It does not wait for a required review or a conflict. If the PI turns on 1 required approval (open question 2), Sveltia's Publish fails until someone approves on github.com. | https://sveltiacms.app/en/docs/workflows/editorial |
| V11 | Next.js static export does not support ISR, proxy/middleware, cookies, redirects, headers, default image optimization, Draft Mode or Server Actions. It does support Server Components and GET route handlers (§3.1, risk 8) | CONFIRMED, but the list is incomplete | Also unsupported:<br>- dynamic routes with `dynamicParams: true`;<br>- dynamic routes without `generateStaticParams()`;<br>- Route Handlers that read the Request;<br>- **rewrites**;<br>- **intercepting routes**.<br><br>GET handlers need `dynamic = 'force-static'`. The page shows lastUpdated 2026-08-09. Next.js links an official GitHub Pages template. | https://nextjs.org/docs/app/guides/static-exports |
| V12 | `next` latest is 16.4.2 (2026-10-15) (§12 S45) | CONFIRMED | 16.4.2 is also the version installed in `bobalab-website/`, alongside React 19.3.0. | https://registry.npmjs.org/next |
| V13 | Peer dependencies: `@keystatic/next` 5.0.5 needs `next >=14`; `next-sanity` 13.3.4 needs `next ^16` (§3.3, §3.5) | CONFIRMED | `@keystatic/next` needs `next >=14` and `react ^18.2.0 \|\| ^19.0.0`, so it fits Next 16.4.2 with React 19.3.0. `next-sanity` needs `next ^16.0.0-0` and `react ^19.2.3`.<br><br>Two more that the report does not mention:<br>- `@opennextjs/cloudflare` 1.20.12 needs `next >=15.5.28 <16 \|\| >=16.4.1`, and 16.4.2 fits.<br>- `decap-cms-app` needs `react ^19.1.0`. This matters only if Decap is installed from npm instead of vendoring the bundle. | npm registry metadata for each package |
| V14 | `@keystatic/next` went from 5.0.4 (2025-02-26) to 5.0.5 (2026-08-18); `@keystatic/core` 0.6.9 is from 2026-08-26 (§2, §3.3) | CONFIRMED | The dates match npm's `time` field. | https://registry.npmjs.org/@keystatic/next ; https://registry.npmjs.org/@keystatic/core |
| V15 | Keystatic's GitHub mode needs a Node host, users need write access, and the deploy docs say "Coming soon" (§2, §3.3) | CONFIRMED | The page says the host must be able to run Node and collaborators need write access. The deploy section is marked "Coming soon". | https://keystatic.com/docs/github-mode |
| V16 | Keystatic Cloud: Free allows up to 3 users per team; Pro starts at $10/month, plus $5/month per user beyond 3 (§3.3) | CONFIRMED | As stated. The report's figure of $60/month for 13 users is its own arithmetic ($10 + 10 × $5), and it is correct. | https://keystatic.com/docs/cloud |
| V17 | Tina: Free has 2 users; Team is $24 per project per month (3 users, up to 10); Team Plus $41; Business $249; editorial workflow is on select paid plans (§3.4) | PARTLY REFUTED | The quoted prices are the **annual-billing** rates. Billed monthly, Team is **$29**, Team Plus **$49** and Business **$299** per project per month. Billed yearly, they are $290, $490 and $2,990.<br><br>Confirmed: Free has 2 users and 2 roles, and editorial workflow is "available on select paid plans".<br><br>No effect on the decision; Tina stays excluded. | https://tina.io/pricing ; https://tina.io/docs/drafts/editorial-workflow/ |
| V18 | Sanity needs an account and project even for local dev. Free has 20 seats with only the Administrator and Viewer roles. Growth is $15 per seat. Free keeps 3 days of history (§1, §3.5) | CONFIRMED | Prerequisites list a Sanity account and project. Free has 20 seats and no more can be added; Viewer seats are free. Drafts history is 3 days on Free, 90 on Growth and 365 on Enterprise. | https://www.sanity.io/docs/nextjs/embedding-sanity-studio-in-nextjs ; https://www.sanity.io/pricing ; https://www.sanity.io/docs/user-guides/history-experience |
| V19 | GitHub Pages works for public repos on GitHub Free orgs; private repos need Pro, Team or Enterprise (§4) | CONFIRMED | Pages is available for public repos on Free and Free for organizations. It is available for public and private repos on Pro, Team, Enterprise Cloud and Enterprise Server. | https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site |
| V20 | GitHub Pages limits: 1 GB site, 1 GB recommended repo, 100 GB/month soft bandwidth, a 10 builds/hour soft limit that does not apply to custom Actions workflows, and a 10-minute deploy timeout. It is not for an online business, e-commerce or SaaS (§4, risk 5) | CONFIRMED | All figures and the prohibited-use wording match. | https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits |
| V21 | Rulesets are free on public repos. GitHub Free orgs get repository rules for public repos. Team costs $4 per user per month. Teachers can apply for free GitHub Team (§1, §8, risk 3) | CONFIRMED | Rulesets cover public repos on Free and Free for organizations, and public and private repos on Pro, Team and Enterprise Cloud. The pricing page shows Team at $4 per user per month and 2,000 Actions minutes on Free. The Education page invites teachers to "Apply for free GitHub Team". | https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/about-rulesets ; https://github.com/pricing ; https://docs.github.com/en/education/about-github-education/github-education-for-teachers/about-github-education-for-teachers |
| V22 | An org site served at the root needs a repo named `<org>.github.io`; the report labels this HYPOTHESIS (§5.2, §8 D1) | CONFIRMED; upgrade to DOCUMENTED | User and organization sites must live in a repo named `<owner>.github.io`. For a custom domain, the CNAME points to `<user>.github.io`, and GitHub recommends verifying the domain first. | https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages ; https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site |
| V23 | Cloudflare Workers Free: 100k requests/day, 10 ms CPU, and static-asset requests are free and unlimited (§3.1, §4) | CONFIRMED | The pricing page was updated 2026-10-02 and the limits page 2026-10-12. | https://developers.cloudflare.com/workers/platform/pricing/ ; https://developers.cloudflare.com/workers/platform/limits/ |
| V24 | "Free Worker size is 3 MiB compressed" (§4, §8 F2) | **REFUTED** | Cloudflare's own limits page (updated 2026-10-12) gives a Worker size of **64 MiB uncompressed on both Free and Paid**. It adds that "There is no compressed size limit." The OpenNext page the report cited still says 3 MiB / 10 MiB, which is out of date. Drop the bundle-size caveat from the Keystatic-on-Workers spike. | https://developers.cloudflare.com/workers/platform/limits/ (contradicts https://opennext.js.org/cloudflare) |
| V25 | Cloudflare Pages and Workers facts (§4):<br>- Pages Free: 500 builds/month, 1 concurrent build, 20k files, 25 MiB per file, 100 custom domains.<br>- Previews are public by default; "Enable access policy" restricts them.<br>- Cloudflare says "Start new projects with Workers".<br>- Workers Custom Domains fail on an existing CNAME or a zone you do not own.<br>- Pages can serve a subdomain via CNAME without moving the zone. | CONFIRMED | All are on the cited pages. The Pages limits page was updated 2026-09-05 and the preview page 2026-10-12. Workers Builds' 3,000 minutes/month and 20-minute timeout are also confirmed. | https://developers.cloudflare.com/pages/platform/limits/ ; https://developers.cloudflare.com/pages/configuration/preview-deployments/ ; https://developers.cloudflare.com/pages/ ; https://developers.cloudflare.com/workers/configuration/routing/custom-domains/ ; https://developers.cloudflare.com/pages/configuration/custom-domains/ |
| V26 | Vercel facts (§0, §4):<br>- Hobby is for non-commercial personal use only.<br>- Commercial use includes a paid employee or consultant writing the code.<br>- "Collaboration has never been permitted on Hobby plans".<br>- Only the owner's commits deploy.<br>- Pro is $20 per developer seat, and viewer seats are free. | CONFIRMED | All are present. The KB also says that for a private repo on a team, the person pushing must be a team member. | https://vercel.com/docs/limits/fair-use-guidelines ; https://vercel.com/kb/guide/why-aren-t-commits-triggering-deployments-on-vercel ; https://vercel.com/docs/plans/hobby ; https://vercel.com/pricing |
| V27 | Netlify facts (§0, §4):<br>- Free has 300 credits with a hard limit.<br>- A production deploy costs 15 credits; bandwidth costs 20 credits per GB; requests cost 2 credits per 10k.<br>- Previews are unmetered.<br>- When credits run out, all projects pause until the next cycle.<br>- Org-owned private repos are not on Free, and Free has 1 Team Owner.<br>- Personal is $9 for 1,000 credits; Pro starts at $20. | CONFIRMED | The credits page says "Last updated: Sep 1, 2026". Paused sites show "Site not available". | https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/credit-based-pricing-plans/ ; https://docs.netlify.com/manage/accounts-and-billing/billing/resume-paused-projects/ ; https://www.netlify.com/pricing/ |
| V28 | Berkeley KB0015380 (v4.0, modified 2026-09-18) (§5.1):<br>- Offsite hosting needs ISO approval.<br>- The Security Contact registers the hostname in Socreg.<br>- A Resource Proprietor is named, and the site needs a privacy statement.<br>- Its example: Pantheon is approved for P1 only.<br>- Top-level names go to the Domain Approval committee.<br>- No third-party ads or tracking analytics.<br>- No-code hosts (Squarespace, Weebly, Wix, Webflow) are not suitable.<br>- Siteimprove is required. | CONFIRMED | All items are present. The revision history shows 2026-05-06, 2026-08-17 and 2026-09-18. | https://berkeley.service-now.com/kb_view.do?sysparm_article=KB0015380 |
| V29 | DNS Service Policy (issued 2024-02-01, next review Jan 2029) (§5):<br>- Records pointing off campus are allowed only by exception, reviewed by the DNS Policy Committee.<br>- They must comply with the IT Accessibility, Campus Online Activities and IS-3 policies.<br>- Domains outside berkeley.edu need Communications and Public Affairs approval. | CONFIRMED | All are present. The "admin update on 2026-09-22" that §5.1 mentions does not appear on the page, so it is UNVERIFIABLE. It does not affect the decision. | https://oercs.berkeley.edu/policies/campus-policy-library/domain-name-system-dns-service-policy-and-resources |
| V30 | DNS and account names (§4, §5, §8 A1):<br>- `bobalab.berkeley.edu` and `bobalab.haas.berkeley.edu` return NXDOMAIN.<br>- `cmr.berkeley.edu` is a CNAME to a netlify.app site.<br>- `bobalab.org` uses Cloudflare nameservers.<br>- The GitHub name `bobalab` is taken by a personal account from 2020.<br>- `bobalab-berkeley`, `berkeley-bobalab` and `bobalab-haas` are free.<br>- The user `parksinchaisri` exists. | CONFIRMED | Re-run today against 1.1.1.1 and api.github.com. `bobalab` is a User account created 2020-01-07.<br><br>The `parksinchaisri` profile describes itself as the Haas OIT assistant professor and links to `parksinchaisri.github.io` (SELF-REPORTED by the account).<br><br>Names can be claimed at any time, so the org should be created promptly. | nslookup; https://api.github.com/users/<name> |
| V31 | Decap repo health: about 19.4k stars, top contributor about 20%, 532 open issues (§2, §3.1) | CONFIRMED (counts drift) | 19,438 stars. The top contributor has 20.1% of first-page contributions. `open_issues_count` is now 525, and that count includes PRs. | GitHub REST API `repos/decaporg/decap-cms` |
| V32 | Sensitivity check: with UX weight 30 and longevity 0, "Keystatic (~83) and Sveltia (~85) pass Decap" (§2) | **REFUTED** (arithmetic) | Recomputed with the report's own scores: Decap **79**, Sveltia **84**, Keystatic **76**, Payload **79**. Only Sveltia passes Decap; Keystatic does not. The base totals (82/81/73/70/64/64/65/59) recompute correctly. | Report §2 matrix, recomputed |
| V33 | "Even a CMS bug cannot publish straight to the live site," because of the `main` ruleset (§0, §7) | CONFIRMED only with a config fix | Decap's source has a fallback. If the merge API returns HTTP 405, `forceMergePR` builds a commit and **updates `main` directly**. A 405 can come from a pending required check or a disallowed merge method.<br><br>The ruleset blocks this for normal editors. It does **not** block an actor with "Always allow" bypass, and §8 B4 grants bypass to org admins. GitHub offers a "For pull requests only" bypass mode that prevents direct pushes.<br><br>Also, Decap merges with the `merge` method unless `backend.squash_merges: true` is set. | `decap-cms-backend-github@3.9.1` `src/API.ts` (`mergePR`, `forceMergePR`, `mergeMethod`); https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/creating-rulesets-for-a-repository ; https://decapcms.org/docs/editorial-workflows/ |

**Not re-checked.** These carry little decision weight, so they keep the labels the report gave them:
- Payload's version and the Figma acquisition.
- Pages CMS maintenance dates.
- The Berkeley branding rules in §6.
- The Pantheon MOU terms.
- The Haas MarCom contact.

One spot check: Pages CMS's GitHub App does request Contents, Administration and Actions with read and write access (CONFIRMED, https://pagescms.org/docs/guides/installing/github-app/).

### Tally

33 claims were checked:
- **29 CONFIRMED.** 2 of them move from HYPOTHESIS to DOCUMENTED (V6, V22), and 4 gain a caveat (V4, V10, V11, V33).
- **1 PARTLY REFUTED**: Tina prices (V17).
- **2 REFUTED**: the Worker size limit (V24) and the sensitivity arithmetic (V32).
- **1 sub-item UNVERIFIABLE**: the DNS policy's admin-update date (V29).

### Verdict: the recommendation HOLDS, with changes

The primary stack still holds:
- Decap 3.x at `/admin`.
- Content in a public repo in a lab-owned GitHub org.
- Next.js `output: 'export'` on GitHub Pages.
- A `sveltia-cms-auth` Cloudflare Worker for OAuth.
- A ruleset on `main`.

Every fact the recommendation depends on is confirmed:
- Decap's version, editorial workflow and auth-scope behavior.
- The worker's compatibility with Decap, which is now documented rather than inferred.
- GitHub Pages and rulesets on free public org repos, and the Pages limits.
- The reasons for excluding Vercel Hobby and Netlify Free.
- The Berkeley offsite-hosting process.

The two refutations do not change the ranking:
- **Sensitivity check.** The corrected numbers make the primary *more* robust. Keystatic no longer passes Decap even when UX is weighted heavily, and Sveltia remains the natural swap.
- **Worker size limit.** The 64 MiB figure removes one caveat from the Keystatic-on-Workers runner-up. Its other blockers remain:
  - it needs a Node or Workers runtime;
  - its custom domain needs a zone on Cloudflare, so a berkeley.edu CNAME will not work;
  - OpenNext does not guarantee Windows support;
  - its packages are still 0.x.

### Required changes to the report and the build

1. **Ruleset bypass (§8 B4).** Set the org-admin bypass to "For pull requests only", or remove the bypass. Otherwise Decap's `forceMergePR` fallback lets an admin's Publish push straight to `main` and skip `validate-content`.
2. **Merge method (§8 B5, §8 C5).** Make Decap's merge method match the repo settings:
   - Either keep merge commits allowed, or set `backend.squash_merges: true` if the repo allows only squash merges.
   - Do not enable "Require linear history" unless `squash_merges` is on.

   Otherwise every Publish gets a 405 and then fails against the ruleset.
3. **Publish timing.** Tell editors that Decap's Publish fails while `validate-content` is still running, so they should wait for the green check. With a 1-approval rule, someone must approve on github.com first. Sveltia behaves the same way, because it waits for checks but not reviews (V10).
4. **Static-export constraints (§3.1, risk 8).** Add the missing items:
   - Every pearl or research-direction detail route must use `generateStaticParams()` with `dynamicParams = false`.
   - A "click a pearl" overlay must use client state or a normal route, **not** an intercepting route.
   - Rewrites are not available.
5. **Cloudflare Worker size (§4, §8 F2).** Replace "3 MiB compressed" with "64 MiB uncompressed, no compressed limit (Cloudflare limits page, updated 2026-10-12)". Drop the bundle-size item from the spike.
6. **Sensitivity sentence (§2).** Change it to: Decap 79, Sveltia 84, Keystatic 76, Payload 79; only Sveltia passes Decap.
7. **TinaCMS prices (§3.4).** Restate them as $29, $49 and $299 per project per month billed monthly, or $24, $41 and $249 per month billed annually.
8. **Relabel two claims as DOCUMENTED** (they were HYPOTHESIS):
   - that `sveltia-cms-auth` works with Decap (§0, §3.2);
   - that the root site needs a repo named `<org>.github.io` (§5.2, §8 D1).

   `sveltia-cms-auth` is not on Decap's own OAuth-client list, so keep the smoke test at hookup.
