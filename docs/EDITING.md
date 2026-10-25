# Editing the BOBALAB website

This guide is for lab members who edit the website through the content manager (Decap CMS) at **`/admin/`** on the live site, today `https://bobalabx.github.io/bobalab-web/admin/`. You do not need to know Git or code. Maintainers set up the system once (`docs/SETUP-PRODUCTION.md`) and look after it (`docs/HANDOVER.md`).

Contents: [1. Sign in](#1-sign-in) · [2. Drafts and review](#2-drafts-and-review) · [3. Publish: wait for the green check](#3-publish-wait-for-the-green-check) · [4. Consent rules](#4-consent-rules-people-photos-emails) · [5. Images and alt text](#5-images-and-alt-text) · [6. Research directions: order, colours, archiving](#6-research-directions-order-colours-archiving) · [7. Archive instead of deleting](#7-archive-instead-of-deleting) · [8. Undo a publish (Revert)](#8-undo-a-publish-revert) · [9. Per-term checklist](#9-per-term-checklist) · [10. PDF accessibility checklist](#10-pdf-accessibility-checklist) · [11. Practice on your own computer](#11-practice-on-your-own-computer-no-account) · [12. Tips and known quirks](#12-tips-and-known-quirks) · [13. How Fig. 1 is made from your entries](#13-how-fig-1-is-made-from-your-entries) · [14. Study-design figures](#14-study-design-figures-plate_verified) · [15. Links for lab members](#15-links-for-lab-members) · [16. Writing for the site](#16-writing-for-the-site)

> **Redesign, October 2026 (DECISIONS D-13).** The site now looks different, but what you edit is almost the same. Here is what changed for editors:
>
> - Type and status show as plain words, not as boxed badges or pills. You fill in the same fields.
> - Lists are ruled rows, not cards.
> - A person without a consented photo gets a square with their initials.
> - Fig. 1 on the home page draws one line per research direction (section 13).
> - Publications have one new checkbox, **Study-design figure checked by the authors** (section 14).
> - Status provenance ("reported by the lab") is printed once per page as a footnote, so never type it into a field or a body (section 16).

---

## 1. Sign in

1. You need a free GitHub account with **two-factor authentication** turned on, and a maintainer must add you to the lab's `web-editors` team. Ask the PI or a maintainer.
2. Open `/admin/` on the site and click **Login with GitHub**. A GitHub window asks you to authorise "BOBALAB website CMS" the first time. Approve it.
3. The CMS keeps your sign-in in this browser. On a shared or public computer, use the account menu (top right) → **Log out** when you finish.
4. If sign-in fails ("Not found" or a blank pop-up), you are probably not in the team yet, or the pop-up was blocked. Allow pop-ups for the site and try again.

What you can change: News, Publications, People, Research directions, Projects, Opportunities, the fixed Pages (Home texts, Join, About, Accessibility, Privacy) and site Settings (including the links for lab members, section 15).

## 2. Drafts and review

There are **two different things called "draft"**. Keep them apart:

|                                         | Where                                            | What it means                                                                                                                                                                                                            |
| --------------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Workflow draft**                      | The **Workflow** tab: Drafts → In review → Ready | Your change is saved but **not published**. It lives on its own branch with a pull request on GitHub. Nothing on the site changes.                                                                                       |
| **"Draft · pending lab review" switch** | A field in every entry                           | The entry **is** published to the repository, but the live site leaves it out. Preview builds show it with the words "Draft · pending lab review". Imported content that the lab has not checked yet has this switch on. |

The normal path:

1. Open a collection, click its **＋** button (for example **＋ Publication**, **＋ News item**, **＋ Person**) or an existing entry, and edit. The right-hand pane is a **preview** styled like the site (news, people, publications and research directions show the site's own list row; it is an approximation of the live page).
2. Click **Save**. This creates a workflow draft. You can come back and keep editing.
3. When the text is ready, set the status to **In review** (top bar, or drag the card on the Workflow board). A maintainer or the PI reviews it. If the lab requires an approval, they approve the pull request on github.com.
4. Move it to **Ready**, then **Publish** (section 3).
5. To show an entry on the live site, its "Draft · pending lab review" switch must also be **off**.

> **The repository is public.** Workflow drafts and the content files can be read on github.com even before they are published. Never put embargoed results, unpublished personal data, home addresses, phone numbers or anything a person has not agreed to share into any field, draft or not.

The **file name** (the page address) is made when you first save: news use the date plus the title, people their name, directions the short label, and publications the first author's name, the year you create the entry and the start of the title. Fill those fields in **before the first save**. The CMS cannot rename a file afterwards; ask a maintainer, who will also add a redirect. If an address would break the site's rules, the CMS does not save and says what to change. For example, a publication address may have at most 60 characters: when the first author has a long name, type only their last name for the first save, then complete the name and save again.

**Publications: last name first.** The lab's paper addresses start with the first author's **last name** and the year (`sinchaisri-2026-compliance-aware-rl`), but the CMS builds the address from the whole name in the first author field and from the year you **create** the entry. So for every new publication: type only the first author's last name, save once, then complete the name and save again. If you forget, the first Save stops once with "Not saved yet: check the address first …" and shows the address it would use; Save again keeps it as shown. For an older paper (say 2023), the address still carries this year; if it must match, ask a maintainer to add the file.

## 3. Publish: wait for the green check

Every change runs an automatic check called **validate-content** (spelling of dates, required fields, links, consent rules, relations between entries).

- **Publish fails while the check is still running, or if it failed.** Wait until the pull request shows a **green check**. The check usually takes a minute or two. You can see it on the pull request on github.com (repository → **Pull requests** → the one named after your entry).
- If the lab requires an approval, Publish also fails until someone with permission has approved the pull request on github.com. (GitHub does not let you approve your own pull request.)
- If the check is red, open its details on github.com: each message names the file and field (for example `E_ALT_MISSING … image.alt`). Fix the field in the CMS and save again; the check reruns.
- After **Publish**, the site rebuilds automatically. Wait a few minutes, then reload the live page. If nothing changes after about 15 minutes, tell a maintainer.

The CMS itself already blocks many mistakes when you save, so they never reach the check:

- an image without alt text, a link with an address but no link text, web addresses that do not start with `https://`, dates in the wrong format, texts longer than the site can show;
- a new entry whose address would not fit the site's rules;
- fields that are required only in some cases. Their labels say when, for example **Alt text (required with an image)**, **As of (required unless Published)**, **Status source (required unless Published)**, **Year (required with a public version)** and **Research directions (required except for work in progress)**; a paper or project needs at least one research direction unless "Draft · pending lab review" is on;
- the same direction twice in **Direction order**, a colour that another direction already uses (section 6), and a person's photo without photo consent (section 4).

The message appears at the top right and reads like **"Failed to persist entry: Error: Not saved: …"**. Everything after "Not saved:" tells you what to fix; nothing was written. Fix it and save again.

## 4. Consent rules (people, photos, emails)

The site shows people only with their consent (lab decision D-06). The switches in each person entry control this, and the preview shows "What the site will show".

| Switch                           | Off (the default)                                                             | On                                                                     |
| -------------------------------- | ----------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| **Listed (consented to appear)** | The person is **never shown or linked anywhere**, not even in preview builds. | The person may appear on People, as a linked author, in project teams. |
| **Photo consent**                | The photo is not shown; a square with the person's initials is shown instead. | The uploaded photo is shown, cropped to a square.                      |
| **Email public**                 | The email is not shown.                                                       | The email is shown as a link.                                          |
| **Now at public**                | "Now at …" (alumni) is not shown.                                             | It is shown.                                                           |

Rules:

- Turn a switch on **only after the person agreed in writing** (an email is enough). Keep that email; do not paste it into the site. If someone withdraws consent, turn the switch off and publish at once.
- **Upload a photo only after photo consent.** An uploaded file is public at `/uploads/…` as soon as it is published, even while "Photo consent" is off and no page shows it. The CMS therefore does not save a person with a photo while "Photo consent" is off. If someone withdraws photo consent, remove the photo from the entry as well and ask a maintainer to delete the file from `public/uploads/`.
- **External coauthors are not people.** In a publication, type their name in the author list and optionally their web page. Only the PI, lab members and alumni have person entries.
- Nobody becomes an "Affiliate" without their written consent.
- Project **collaborators** are shown only when their "Consent to be shown" switch is on; **partners** only when "Public" is on.
- Students who leave: set the **End** date (they move to Alumni automatically; the CMS will not save an End before the Start) and ask whether they want "Now at" shown.
- **Program:** when a member consents to appear, ask how they want their program written, with their capitalisation (for example "EECS", "Applied Math & Data Science"). Do not repeat the degree the role already shows ("Master's student · IEOR", not "· IEOR MS"). Never leave it in lower case.
- Never add anyone from old, hidden rosters on other sites. When in doubt, leave the person out and ask the PI.

## 5. Images and alt text

- Upload **JPG, PNG, WebP or GIF** images up to **2 MB** (PDFs up to 10 MB). A larger file is refused with a browser message "File too large. Configured to not allow files greater than 2097 kB." (2 MB is 2097 kB in that message; for PDFs it says 10485 kB). Do not upload SVG, HTML or other files: the automatic check rejects them because they could run code next to the content manager. The site does not show images from other websites, so always upload.
- Only upload images the lab may use (your own figures, photos with the person's permission, figures from your paper when the publisher allows it).
- **Alt text is required whenever an image is set** (the CMS will not save without it). Write one sentence that says what the image shows and why it matters, as you would describe it on the phone:
  - Good: "Line chart: couriers' delivery times fall over their first 200 orders, faster for those who follow recommendations."
  - Good (headshot): "Portrait of Jane Doe."
- **Headshots** are shown as squares, so the edges of a wide or tall photo are cut off. Upload a head-and-shoulders photo with the face near the middle.
  - Avoid: "image", "figure 1", "photo.jpg", or repeating the caption word for word. Do not start with "Image of".
- For charts, put the key takeaway in the alt text and the details in the caption or "What this shows".
- Rich-text bodies cannot hold images; use the image fields (Figure, Hero image, Teaser image, Image), which enforce alt text.

## 6. Research directions: order, colours, archiving

The research directions are the lines of Fig. 1 on the home page. Each line ends in a black pearl at the "now" rule (section 13). The CMS hints still say "pearls"; they mean the same thing.

**Reorder the lines (pearls).** Go to **Settings → Site → Direction order**. Each item shows the direction's address (for example `ai-at-work`, the file name of the direction). Drag an item by its handle (the two lines at the top of the item), or use the keyboard: press Tab until the handle is focused (a screen reader announces "Reorder “ai-at-work”, item 2 of 4"), then press the **Up** or **Down arrow** key once per step; the focus stays on the item and its new position is announced. Then save and publish. The order lives in this one list on purpose: changing it never needs edits to several direction entries at once. Each live direction must appear exactly once (the CMS will not save a direction listed twice); archived directions are left out.

**Remove an item** with the **×** at its top right. An item that opens as an empty choice is a direction that has been archived: remove it.

**Add a direction.** Create it under Research directions (fill in the **short label** first: it becomes the address), then add it to **Direction order**. Up to 8 directions fit; with 7–8, consider **Settings → Site → Fig. 1 layout: Dot plot**.

**Choose a colour.** Each direction needs its **own** colour: the CMS will not save a colour that another live (not archived) direction already uses. The colour is a data colour: it draws the direction's line in Fig. 1 and the short line segment next to the direction's name on papers, projects and news. Links and headings stay black. The preview shows the colour, the colours the other live directions use, and a warning when a colour is easy to confuse for colour-blind readers, with the direction that uses the other colour of the pair (if any):

- The four live directions use Butterfly pea (blue), Lychee (rose), Matcha (green) and Oolong (brown). These four were retuned for the redesign and checked against each other for colour-blind readers.
- Jasmine (teal) and Black sesame (charcoal) are used by the two archived directions. Taro (violet) and Thai tea (orange) are **reserve** colours.
- Easy-to-confuse pairs (recomputed 2026-10-24): **Jasmine** with Black sesame, Butterfly pea, Lychee or Matcha; **Thai tea** with Matcha, Lychee or Oolong; **Taro** with Butterfly pea or Black sesame. In short: a fifth live direction should not use Jasmine or Thai tea, and Taro conflicts with Butterfly pea.
- The automatic check warns about shared or confusable colours; fix it before launch.

**Archive a direction** instead of deleting it (section 7): set **Status: Archived**, set **Archived on** (e.g. `2026-10`), save and publish; then open **Settings → Site**, remove it from **Direction order** (×), save and publish. It leaves Fig. 1, but its page stays with a dated "Archived" note and it is listed under "Earlier and related research".

## 7. Archive instead of deleting

The CMS has no Delete button for published entries, on purpose: links to old pages would break, and the protected main branch does not accept direct deletions. Instead:

| Entry                          | How to retire it                                                                                                         |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| Research direction             | Status **Archived** + Archived on date; remove from Direction order (section 6).                                         |
| Project                        | Status **Archived** (or Completed).                                                                                      |
| Person                         | Set the **End** date (alumni), or switch **Listed** off if they no longer want to appear.                                |
| News, publication, opportunity | Switch **Draft · pending lab review** on to hide it; for opportunities, set Status **Closed** with a new **As of** date. |

If a page really must go, or its address must change, ask a maintainer: they remove or rename it in a pull request and add an entry under **Settings → Site → Redirects** (old address → new address), so old links still work. Unpublished work is different: a workflow draft can be discarded with **Delete unpublished entry / changes** in the editor, or **Delete new entry** on its Workflow card.

## 8. Undo a publish (Revert)

Every Publish is a merged pull request on GitHub, so every change can be undone:

1. On github.com, open the repository → **Pull requests** → **Closed**, and find the pull request named after the entry (for example "Update News “…”").
2. Click **Revert**. GitHub opens a new pull request that undoes the change.
3. Wait for the **green check**, then merge it (**Squash and merge**). The site rebuilds and the old version is back.

For a small mistake it is often quicker to edit the entry again and publish the fix. Reverting needs write access on github.com; if you do not see the button, ask a maintainer.

## 9. Per-term checklist

At the **start of each term** (PI or a maintainer):

- [ ] **Onboard new editors:** each has a GitHub account with 2FA; add them to the `web-editors` team; they sign in once, read this guide and try the local practice mode (section 11).
- [ ] **Offboard leavers:** remove departed members from the GitHub organisation and teams; check the Workflow board for their unfinished drafts (finish, hand over or discard them).
- [ ] **People:** add new members only with consent (section 4); set **End** dates for people who left; ask leavers about "Now at" and email consent; check photos still have consent.
- [ ] **Opportunities and Join page:** update each opportunity's **Status** and **As of** date (URAP rounds open and close every term); make sure nothing says "open" without a dated source.
- [ ] **Publications:** refresh statuses (revisions, acceptances) and their **As of** dates; add new papers and preprints; check that working papers have **Status source**; turn on **Study-design figure checked by the authors** only for figures an author has approved (section 14).
- [ ] **News:** add the term's talks and awards; past events stop showing "Upcoming" automatically after the next rebuild.
- [ ] **Directions:** confirm the order and colours; archive directions the lab no longer pursues.
- [ ] **Accessibility and Privacy pages:** review the text and update **Last reviewed**.
- [ ] **Maintainers once a year:** rotate the sign-in secret and review who has access (`docs/HANDOVER.md`).

## 10. PDF accessibility checklist

UC Berkeley requires documents on its sites, PDFs included, to meet **WCAG 2.1 AA by April 26, 2027** (UC Berkeley Digital Accessibility Program). The easiest way to comply is not to upload PDFs:

1. **Prefer links.** Link to the publisher, SSRN or arXiv copy with **Insert from URL** in the PDF field, instead of uploading a file.
2. If you must upload (for example slides or a CV), check the PDF **before** uploading:
   - [ ] It is a **tagged PDF** made from the source file (Word, LaTeX with tagging, PowerPoint "Save as PDF" with accessibility options), not a scan or "print to PDF" image. Scanned pages need OCR.
   - [ ] The document **title** is set in the file properties, and the **language** is set (English).
   - [ ] **Headings** are real headings, and the **reading order** follows the visual order.
   - [ ] Every figure and chart has **alt text**; decorative images are marked as artifacts.
   - [ ] **Tables** have header rows; no layout-only tables.
   - [ ] **Links** have meaningful text; colour is not the only way information is shown; text has enough contrast.
   - [ ] It passes Adobe Acrobat's **Accessibility Checker** (or the free PAC checker) without errors.
   - [ ] It is at most **10 MB**, has a descriptive file name (e.g. `jiang-2025-learning-on-the-go-slides.pdf`), contains no embargoed material, and the lab has the right to host it.
3. Old PDFs that cannot be fixed should be linked from an external archive rather than uploaded.

## 11. Practice on your own computer (no account)

Maintainers and curious editors can try the content manager without a GitHub account:

1. In a copy of the repository, run `npm ci` once, then **`npm run cms:local`**.
2. Open **`http://localhost:3100/admin/local.html`** and click **Login**.
3. Changes are written straight into the files on your computer (no drafts board, every Publish writes the file), and the local site at `http://localhost:3100` shows them after a reload. One exception: the own page of an entry you **created** (for example `/news/<new-address>/`) may say "not found" until you stop and restart `npm run cms:local`, because the local site works out the list of pages once; lists such as `/news/` show the new entry at once, and the published site is built afresh every time.
4. Press **Ctrl+C** to stop. Use Git to review or throw away what you changed (`git status`, `git restore content/`).

## 12. Tips and known quirks

- **Saving after editing a body re-formats its Markdown.** When you change a rich-text body (Body, Bio, the Join texts), the editor saves the whole text in its own style: `-` list markers become `*`, and list items may get blank lines between them. The page looks the same apart from slightly more space between those list items. Opening an entry and saving other fields leaves the body as it was.
- **Bodies** support bold, italic, links, headings (level 2 and 3), quotes and lists. Switch the editor to **Markdown** mode (toggle above the text) for anything else. Code blocks and images inside bodies are turned off.
- **Long texts:** the CMS stops you at the site's limits (for example a pearl's short label at 28 characters, a news summary at 280).
- **Dates** in "As of", "Archived on" and similar fields accept `2026`, `2026-10` or `2026-10-20`.
- **Relations to people** (an author's lab person, a project team, the people in a news item) only offer people who agreed to be listed.
- **The first save of a file may change lines you did not touch.** The CMS writes the whole file in its own style: long texts are wrapped at 80 characters, quotes around dates are dropped, fields follow the editor's order and empty settings such as `social: {}` disappear. The site reads both forms the same way. Reviewers: expect these formatting-only lines in the first CMS change of each file; later changes show only what was edited.
- **Opening an entry by its address.** If you paste or type another entry's address into the address bar while the editor is open, the page reloads to show that entry (the editor would otherwise keep showing the previous one). If you see "Not saved: the editor still shows …", reload the page (F5) and make the change again.
- **Drag announcements for screen readers.** When you drag an item with the mouse, the spoken messages name the item and its position. Lists cannot be reordered with Space and the arrow keys as the built-in instructions of the drag library suggest; use the Up and Down arrow keys on the focused handle (section 6). The tags of multi-select fields (for example a project's Research directions, where the first is the project's home direction) can be dragged with the mouse; without a mouse, remove the tags with their × and add them again in the order you want.
- The content manager works best on a laptop or desktop. In windows narrower than 800 pixels (phones), the editor shows the form only, without the preview pane and the "Check for Preview" button. Use a laptop to review and publish.
- Something broken or unclear? Tell a maintainer, or open an issue on the repository.

## 13. How Fig. 1 is made from your entries

Nobody draws Fig. 1 by hand. Every build draws it again from the content, so it updates a few minutes after you publish. What it shows comes from these fields:

| What you see in Fig. 1                                                                | Where it comes from                                                                                                                                                                                                                                              |
| ------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| One horizontal line per research direction, top to bottom                             | The live directions in **Settings → Site → Direction order** (section 6). Archived directions are left out. Draft directions appear only in preview builds.                                                                                                      |
| The line's colour and its label                                                       | The direction's **Colour** and **Short label** (at most 28 characters).                                                                                                                                                                                          |
| A filled dot on a line, at a year                                                     | A publication that lists the direction under **Research directions** and **counts as a paper**: it has a **DOI**, or an SSRN, arXiv, PDF or publisher link, or a **presentation** with a source link. Its **Year** places it. Order within a year means nothing. |
| A short vertical link joining two dots                                                | A counted paper with two research directions appears on both lines, and the link joins them.                                                                                                                                                                     |
| Where a line starts                                                                   | The direction's earliest counted paper.                                                                                                                                                                                                                          |
| The black pearl at the "now" rule                                                     | The direction today. Clicking it (or its label) opens the direction's page.                                                                                                                                                                                      |
| Open rings after the "now" rule                                                       | Work in progress: entries tagged with the direction that do not count as a paper yet (no public version and no documented talk). They are not placed by date.                                                                                                    |
| The counts beside each label ("4 papers, 2 in progress") and "As of …" in the caption | Counted from the same entries on the day of the build.                                                                                                                                                                                                           |

To get a paper onto the figure, add its public link or DOI (or a presentation with its source link), its **Year** and at least one **Research direction**, then publish. To move a direction's line, change **Direction order**. Without JavaScript, and for screen readers, the same counts and the publications list carry the same information.

## 14. Study-design figures (`plate_verified`)

Some papers have a **study-design figure**: a small diagram of how the study was set up (for example the virtual-kitchen experiment in Bastani et al. 2026). These figures are written in code by a maintainer, one per paper. They show design facts only, never results, and each one names its source. You cannot draw one in the CMS. Ask a maintainer if a paper should have one.

Each publication has a checkbox, **Study-design figure checked by the authors** (`plate_verified` in the file):

- **Off** (the default): the figure appears only in **preview builds**, so the authors can check it. The live site does not show it.
- **On**: the live site shows the figure on the paper's page (today the only page that shows study-design figures).
- Turn it on **only after an author of the paper has checked the drawing** against the paper and said it is right. Keep that email; do not paste it into the site. If an author later finds a mistake, turn the box off and publish at once, then ask a maintainer to fix the drawing.
- The checkbox does nothing for a paper without a figure.

## 15. Links for lab members

**Settings → Site → Links for lab members** holds links to internal tools, such as the lab scheduler. They appear in the **Lab members** column of the site footer, next to the "Reduce motion" switch, and at the top of the People page.

- **Link text:** short, for example "Lab scheduler" (at most 40 characters).
- **Address:** a full address starting with `https://`.
- **Description (optional):** one line on what the link is for and who can use it, for example "Weekly lab meeting scheduling (lab members sign in with Google)."
- These links are **public**: anyone can see them in the footer and in the repository. Only add tools that ask for a sign-in themselves. Never add a link that works for anyone who has it, such as a shared document's "anyone with the link" URL.
- If the list is empty, the footer column is headed "Display" and holds only the "Reduce motion" switch.

## 16. Writing for the site

The redesign follows one rule for words: say what the lab does, plainly, and let the fields carry status and provenance.

- **Status goes in fields, not in prose.** Use **Status**, **Status note**, **As of** and **Status source**. The site prints the status as plain words ("Major revision at Manufacturing & Service Operations Management") and adds **one footnote per page** when a status is the lab's own report. Never type "reported by the lab", "status not confirmed" or "as of the last check" into a body or summary.
- **Don't describe the site or the pipeline.** Avoid sentences such as "This direction collects…", "listed by title only", "filed here so that…" or "no abstract has been reviewed yet". If an item has no summary, leave the summary empty; the page lists its title and status.
- **Direction bodies** (80–150 words) start with the research itself. The page already opens "Why it matters" with the direction's one-line summary, so don't repeat it. Describe what each paper studies. Leave findings to the Findings list, which needs an evidence label and a paper.
- **Write sentences, not tags.** Say "a submitted paper asks when…", not "when… (a submitted paper)". The lists under the text already show each item's type and status.
- **Vary the wording between pages.** If every direction ends "Newer work includes…", readers notice the template. Only call work "newer" or "later" when the dates show it.
- **Credit co-authors.** Don't write "Park Sinchaisri carried out" a paper that has other authors; name the paper or the lab instead. Project collaborators whose "Consent to be shown" is off are hidden on project pages (section 4), so don't name them in running text either; the author lists on paper pages are citations and stay as published.
- **Name the lab sparingly.** The home page and the header already name BOBALAB. In the mission, the About text and the Join texts, write "we" or "the lab".
- **No arrows, emoji or all-caps labels** in titles or summaries. The site adds its own link styling.
- **Only facts with a source.** Do not round a talk that was "announced" into one that was "given", or a "submitted" paper into an "accepted" one. If you are unsure, ask the PI and leave the cautious wording.
