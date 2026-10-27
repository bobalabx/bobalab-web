# Production setup (done once by the lab)

This is the hookup checklist for the live site: GitHub organization and repository, Actions and Pages, the `protect-main` ruleset, the CMS sign-in bridge, the domain and the campus approvals. It reproduces R4 §8 (`docs/research/R4-cms-hosting.md`), **updated for editor v2** ("Save goes live", DECISIONS D-17): every Save in the content manager is a commit straight to `main`, so the `protect-main` ruleset only blocks force pushes and deletions, and must never require a pull request. Section H is the owner's release checklist for editor v2.

The builder cannot do these steps: they need the lab's accounts. Budget about half a day plus the campus waiting time.

Labels: **DOCUMENTED** (a primary source says so; the R4/brief row is given), **HYPOTHESIS** (our inference: check it when you get there), **UNKNOWN**.

| Placeholder | Meaning                       | Default in this repo                                    |
| ----------- | ----------------------------- | ------------------------------------------------------- |
| `<ORG>`     | the lab's GitHub organization | `bobalab-berkeley` (free on 2026-10-20, R4 V30)         |
| `<REPO>`    | the repository                | `<ORG>.github.io` (serves the site at the root, R4 V22) |
| `<HOST>`    | the final hostname            | `<ORG>.github.io` until the campus name is live         |
| `<WORKER>`  | the OAuth bridge              | `bobalab-cms-auth.<your-subdomain>.workers.dev`         |

Do the sections in order. Section G is the launch gate.

---

## A. Accounts and ownership (PI, about 30 minutes)

1. **PI's GitHub account.** Use the existing account and turn on two-factor authentication (2FA). Store the recovery codes in the PI's password manager.
2. **Create the organization `<ORG>` on the Free plan.** Add a **second Owner** (co-PI, lab manager or a Haas staff member). GitHub recommends at least two owners (DOCUMENTED, R4 §8 A2). Write both names in `docs/HANDOVER.md` §2.
3. **Org → Settings → Authentication security:** require 2FA for everyone in the organization.
4. **Org → Settings → Member privileges:** base permission **Read** (or **No permission**). Repository creation: owners only.
5. **Org → Settings → Third-party access:** keep the OAuth App access policy **restricted**. Only the lab's own OAuth App (step C1) is approved. Restrict GitHub App installation to owners (DOCUMENTED capability, R4 §8 B6).
6. **Optional, decision H-5:** a teacher can apply to GitHub Education for free GitHub Team (DOCUMENTED, R4 V21). Team allows a **private** repository with Pages and rulesets. Choose this if drafts must not be publicly readable on github.com.
7. **Lab-controlled email.** Non-GitHub accounts (Cloudflare, any registrar) are owned by a lab address, not a person. The site prints `bobalab@berkeley.edu`; **confirm it is a monitored mailbox with at least two owners** before using it (open item in the brief's critic list). Record the credentials in the PI's password manager.

## B. Repository, Actions, Pages and the `protect-main` ruleset

**Before the first push, decide H-5 (public repo?) and H-11 (roster consent).** In a public repo every draft, branch and commit is readable on github.com even though the site never renders drafts (DECISIONS D-06). Nothing embargoed or personal goes into drafts.

1. **Create the repository `<ORG>/<REPO>`** (public unless H-5 chose private). Do not add a README or licence on github.com. From the builder's checkout:

   ```sh
   git remote add origin https://github.com/<ORG>/<REPO>.git
   git push -u origin main
   ```

   If the repository gets another name, also change `backend.repo` in `cms/source.mjs` (step C5).

   The push starts the **Deploy** workflow at once. That first run fails at "configure-pages" because Pages is not switched on until step 5; this is expected. Step 8 runs it again.

2. **Teams** (Org → Teams):
   - `web-editors`: **Write** on `<REPO>`. RAs and editors.
   - `web-maintainers`: **Maintain** on `<REPO>`. The PI and whoever reviews and fixes the build.
   - `.github/CODEOWNERS` requests reviews from `@<ORG>/web-maintainers`. Rename it there if the org or team name differs.

3. **Settings → General → Pull Requests** (maintainers' pull requests only; the content manager no longer opens or merges pull requests, D-17):
   - Allow **squash merging** (recommended for a tidy history); the other methods are up to the maintainers.
   - Tick "Automatically delete head branches".
   - Leave auto-merge off.

4. **Settings → Actions → General:**
   - Actions permissions: allow actions by GitHub (`actions/*`) and the one third-party action `lycheeverse/lychee-action`. If the page offers "Require actions to be pinned to a full-length commit SHA", turn it on; the workflows already pin every action by SHA (brief §G4).
   - Workflow permissions: **Read repository contents and packages permissions** (the workflows ask for more per job where they need it).
   - "Allow GitHub Actions to create and approve pull requests": see the trade-off below, then decide.

   > **Trade-off (HYPOTHESIS, our analysis).** After each deploy, `deploy.yml` records the published slugs (DECISIONS D-05) and opens a PR from `automation/published-slugs`. That needs this box ticked. The same box also lets a workflow _approve_ PRs; no rule on `main` relies on approvals any more (step 6), so the risk is small. If you leave the box unticked, the deploy still succeeds; the job warns and attaches `.published-slugs.json` to the run, and a maintainer commits it by PR now and then (`npm run slugs:record`). **Merge the first such PR only after editor v2 is live** (section H).

5. **Settings → Pages → Build and deployment → Source: GitHub Actions** (R4 §8 B3). This creates the `github-pages` environment. Open Settings → Environments → `github-pages` and check that deployment branches are limited to `main`.

6. **Settings → Rules → Rulesets → New branch ruleset `protect-main`** (editor v2, DECISIONS D-17; owner action after launch). Every Save in the content manager is a commit straight to `main`, so the ruleset protects only against losing history:

   | Setting                               | Value                      | Why                                                                                                                                                                                                |
   | ------------------------------------- | -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
   | Enforcement                           | Active                     |                                                                                                                                                                                                    |
   | Target branches                       | Default branch (`main`)    |                                                                                                                                                                                                    |
   | Bypass list                           | Empty                      | Lift the ruleset only for a planned history rewrite (HANDOVER §6, "revert is not erasure")                                                                                                         |
   | **Block force pushes**                | **On**                     | Keeps every saved version, so History and Restore always work                                                                                                                                      |
   | **Restrict deletions**                | **On**                     | `main` cannot be deleted                                                                                                                                                                           |
   | Require a pull request before merging | **Off. Never turn it on.** | Editors' saves are direct commits: this rule would stop every Save. (The old setup with pull requests and a review gate is gone, D-17.) Maintainers still use pull requests for code by convention |
   | Require status checks to pass         | **Off. Never turn it on.** | A direct commit has no checks yet, so this would also stop every Save. The content manager runs the same validator before each Save, and `deploy.yml` runs it again before building                |
   | Require linear history                | Off (not needed)           | Decap's commits are fast-forwards anyway                                                                                                                                                           |
   | Require signed commits                | Off                        | Decap's API commits are not signed by the editor                                                                                                                                                   |

   Rulesets are free on public repositories (DOCUMENTED, R4 V21). The CI jobs (`validate-content`, `lint-typecheck`, `unit`, `build`, `e2e`, `a11y`, `links`, `budgets`) report on maintainers' pull requests.

7. **Settings → Code security:** turn on Dependabot alerts, Dependabot security updates, and secret scanning with push protection. `.github/dependabot.yml` already schedules weekly version updates for npm and for the pinned actions.

8. **First deploy.** Actions → **Deploy** → Run workflow (branch `main`). The run summary prints the URL it built for. Open `https://<ORG>.github.io/`, then `/sitemap.xml`, `/robots.txt` and a missing page (it must show the site's 404 page).

## C. Sign-in bridge for the CMS (Cloudflare Worker + GitHub OAuth App)

Decap's GitHub backend needs a small OAuth server; GitHub Pages cannot run one (DOCUMENTED, R4 V3). The bridge is a fork of `sveltia-cms-auth` on Cloudflare's free tier; it speaks Decap's sign-in handshake (DOCUMENTED, R4 V6). It is the site's only server-side component, about 440 lines: read it before deploying it.

1. **OAuth App.** Org → Settings → Developer settings → OAuth Apps → New OAuth App:
   - Application name: `BOBALAB website CMS`.
   - Homepage URL: `https://<HOST>/`.
   - Authorization callback URL: `https://<WORKER>/callback`.
   - Generate a client secret and store it in the PI's password manager **now** (GitHub shows it once).
2. **Cloudflare account** with the lab email (A7). Turn on 2FA; add the second admin as a member (DOCUMENTED that accounts can have members; Free-plan role limits UNKNOWN, R4 §8 C2).
3. **Fork `sveltia/sveltia-cms-auth` into `<ORG>`** and note the commit you reviewed in `docs/HANDOVER.md` §3. Deploy it from that commit: Cloudflare → Workers & Pages → Create → Import a repository, or `npx wrangler deploy` inside the fork (Wrangler is not a dependency of this site).
4. **Worker → Settings → Variables and secrets** (DOCUMENTED names, R4 V6):
   - `GITHUB_CLIENT_ID`: the OAuth App's client ID.
   - `GITHUB_CLIENT_SECRET`: the client secret, type **Secret**.
   - `ALLOWED_DOMAINS`: `<ORG>.github.io` now; add `<HOST>` when the campus name is live (comma-separated). This restricts which sites may use the bridge.
   - Deploy, then open `https://<WORKER>/` to confirm it answers.
5. **Point the CMS at the bridge** through a normal PR. Edit `cms/source.mjs` (do not hand-edit `public/admin/config.yml`; it is generated):
   - `backend.base_url: "https://<WORKER>"` (replaces the `REPLACE-ME` placeholder);
   - `backend.repo: "<ORG>/<REPO>"` if it differs;
   - `site_url` / `display_url` if the host differs.

   Run `npm run cms:config` (`node scripts/cms/build-config.mjs`), commit both files, and let CI pass (`tests/unit/cms/config.test.ts` accepts any https origin for `base_url`). `auth_scope: public_repo` stays for a public repo; use `repo` only if the repo goes private (R4 §8 C5). The `/admin/` CSP allows the bridge origin derived from `base_url`. Until this step is done, every deploy warns "the CMS sign-in cannot work yet" (`scripts/cms/check-backend.mjs`); once `site.yml` has `launched: true` that check fails the deploy, so the live `/admin/` never shows a login that cannot work.

   GitHub Pages cannot send `X-Frame-Options` or a `frame-ancestors` header, and browsers ignore `frame-ancestors` in the `<meta>` CSP of `/admin/`. Instead, `public/admin/cms-start.js` does not start the content manager inside a frame (it shows a link to open it on its own), which covers clickjacking of the editor.

6. **Live smoke test of the editor** (editor v2, spec §9; the owner or the PI, right after the release, on a **draft test entry** such as a news item "Editor smoke test (delete me)" with "Draft · pending lab review" on):
   1. Sign in at `https://<HOST>/admin/`, open the draft test entry, type, and see the change in the live column within a second. Note how long the first "Loading the site… (n of 8)" took, and the first and later loads, in `docs/TESTING-REPORT.md`.
   2. **Save.** The status box goes to "Saved · not shown on the live site because “Draft · pending lab review” is on", and the deploy completes (Actions → Deploy is green). Note the minutes from Save to the end of the deploy in `docs/HANDOVER.md` §5.
   3. The entry's **History** shows the new row with your name and avatar; **Recent changes** shows it too.
   4. Click **Undo** in the "Saved" message (or **Undo this change** in History). The status box tracks the second deploy.
   5. On github.com (repository → Commits), both commits show **your account** as the author, with "(by @your-login)" in the message.
   6. In the browser's DevTools (Network), a request to `api.github.com` answers with the header `X-OAuth-Scopes: public_repo`.
   7. **Two editors:** in two browsers (or with a colleague), open the same entry, save in one, then save in the other. The second Save is refused and names the first editor; **Bring in their changes** puts their change into the form, and Save then works.
   8. Turn the test entry's content back (or leave it as a draft) and tell a maintainer the results. Steps 5 and 6 confirm that History can name each editor (DECISIONS D-19); until they pass, treat the names in History as unconfirmed.

## D. Domain

1. **Interim URL:** `https://<ORG>.github.io/`. A repo named `<ORG>.github.io` serves at the root (DOCUMENTED, R4 V22). If the repo has another name, the site lives at `/<REPO>/`: `deploy.yml` reads that base path from `actions/configure-pages` and builds with `NEXT_PUBLIC_BASE_PATH`; also add the path to the CMS `site_url`.
2. **Campus hostname through Haas (the Socreg route).** The PI asks the **Haas departmental Security Contact** (ISO can say who that is) to register the hostname in **Socreg** as offsite-hosted (DOCUMENTED, KB0015380 via R4 V28). Prefer `bobalab.haas.berkeley.edu`: names inside a departmental subdomain are preferred, and a top-level `bobalab.berkeley.edu` also needs the Domain Approval committee (DOCUMENTED, R4 §5.1). The registration needs:
   - hostname: `bobalab.haas.berkeley.edu`;
   - hosting service: GitHub Pages;
   - data protection level: **P1** (public information only). Whether GitHub Pages is approved for P1 is UNKNOWN; ISO decides during registration;
   - a description of the site;
   - DNS: `CNAME bobalab.haas.berkeley.edu. → <ORG>.github.io.` plus the TXT record GitHub shows in step 3;
   - **Resource Proprietor:** the PI;
   - **privacy statement:** `https://<ORG>.github.io/privacy/`;
   - accessibility acknowledgement: target WCAG 2.2 AA, statement at `/accessibility/`;
   - confirmation of **no third-party ads and no analytics** that pass visitor data to third parties (true by construction: CI asserts zero off-origin requests, `tests/e2e/offorigin.spec.ts`);
   - **Siteimprove** accessibility scanning (required for berkeley.edu hostnames; how to enrol is UNKNOWN: ask ISO or the Digital Accessibility Program).

   DNS records that point off campus are an exception reviewed by the DNS Policy Committee (DOCUMENTED, R4 V29). The timeline is UNKNOWN; launch on github.io meanwhile.

3. **Verify the domain for the organization first** (prevents domain takeover): Org → Settings → Pages → **Add a domain** → GitHub shows a TXT record (`_github-pages-challenge-<ORG>.<HOST>`) → campus DNS adds it with the CNAME → **Verify** (DOCUMENTED, R4 §8 D3).
4. **Repo → Settings → Pages → Custom domain:** `<HOST>` → wait for the DNS check → tick **Enforce HTTPS** (DOCUMENTED, R4 §8 D3). Publishing from Actions needs no `CNAME` file in the site (HYPOTHESIS based on GitHub's custom-workflow docs; check the Pages settings page says the domain is saved).
5. **Update every place that names the host,** by PR where it is a file:
   - `content/site.yml → site_url: https://<HOST>` (canonical links, sitemap, robots, RSS);
   - `cms/source.mjs` `site_url` / `display_url`, then `node scripts/cms/build-config.mjs`;
   - the OAuth App's homepage URL; the Worker's `ALLOWED_DOMAINS` (add `<HOST>`);
   - optionally the repository variable `SITE_URL` (Settings → Secrets and variables → Actions → Variables). `deploy.yml` otherwise takes the origin from the Pages settings;
   - `docs/HANDOVER.md` §2.
     After the switch, open `https://<ORG>.github.io/` and check that it redirects to `<HOST>` (HYPOTHESIS: GitHub Pages redirects the github.io URL once a custom domain is set).
6. **`bobalab.org` (optional, H-4 option B).** It currently fronts the lab scheduler and its controller is UNKNOWN (R4 §5.2). Before any use: confirm the registrant, move the registration and DNS into the lab Cloudflare account with two admins, get **Office of Communications and Public Affairs** approval for a campus entity's non-berkeley.edu domain (DOCUMENTED, R4 V29), then point `www` at `<ORG>.github.io`.

## E. Use of Name and branding (before the public launch)

1. **"Berkeley" in the lab's name** (H-12). Under the campus Use of Name policy, deans, directors and chairs authorize sponsored departmental organizations to use the campus name (DOCUMENTED, R4 §6). The PI confirms "Berkeley Operations and Behavioral Analytics Lab" with the Haas dean's office or the OITM area chair and files the reply (email) where `docs/HANDOVER.md` §3 says. R4's line that github.io needs "no approvals" has no source, so treat this as required.
2. **Marks** (H-9, H-10). The site uses no Berkeley or Haas logos, seal or colours, only plain-text affiliation (R4 §6). Ask Haas MarCom (`brand@haas.berkeley.edu`, R4 §6) whether the boba wordmark is acceptable and whether a lockup is available. Students must not add official marks (DOCUMENTED, R4 §6).
3. **Link-in:** ask Haas to list BOBALAB on its research-labs page and to link it from the PI's Haas profile (brief §G3).

## F. Editors

Each RA creates a free GitHub account with 2FA; a maintainer adds them to `web-editors`; they open `https://<HOST>/admin/` → Login with GitHub → authorize. The per-term add/remove checklist is `docs/HANDOVER.md` §4; editing itself is `docs/EDITING.md` (WP6).

## G. Launch gate

Do not announce the site until all of these hold:

- [ ] Lab decisions recorded in `docs/DECISIONS.md`: H-1 directions and labels, H-3 which papers count, H-5 repo visibility, H-6 review gate, H-11 roster and photo consent, H-12 name, H-18 contact.
- [ ] Approved items have `draft: false`; the rest stay drafts. `content/site.yml → launched: true` (from then on, zero live directions is a validator **error**, DECISIONS D-03).
- [ ] A, B, C and E done; D at least on the interim github.io URL.
- [ ] CI green on `main`; a production Deploy run green; the C6 smoke test passed, including Undo and the two-editor test.
- [ ] `docs/QA-CHECKLIST.md` signed off: the manual matrix, Lighthouse on the four key pages, and the five-second test.
- [ ] `docs/HANDOVER.md` §2 has real names in every owner row.

## H. Editor v2 release checklist (owner)

Editor v2 ("Save goes live", the live column, History and Restore; DECISIONS D-17 to D-19) is built and tested on the branch `editor-v2`, but not merged or deployed. In this order:

1. [ ] **Answer the open questions** in DECISIONS D-17 (the table of 15 defaults now in the code), especially **#1 hiding a published page** (the D-05 amendment: a warning, not a deploy error) and **#2 links to hidden pages** (E_LINK_HIDDEN: Save refuses them). Change any default you disagree with before the release.
2. [ ] **Decide the measured side effect:** `/publications/` ships 301 more bytes of JavaScript (D-17, default accept).
3. [ ] **Merge and deploy** `editor-v2`: run the full checks of `docs/TESTING-REPORT.md` §0 on the branch after a clean `npm ci`, fast-forward `main` to it and push. Check that Actions → Deploy is green and that `/admin/` loads, with the live column on an entry.
4. [ ] **Only now merge the `automation/published-slugs` pull request** (if one is open). Merged before the release, turning on Draft or turning off Listed for a published entry would have failed the deploy.
5. [ ] **Add the `protect-main` ruleset** of section B6: block force pushes and restrict deletions **only**. Never "Require a pull request" or required status checks: either would stop every Save.
6. [ ] **One editor runs the live smoke test** of section C6, including the two-editor test, and checks that GitHub shows their own account on both commits (`author.login`) and that the token's scope is `public_repo` (`X-OAuth-Scopes`).
7. [ ] **Only then tell the lab managers.** Point them to `docs/EDITING.md`: sections 2, 3 and 8 cover what changed.

## Appendix: what the workflows need

| Workflow           | Trigger                                 | Permissions                                                                                                                                   | Secrets                    | Variables (optional)                          |
| ------------------ | --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- | --------------------------------------------- |
| `ci.yml`           | every PR, merge queue, manual           | `contents: read`                                                                                                                              | none                       | none                                          |
| `deploy.yml`       | push to `main`, daily 11:17 UTC, manual | build: `contents: read`; deploy: `pages: write`, `id-token: write`; record-slugs: `contents: write`, `pull-requests: write`, `actions: write` | none (`GITHUB_TOKEN` only) | `SITE_URL`, `BASE_PATH` (`/` forces the root) |
| `links-weekly.yml` | Mondays 14:41 UTC, manual               | `contents: read`, `issues: write`                                                                                                             | none                       | none                                          |

All actions are pinned to full commit SHAs with the tag in a comment; Dependabot updates both.
