# Handover: who owns what, and how to keep the site running

For the PI, the co-owner and whoever maintains the site next. It covers R4 §9 and brief §F5: the owners, where each secret lives, the per-term editor routine, the scheduled rebuild, reverting, bumping Decap and Node, and campus contacts. First-time setup is `docs/SETUP-PRODUCTION.md`; editing content is `docs/EDITING.md`.

Labels: **DOCUMENTED** (primary source; R4/brief row given), **HYPOTHESIS**, **UNKNOWN**.

## 1. How the site works, in one paragraph

Content is Markdown/YAML in `content/` in one GitHub repository. Editors change it through Decap CMS at `/admin/`, which signs them in through a small Cloudflare Worker and saves every change as a pull request. CI checks the PR (`.github/workflows/ci.yml`); merging it ("Publish") triggers `deploy.yml`, which builds a static site with Next.js on Linux and publishes it to GitHub Pages. Nothing runs on a server except the sign-in Worker. There are no cookies, no analytics and no third-party requests.

## 2. Owners (fill in the names before launch)

| Asset                                                             | Owner of record                                      | Second admin                  | Where it is managed       | How it transfers                                                                                                                  |
| ----------------------------------------------------------------- | ---------------------------------------------------- | ----------------------------- | ------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| GitHub organization `<ORG>`, the repository, the OAuth App        | PI: ______                                           | Co-owner: ______              | github.com → Org settings | Org ownership: add the new owner, then remove the old one; OAuth App: Developer settings → Transfer ownership (DOCUMENTED, R4 §9) |
| Cloudflare account (sign-in Worker; optional DNS for bobalab.org) | Lab email: ______                                    | PI plus one member: ______    | dash.cloudflare.com       | Account members (DOCUMENTED, R4 §9)                                                                                               |
| Domain `<HOST>`                                                   | Campus DNS / Socreg record (Resource Proprietor: PI) | Haas Security Contact: ______ | Socreg                    | Update the Socreg record owner                                                                                                    |
| `bobalab.org` (only if adopted)                                   | Lab registrar account: ______                        | Second admin: ______          | Registrar / Cloudflare    | Registrar transfer                                                                                                                |
| Secrets (section 3)                                               | PI's password manager                                | Co-owner: ______              | —                         | Rotate on every handover                                                                                                          |
| Teams `web-maintainers` / `web-editors`                           | PI                                                   | Co-owner                      | Org → Teams               | —                                                                                                                                 |

Keep at least **two** org owners at all times (DOCUMENTED, R4 §8 A2). A pull request author cannot approve their own PR (DOCUMENTED, GH-SELF), so with the review gate on, keep at least two people in `web-maintainers`.

## 3. Secrets and records: where each one lives

| Item                                                                            | Lives in                                                                          | Notes                                                                   |
| ------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| GitHub OAuth App **client secret**                                              | Cloudflare Worker secret `GITHUB_CLIENT_SECRET` **and** the PI's password manager | Never in the repository. Rotate yearly (below)                          |
| GitHub OAuth App client ID                                                      | Worker variable `GITHUB_CLIENT_ID`                                                | Not secret                                                              |
| Worker `ALLOWED_DOMAINS`                                                        | Worker variable                                                                   | `<ORG>.github.io,<HOST>`                                                |
| Fork of `sveltia-cms-auth`                                                      | `<ORG>/sveltia-cms-auth`, reviewed commit: ______                                 | Re-review the diff before pulling upstream changes                      |
| Cloudflare login                                                                | PI's password manager (lab email)                                                 | 2FA on                                                                  |
| Owners' GitHub 2FA recovery codes                                               | Each owner's own password manager                                                 |                                                                         |
| Editors' GitHub tokens                                                          | Each editor's **browser** (Decap keeps the token in local storage)                | Scope `public_repo`; removing the person from the org cuts their access |
| Repository secrets                                                              | **None.** The workflows use the automatic `GITHUB_TOKEN`                          |                                                                         |
| Repository variables (optional)                                                 | Settings → Secrets and variables → Actions → Variables                            | `SITE_URL`, `BASE_PATH` (not secret)                                    |
| Use-of-Name approval for "Berkeley" (H-12), MarCom replies, Socreg confirmation | ______ (lab shared drive)                                                         | Keep the emails; they are the evidence                                  |

**Yearly secret rotation** (and whenever someone with access leaves):

1. OAuth App → Generate a new client secret (the old one keeps working until you delete it in step 4; HYPOTHESIS, check the page says so).
2. Cloudflare → Worker → Variables and secrets → replace `GITHUB_CLIENT_SECRET` → Deploy.
3. Sign in at `/admin/` to confirm it works.
4. Delete the old secret in the OAuth App. Update the password manager.

## 4. Editors: the per-term routine

At the start of every term (and when anyone leaves):

- [ ] **Add** new editors: they create a GitHub account with 2FA; a maintainer invites them to the org and adds them to `web-editors`; they sign in once at `/admin/`.
- [ ] **Remove** departing RAs from the organization (not only from the team). Removing them ends their repository access, so a token left in their browser stops working (HYPOTHESIS: the OAuth grant itself stays until they revoke it; it no longer reaches the repo).
- [ ] Review Org → People: members, outside collaborators, pending invitations, and the 2FA column.
- [ ] Review `web-maintainers` (at least two people) and `.github/CODEOWNERS`.
- [ ] Check Org → Third-party access still lists only the lab's OAuth App.
- [ ] Check Actions → **Deploy** ran in the last few days (section 5) and that no `Broken external links` issue is waiting.
- [ ] Re-confirm consent for people listed on the site (H-11): `listed`, `photo_consent`, `email_public`, `now_at_public`.
- [ ] Skim Dependabot PRs and merge the green ones (section 9).

Per-person edit rights are not possible: everyone in `web-editors` can edit every collection (brief critic list). The review gate (H-6) is the control.

## 5. Deploys, the daily rebuild, and the 60-day trap

- **Push to `main`** (every Publish) → `deploy.yml` → live in a few minutes. Measured Publish-to-live time: ______ (UNKNOWN until the first smoke test).
- **Daily rebuild at 11:17 UTC** (04:17 in Berkeley in summer). The site is static, so states that depend on today's date (upcoming talks, alumni by `end` date) change only when it is rebuilt. The rebuild is a full build; there is no ISR in a static export (DOCUMENTED, N-EXP via brief §F4). The minute is deliberately not :00, when GitHub delays or drops scheduled runs (DOCUMENTED, GH-SCHED).
- **GitHub disables scheduled workflows in a public repository after 60 days with no repository activity** (DOCUMENTED, GH-SCHED). A quiet summer can therefore freeze "Upcoming" and alumni states, and stop the weekly link check.
  - Notice it: Actions → Deploy shows a banner that the workflow was disabled, and the last run date stops moving.
  - **Re-enable:** Actions → Deploy → **Enable workflow** (and the same for "External links (weekly)"). With the GitHub CLI: `gh workflow enable deploy.yml` and `gh workflow enable links-weekly.yml`. Then **Run workflow** once.
  - Prevent it: any commit counts as activity, so a routine content edit resets the clock (HYPOTHESIS: GitHub counts commits as "repository activity"). Put a reminder in the lab calendar for mid-August.
  - Optional external trigger (brief critic list, HYPOTHESIS): a Cloudflare Worker cron (the lab already has the account) can call `POST /repos/<ORG>/<REPO>/actions/workflows/deploy.yml/dispatches` daily with a fine-grained token limited to Actions: write on this repository. It cannot run a workflow GitHub has already disabled, so it complements the reminder, it does not replace it.
- **Manual deploy:** Actions → Deploy → Run workflow (branch `main`).
- After each deploy the `record-slugs` job updates `content/.published-slugs.json` through a PR from `automation/published-slugs` (DECISIONS D-05). Merge it when green. If it could not open the PR (setting in SETUP §B4), download the `published-slugs` artifact from the run, or run `npm run slugs:record` locally, and commit the file by PR.

## 6. Reverting

- **Normal:** on github.com open the merged PR → **Revert** → this opens a new PR → wait for the checks → merge → the next deploy removes the change (DOCUMENTED, R4 §3.1). Editors need a maintainer for this; Decap itself has no revert button.
- **Emergency** (the live site is broken and a revert PR would take too long): Actions → Deploy → open the last good run → **Re-run all jobs**. A re-run builds the same commit as the original run (DOCUMENTED: re-runs use the original `GITHUB_SHA`). Two limits: GitHub only re-runs workflow runs up to 30 days old (DOCUMENTED, GitHub's "Re-running workflows and jobs" page), and the re-run's `record-slugs` job proposes that older commit's slug list, so close the `automation/published-slugs` PR it opens. The next push to `main` deploys `main` again, so follow up with a proper revert PR.
- Never push to `main` directly. The ruleset allows admins to bypass only through a PR (SETUP §B6).
- **Removing or renaming a published page:** add a `site.yml → redirects` entry (`from: /old/path/`, `to: /new/path/`). The validator demands one when a recorded slug disappears (`E_REDIRECT_MISSING`). Prefer `status: archived` to deleting.

## 7. Bumping Decap CMS

Decap is vendored, not installed: the browser bundle sits in `public/admin/` with its SHA-256, and the pinned version is in **one file**, `cms/decap-cms.lock.json`.

1. Read the Decap release notes between the current and the new version (config or widget changes; `richtext` is still beta).
2. `node scripts/cms/vendor-decap.mjs --version X.Y.Z` (downloads with `npm pack`, verifies the registry integrity, copies `dist/decap-cms.js`, records the SHA-256 and the lock file).
3. `npm run test` (the CMS parity and vendoring tests), then `npx playwright test tests/e2e/cms-local.spec.ts` (it re-measures the Decap work-arounds in `public/admin/cms-widgets.js` and `cms-start.js`: list item removal, keyboard reordering, the stale-editor reload), then `npm run cms:local` and try an edit.
4. Open a PR; after merging, repeat the SETUP §C6 smoke test on the live `/admin/`.

`node scripts/cms/vendor-decap.mjs --check` re-verifies the vendored file at any time. Re-evaluate Sveltia CMS (same config and files) around April 2027 (decision H-7).

## 8. Node.js version

- The version lives in `.nvmrc` (now `24.19.0`) and `package.json → engines` (`>=24.15 <25`, enforced by `.npmrc engine-strict`). All three workflows read `.nvmrc`.
- Node 24 is an LTS line (brief §F1). Bump the patch version by editing `.nvmrc` in a PR. Moving to the next LTS major means changing `.nvmrc` and `engines` together, running `npm ci` and the full suite, and checking that Next.js supports that Node major.

## 9. Dependencies

- Versions are pinned exactly (`.npmrc save-exact`); CI uses `npm ci`. `npm ci` prints exactly three `ERESOLVE overriding peer dependency` warnings (ESLint 10 vs eslint-config-next); that is expected. Do not use `--legacy-peer-deps`.
- **Security floor: never deploy `next` below 16.4.1** (brief §F1).
- Dependabot (`.github/dependabot.yml`) opens grouped PRs on Mondays for npm packages and for the SHA-pinned actions. Majors of Next, React, TypeScript (≥ 6.1) and `@types/node` are ignored on purpose: Next 17 makes Cache Components the default (H-13, revisit then), and `typescript-eslint` needs TypeScript < 6.1.
- A Dependabot PR is safe to merge when all CI jobs are green.

## 10. Quality gates (what CI checks)

| Job (`ci.yml`)                | What                                                                                                                                                                                                                                                                                                                                                                                                                                        | Run it locally                                                                                                       |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `validate-content` (required) | Content schemas, relations, consent, limits; upload types and sizes                                                                                                                                                                                                                                                                                                                                                                         | `npm run validate`; `node scripts/perf/asset-budget.mjs uploads`                                                     |
| `lint-typecheck`              | ESLint; `next typegen` + `tsc --noEmit`                                                                                                                                                                                                                                                                                                                                                                                                     | `npm run lint`; `npm run typecheck`                                                                                  |
| `unit`                        | Vitest unit tests                                                                                                                                                                                                                                                                                                                                                                                                                           | `npm run test`                                                                                                       |
| `build`                       | Preview and production exports on Linux, from a full (blobless) checkout so each direction page's "Last updated" is its own content's last commit, not HEAD's; `scripts/perf/export-check.mjs` (404.html, `/admin/`, sitemap, robots; no draft, unlisted or profile-less person's URL anywhere in `out/`, including RSC payloads, JSON-LD and the RSS feed; every sitemap URL is a real page, not a not-found page; no Windows-style files) | `npm run build && node scripts/perf/export-check.mjs`                                                                |
| `e2e`                         | Playwright (Chromium + WebKit) on the preview export: every package's specs plus no-JS, reduced motion / forced colours, zero off-origin requests. `kit.spec.ts` runs here with its kit-page checks skipped (the export has no `/kit/`; run them locally against `next dev` with `NEXT_PUBLIC_KIT=1`). Only `cms-local.spec.ts` is local-only (it needs `next dev` + decap-server). `a11y-sitewide.spec.ts` runs in the `a11y` job          | `npm run build:preview && npm run serve:out`, then `E2E_STATIC=1 BASE_URL=http://127.0.0.1:4173 npx playwright test` |
| `a11y`                        | axe on every page, light and dark, figure and list modes (the spec checks the figure really is in each mode); no sideways scrolling at 320 px (WCAG 1.4.10)                                                                                                                                                                                                                                                                                 | `… npx playwright test tests/e2e/a11y-sitewide.spec.ts`                                                              |
| `links`                       | Internal links and `#fragments` (linkinator) on both exports                                                                                                                                                                                                                                                                                                                                                                                | `npx linkinator http://127.0.0.1:4173/ --config linkinator.config.json`                                              |
| `budgets`                     | JS per page (B + 8/30/10 KB), fonts ≤ 100 KiB, home ≤ 350 KB, headshots ≤ 40 KB, every `<img>` with explicit width and height                                                                                                                                                                                                                                                                                                               | `npm run perf`; `node scripts/perf/asset-budget.mjs out`                                                             |

- **Full history for builds.** Each direction page's "Last updated" date is the newest commit that touched its own content files (`git log -1 -- <files>`, §D5.11). A shallow clone (`actions/checkout`'s default `fetch-depth: 1`) makes HEAD look like it added every file, so every direction page would show the date of the last commit of any kind. The `build` jobs in `deploy.yml` and `ci.yml` therefore check out with `fetch-depth: 0` and `filter: blob:none` (commits and trees only, still fast), and `deploy.yml` fails before building if the checkout is shallow. Keep both settings if you edit the workflows or move the build to another host; `tests/unit/wp8/workflows.test.ts` checks them.
- **The `record-slugs` job holds the only write-scoped token.** Its checkout sets `persist-credentials: false`, and it installs with `npm ci --ignore-scripts --omit=dev` because the slug script needs only `yaml`. The token goes to `git push` in the URL of the one step that pushes, so no dependency install script can read a stored token. `tests/unit/wp8/workflows.test.ts` checks this too.
- **JS baseline B** is in `docs/PERF-BASELINE.md` (measured on Windows). The `budgets` job prints the JS of the empty route on Linux and warns ("JS baseline drift") when it differs from B by more than 1 KB; then re-measure and update PERF-BASELINE.md by PR.
- Lighthouse is a pre-launch manual step: `node scripts/perf/lighthouse.mjs` (see `docs/QA-CHECKLIST.md` §6, including what to do while every direction is still a draft).

## 11. Windows notes (local builds only)

- The deployable site is always built by CI on Linux. A Windows `next build` writes the App Router's prefetch files into folders such as `out/kit/__next.kit/__PAGE__.txt` instead of `out/kit/__next.kit.__PAGE__.txt`, so client navigations get 404s and fall back to slower loads (MEASURED 2026-10-20 with Next 16.4.2; Next issue #85374; DECISIONS D-07). `npm run build` repairs this automatically on Windows (`scripts/fix-win-export.mjs`). Never upload a Windows-built `out/` by hand.
- The working tree may live in OneDrive (DECISIONS D-01). Never run two `next dev` / `next build` processes in it at once.

## 12. Campus and outside contacts

| For                                                                                                    | Contact                                                                       |
| ------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------- |
| Hostname, Socreg, offsite hosting                                                                      | Haas departmental Security Contact: ______ (ISO can identify them; KB0015380) |
| Siteimprove scanning, accessibility questions, PDFs (WCAG 2.1 AA for documents by 2027-04-26, UCB-DAP) | Digital Accessibility Program, dap.berkeley.edu                               |
| Brand, logos, lockups                                                                                  | Haas MarCom, `brand@haas.berkeley.edu` (R4 §6)                                |
| Use of "Berkeley" in the lab name                                                                      | Haas dean's office or the OITM area chair: ______                             |
| A domain outside berkeley.edu (e.g. bobalab.org)                                                       | Office of Communications and Public Affairs (R4 V29)                          |
| Site issues from visitors                                                                              | The footer "Site issue?" link goes to the lab email                           |

## 13. Why not move the site to Vercel Hobby or Netlify Free

- **Vercel Hobby** is for non-commercial personal use only, and only the owner's commits deploy (DOCUMENTED, R4 V26). A lab site is institutional and RAs commit through the CMS, so their changes would not deploy.
- **Netlify Free** pauses every site when the monthly credits run out (DOCUMENTED, R4 V27); about twenty production deploys a month would exhaust it.
- GitHub Pages is free for a public repo, needs no server, and has a 1 GB site / 100 GB-per-month soft bandwidth limit (DOCUMENTED, R4 V20). If the lab needs full-site draft previews or response headers (for example `frame-ancestors` for `/admin/`, which a `<meta>` CSP cannot set), Cloudflare Pages is the documented alternative (brief §F5, §G4).

## 14. Known limits

- Drafts and history are publicly readable on github.com in a public repo (D-06). Keep embargoed and personal data out of drafts.
- `/admin/` cannot get header-based clickjacking protection on GitHub Pages (`frame-ancestors` needs a header; brief §G4). `cms-start.js` therefore refuses to run inside a frame (a script guard; it does not protect against a browser with scripts off, where the CMS does not run anyway).
- The first CMS save of a content file re-writes it in Decap's YAML style (lines folded at 80 characters, date quotes dropped, keys in the editor's order, empty `social: {}` removed), so that pull request shows formatting-only lines next to the real change. Later saves of the same file show only the edit. Review with "Hide whitespace" off and read the changed values, or ask for the formatting to be split out.
- The in-CMS preview is an approximation; there is no deployed staging site (brief critic list).
- Decap's own admin interface accessibility: UNKNOWN.
- Revert needs github.com; Decap has no revert.
