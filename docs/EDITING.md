# Editing the BOBALAB website

This guide is for lab members who edit the website through the content manager (Decap CMS) at **`/admin/`** on the live site, for example `https://bobalab-berkeley.github.io/admin/`. You do not need to know Git or code. Maintainers set up the system once (`docs/SETUP-PRODUCTION.md`) and look after it (`docs/HANDOVER.md`).

Contents: [1. Sign in](#1-sign-in) · [2. Drafts and review](#2-drafts-and-review) · [3. Publish: wait for the green check](#3-publish-wait-for-the-green-check) · [4. Consent rules](#4-consent-rules-people-photos-emails) · [5. Images and alt text](#5-images-and-alt-text) · [6. Research directions: order, colours, archiving](#6-research-directions-order-colours-archiving) · [7. Archive instead of deleting](#7-archive-instead-of-deleting) · [8. Undo a publish (Revert)](#8-undo-a-publish-revert) · [9. Per-term checklist](#9-per-term-checklist) · [10. PDF accessibility checklist](#10-pdf-accessibility-checklist) · [11. Practice on your own computer](#11-practice-on-your-own-computer-no-account) · [12. Tips and known quirks](#12-tips-and-known-quirks)

---

## 1. Sign in

1. You need a free GitHub account with **two-factor authentication** turned on, and a maintainer must add you to the lab's `web-editors` team. Ask the PI or a maintainer.
2. Open `/admin/` on the site and click **Login with GitHub**. A GitHub window asks you to authorise "BOBALAB website CMS" the first time. Approve it.
3. The CMS keeps your sign-in in this browser. On a shared or public computer, use the account menu (top right) → **Log out** when you finish.
4. If sign-in fails ("Not found" or a blank pop-up), you are probably not in the team yet, or the pop-up was blocked. Allow pop-ups for the site and try again.

What you can change: News, Publications, People, Research directions, Projects, Opportunities, the fixed Pages (Home texts, Join, About, Accessibility, Privacy) and site Settings.

## 2. Drafts and review

There are **two different things called "draft"**. Keep them apart:

|                                         | Where                                            | What it means                                                                                                                                                                                                          |
| --------------------------------------- | ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Workflow draft**                      | The **Workflow** tab: Drafts → In review → Ready | Your change is saved but **not published**. It lives on its own branch with a pull request on GitHub. Nothing on the site changes.                                                                                     |
| **"Draft · pending lab review" switch** | A field in every entry                           | The entry **is** published to the repository, but the live site leaves it out. Preview builds show it with a "Draft · pending lab review" badge. Imported content that the lab has not checked yet has this switch on. |

The normal path:

1. Open a collection, click **New …** or an existing entry, and edit. The right-hand pane is a **preview** styled like the site (news, people, publications and research directions show the site's own card; it is an approximation of the live page).
2. Click **Save**. This creates a workflow draft. You can come back and keep editing.
3. When the text is ready, set the status to **In review** (top bar, or drag the card on the Workflow board). A maintainer or the PI reviews it. If the lab requires an approval, they approve the pull request on github.com.
4. Move it to **Ready**, then **Publish** (section 3).
5. To show an entry on the live site, its "Draft · pending lab review" switch must also be **off**.

> **The repository is public.** Workflow drafts and the content files can be read on github.com even before they are published. Never put embargoed results, unpublished personal data, home addresses, phone numbers or anything a person has not agreed to share into any field, draft or not.

The **file name** (the page address) is made when you first save: news use the date plus the title, people their name, directions the short label, and publications the first author's name, the year you create the entry and the start of the title. Fill those fields in **before the first save**. The CMS cannot rename a file afterwards; ask a maintainer, who will also add a redirect. If an address would break the site's rules, the CMS does not save and says what to change. For example, a publication address may have at most 60 characters: when the first author has a long name, type only their last name for the first save, then complete the name and save again.

## 3. Publish: wait for the green check

Every change runs an automatic check called **validate-content** (spelling of dates, required fields, links, consent rules, relations between entries).

- **Publish fails while the check is still running, or if it failed.** Wait until the pull request shows a **green check**. The check usually takes a minute or two. You can see it on the pull request on github.com (repository → **Pull requests** → the one named after your entry).
- If the lab requires an approval, Publish also fails until someone with permission has approved the pull request on github.com. (GitHub does not let you approve your own pull request.)
- If the check is red, open its details on github.com: each message names the file and field (for example `E_ALT_MISSING … image.alt`). Fix the field in the CMS and save again; the check reruns.
- After **Publish**, the site rebuilds automatically. Wait a few minutes, then reload the live page. If nothing changes after about 15 minutes, tell a maintainer.

The CMS itself already blocks some mistakes when you save: an image without alt text, a link with an address but no link text, web addresses that do not start with `https://`, dates in the wrong format, texts longer than the site can show, and a new entry whose address would not fit the site's rules. The message (top right, starting "Not saved") tells you what to fix.

## 4. Consent rules (people, photos, emails)

The site shows people only with their consent (lab decision D-06). The switches in each person entry control this, and the preview shows "What the site will show".

| Switch                           | Off (the default)                                                             | On                                                                     |
| -------------------------------- | ----------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| **Listed (consented to appear)** | The person is **never shown or linked anywhere**, not even in preview builds. | The person may appear on People, as a linked author, in project teams. |
| **Photo consent**                | The photo is not shown; a pearl with initials is shown instead.               | The uploaded photo is shown.                                           |
| **Email public**                 | The email is not shown.                                                       | The email is shown as a link.                                          |
| **Now at public**                | "Now at …" (alumni) is not shown.                                             | It is shown.                                                           |

Rules:

- Turn a switch on **only after the person agreed in writing** (an email is enough). Keep that email; do not paste it into the site. If someone withdraws consent, turn the switch off and publish at once.
- **External coauthors are not people.** In a publication, type their name in the author list and optionally their web page. Only the PI, lab members and alumni have person entries.
- Nobody becomes an "Affiliate" without their written consent.
- Project **collaborators** are shown only when their "Consent to be shown" switch is on; **partners** only when "Public" is on.
- Students who leave: set the **End** date (they move to Alumni automatically; the CMS will not save an End before the Start) and ask whether they want "Now at" shown.
- Never add anyone from old, hidden rosters on other sites. When in doubt, leave the person out and ask the PI.

## 5. Images and alt text

- Upload **JPG, PNG, WebP or GIF** images up to **2 MB** (PDFs up to 10 MB). Do not upload SVG, HTML or other files: the automatic check rejects them because they could run code next to the content manager. The site does not show images from other websites, so always upload.
- Only upload images the lab may use (your own figures, photos with the person's permission, figures from your paper when the publisher allows it).
- **Alt text is required whenever an image is set** (the CMS will not save without it). Write one sentence that says what the image shows and why it matters, as you would describe it on the phone:
  - Good: "Line chart: couriers' delivery times fall over their first 200 orders, faster for those who follow recommendations."
  - Good (headshot): "Portrait of Jane Doe."
  - Avoid: "image", "figure 1", "photo.jpg", or repeating the caption word for word. Do not start with "Image of".
- For charts, put the key takeaway in the alt text and the details in the caption or "What this shows".
- Rich-text bodies cannot hold images; use the image fields (Figure, Hero image, Teaser image, Image), which enforce alt text.

## 6. Research directions: order, colours, archiving

The research directions are the pearls of Fig. 1 on the home page.

**Reorder the pearls.** Go to **Settings → Site → Direction order** and drag the items by their handle into the order you want, then save and publish. The order lives in this one list on purpose: changing it never needs edits to several direction entries at once. Each live direction must appear exactly once; archived directions are left out.

**Add a direction.** Create it under Research directions (fill in the **short label** first: it becomes the address), then add it to **Direction order**. Up to 8 directions fit; with 7–8, consider **Settings → Site → Fig. 1 layout: Dot plot**.

**Choose a colour.** Each direction needs its **own** colour. The preview shows the pearl, the header band and a warning when a colour is easy to confuse for colour-blind readers:

- Use the six main colours first: Butterfly pea (blue), Oolong (amber), Lychee (rose), Matcha (green), Jasmine (teal), Black sesame (charcoal).
- Taro (violet) and Thai tea (orange) are **reserve** colours.
- Avoid these pairs: **Taro with Butterfly pea**, **Thai tea with Oolong**, **Matcha with Thai tea**.
- The automatic check warns about shared or confusable colours; fix it before launch.

**Archive a direction** instead of deleting it (section 7): set **Status: Archived**, set **Archived on** (e.g. `2026-10`), remove it from **Direction order**, save and publish. It leaves Fig. 1, but its page stays with a dated "Archived" note and it is listed under "Earlier and related research".

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
- [ ] **Publications:** refresh statuses (revisions, acceptances) and their **As of** dates; add new papers and preprints; check that working papers have **Status source**.
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
3. Changes are written straight into the files on your computer (no drafts board, every Publish writes the file), and the local site at `http://localhost:3100` shows them after a reload.
4. Press **Ctrl+C** to stop. Use Git to review or throw away what you changed (`git status`, `git restore content/`).

## 12. Tips and known quirks

- **Saving after editing a body re-formats its Markdown.** When you change a rich-text body (Body, Bio, the Join texts), the editor saves the whole text in its own style: `-` list markers become `*`, and list items may get blank lines between them. The page looks the same apart from slightly more space between those list items. Opening an entry and saving other fields leaves the body as it was.
- **Bodies** support bold, italic, links, headings (level 2 and 3), quotes and lists. Switch the editor to **Markdown** mode (toggle above the text) for anything else. Code blocks and images inside bodies are turned off.
- **Long texts:** the CMS stops you at the site's limits (for example a pearl's short label at 28 characters, a news summary at 280).
- **Dates** in "As of", "Archived on" and similar fields accept `2026`, `2026-10` or `2026-10-20`.
- **Relations to people** (an author's lab person, a project team, the people in a news item) only offer people who agreed to be listed.
- The content manager works best on a laptop or desktop. In windows narrower than 800 pixels (phones), the editor shows the form only, without the preview pane and the "Check for preview" button. Use a laptop to review and publish.
- Something broken or unclear? Tell a maintainer, or open an issue on the repository.
