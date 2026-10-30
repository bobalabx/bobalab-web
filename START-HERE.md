# BOBALAB website: start here

This repo holds **both** "websites" the lab needs. They share one set of content files, so there is a single source of truth.

|             | What                                                                                                                                                                                                                          | Where     |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| Public site | Home with the interactive pearl figure (Fig. 1), Research directions, Projects, Publications (search, filters, BibTeX), People, News (+ RSS), Join, About, Accessibility, Privacy                                             | `/`       |
| Editor      | Decap CMS: forms for every content type with the real site beside the form, one-click Save that goes live in about 2 minutes, History with Undo and Restore, image and PDF uploads, reordering pearls, a colour per direction | `/admin/` |

Nothing has been deployed, pushed or registered. Everything below runs on this computer.

## 1. Look at it

```bash
npm run dev
```

Open http://localhost:3100. This is **preview mode**: it shows content that is still waiting for lab review, marked with "Not visible on the live site" badges (the editor's "Visible on the website: No") and a dark ribbon at the top.

To see what the public would get today, run a production build (drafts excluded):

```bash
npm run build
```

```bash
npm run start
```

Almost all content is still a draft until the lab approves it, so the production site is nearly empty for now. That is intentional.

## 2. Try the editor without an account

```bash
npm run cms:local
```

Open http://localhost:3100/admin/local.html and click **Login**. The right-hand column shows the real site with your changes as you type. Saving writes straight into `content/`, and the site updates when you reload. Use `git diff` to see what changed and `git restore content/` to undo practice edits. The real editor (GitHub sign-in; Save puts a change on the live site in about 2 minutes; History, Undo and Restore) is described in `docs/EDITING.md`.

## 3. Before launch: what the lab must decide

The full fill-in sheet is `docs/CONTENT-QUESTIONS.md` (about 100 items, each with a default). The ones that block launch:

1. **Research directions (pearls).** The default is 4: Algorithmic Advice · AI at Work · Learning on the Job · Platform Work. Pricing and Cities are archived. Options and evidence: `docs/CONTENT-AUDIT.md` §7.
2. **Roster consent.** Who is listed, with which program wording, and with or without photos. Today nobody but Park appears in production.
3. **Which papers count as lab work**, plus the statuses of the working papers (self-reported, so each needs an "as of" date).
4. **Identity and policy.**
   - The canonical lab name.
   - Whether bobalab@berkeley.edu is a monitored lab address.
   - Use-of-Name approval for "Berkeley".
   - The domain: `bobalab-berkeley.github.io` first, `bobalab.haas.berkeley.edu` via Haas.
   - Whether to keep Park's personal site's region-based hiding.
5. **Copy only the lab can write.**
   - The mission sentence (a draft exists).
   - Park's bio.
   - Direction texts (drafted from the papers only).
   - Summaries for 11 papers and 9 projects.
   - Approval of the Privacy and Accessibility statements.
6. **Process.**
   - Public or private repo. Drafts in a public repo are readable, and the roster is in the drafts.
   - Whether a maintainer must approve every edit (recommended for the first term).

Smaller calls are recorded in `docs/TESTING-REPORT.md` → "Decisions for the owner":

- the PI title ("Principal investigator");
- archive dates;
- CV-only awards;
- the mobile LCP of about 2.6–3.0 s in Lighthouse's throttled test.

## 4. Going live (needs lab accounts; not done)

`docs/SETUP-PRODUCTION.md` walks through:

1. A lab-owned GitHub org. The name `bobalab-berkeley` was free on 2026-10-20.
2. GitHub Pages.
3. A free Cloudflare Worker for editor sign-in.
4. Branch protection.
5. The domain request through Haas.

`docs/HANDOVER.md` covers ownership, secrets, adding and removing editors each term, and what to do when the scheduled rebuild stops.

## 5. Where everything is

| Deliverable                           | File                                                                                               |
| ------------------------------------- | -------------------------------------------------------------------------------------------------- |
| A. Research and design report         | `docs/research/research-brief.md` (with R3–R6), `docs/design/JUDGE.md`, `docs/design/prototypes/`  |
| B. Public website                     | `src/`, `content/`                                                                                 |
| C. Editor (CMS)                       | `public/admin/`, `cms/`, `docs/EDITING.md`                                                         |
| D. Content and verification checklist | `docs/CONTENT-AUDIT.md`, `docs/CONTENT-QUESTIONS.md`                                               |
| E. Testing report                     | `docs/TESTING-REPORT.md`, `docs/QA-CHECKLIST.md` (manual checks still to do)                       |
| F. Deployment                         | `docs/SETUP-PRODUCTION.md`, `.github/workflows/`                                                   |
| G. Maintenance                        | `docs/EDITING.md`, `docs/HANDOVER.md`, `docs/ARCHITECTURE.md`, `README.md`                         |
| H. Decisions                          | this file §3, `docs/DECISIONS.md` (what was decided and why), `docs/research/research-brief.md` §H |
