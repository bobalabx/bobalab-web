# Editing the BOBALAB website

This guide is for lab members who edit the website through the content manager (Decap CMS) at **`/admin/`** on the live site, today `https://bobalabx.github.io/bobalab-web/admin/`. You do not need to know Git or code. Maintainers set up the system once (`docs/SETUP-PRODUCTION.md`) and look after it (`docs/HANDOVER.md`).

Contents: [1. Sign in](#1-sign-in) · [2. Save and the Visible switch](#2-save-and-the-visible-switch) · [3. Save goes live](#3-save-goes-live-what-not-live-yet-and-hidden-mean) (the status box, [the live preview column](#32-the-live-preview-column), [what Save refuses](#33-what-save-refuses-and-what-the-site-check-is), [someone else saved this entry](#34-someone-else-saved-this-entry)) · [4. Consent rules](#4-consent-rules-people-photos-emails) · [5. Images and alt text](#5-images-and-alt-text) · [6. Research directions: order, colours, archiving](#6-research-directions-order-colours-archiving) · [7. Archive instead of deleting](#7-archive-instead-of-deleting) · [8. History: who changed what; restore a version](#8-history-who-changed-what-restore-a-version) · [9. Per-term checklist](#9-per-term-checklist) · [10. PDF accessibility checklist](#10-pdf-accessibility-checklist) · [11. Practice on your own computer](#11-practice-on-your-own-computer-no-account) · [12. Tips, phones and known quirks](#12-tips-phones-and-known-quirks) · [13. How Fig. 1 is made from your entries](#13-how-fig-1-is-made-from-your-entries) · [14. Study-design figures](#14-study-design-figures-plate_verified) · [15. Links for lab members](#15-links-for-lab-members) · [16. Writing for the site](#16-writing-for-the-site) · [17. Who can edit (owner and admins)](#17-who-can-edit-owner-and-admins)

> **People, visibility and statuses, October 29, 2026 (DECISIONS D-21).** What changed for editors:
>
> - **People are on the home page.** There is no separate People page any more: the home page's last section lists everyone, and old `/people/` links land there (section 4). Profile pages such as the PI's stay.
> - **"Visible on the website: Yes / No"** replaces the "Draft · pending lab review" switch in every entry. **No** hides the entry from the live site; this is also how you choose which members and alumni are shown (sections 2 and 4). Nothing about existing entries changed: a former draft shows as No.
> - **Publications have four statuses:** Work in progress, Under review, Under revision, Published (section 16).

> **New editor, October 2026 (DECISIONS D-17 to D-19).** What changed for editors:
>
> - **Save puts your change on the live site** in about 2 minutes. There is no separate publishing step and no waiting for a check on github.com any more.
> - The right-hand column shows **the real website** with your unsaved changes, not an approximation (section 3.2).
> - Before it saves, the content manager runs **the site's own check**. If your change would break the site, Save says so and nothing is written (section 3.3).
> - **History** lists every save of an entry with who made it. One click brings back an older version; **Undo** in the "Saved" message takes back your last save (section 8).
> - A status box at the bottom right says when your change is live, and **Recent changes** lists every save to the website (section 3.1).
> - The header **Media** page and the **Delete** button in the image library are gone (section 5).
> - You can edit and save from a phone (section 12).
> - **Who can edit**, next to Recent changes, shows who has access; the owner adds and removes editors there (section 17, DECISIONS D-20).

> **Redesign, October 2026 (DECISIONS D-13).** The site looks different from before, but what you edit is almost the same. Type and status show as plain words, lists are ruled rows, a person without a consented photo gets a square with their initials, Fig. 1 draws one line per research direction (section 13), publications have the checkbox **Study-design figure checked by the authors** (section 14), and status provenance is printed once per page as a footnote, so never type it into a field (section 16).

---

## 1. Sign in

1. You need a free GitHub account with **two-factor authentication** turned on, and the owner must give your account edit access to the lab's website repository: send the PI or a maintainer your GitHub **username** (not your email), accept the invitation email GitHub then sends you, and sign in. **Who can edit** in the status box shows who has access (section 17).
2. Open `/admin/` on the site and click **Login with GitHub**. A GitHub window asks you to authorise "BOBALAB website CMS" the first time. Approve it.
3. The CMS keeps your sign-in in this browser. On a shared or public computer, use the account menu (top right) → **Log out** when you finish.
4. If sign-in fails ("Not found" or a blank pop-up), you probably have no access yet (or have not accepted GitHub's invitation email), or the pop-up was blocked. Allow pop-ups for the site and try again.

What you can change: News, Publications, People, Research directions, Projects, Opportunities, the fixed Pages (Home texts, Join, About, Accessibility, Privacy) and site Settings (including the links for lab members, section 15).

## 2. Save and the Visible switch

**Save means "put this on the website".** Each Save is recorded on GitHub under your name and the live site updates about 2 minutes later. There is one button, **Save**, at the top of the form. While it works it reads "Saving…"; a second click does nothing, so you cannot save twice by accident. **Ctrl+S** (Cmd+S on a Mac) saves too.

**The "Visible on the website" switch** is a field in every entry, near the end of the form. It says **Yes** or **No**; press it (or Tab to it and press Space) to change it. With **No**, Save keeps the entry **off the website**: visitors who open its address get "Page not found", and lists leave it out. You still see the entry in the live column while you edit it (section 3.2). Use **No** for anything the lab has not approved yet, and to leave a member or an alumnus out of the People section (section 4). Set it back to **Yes** and Save to show the entry again; nothing is deleted either way.

> **"Visible: No" hides an entry from the website only.** The website's repository is public: anyone can read every save, hidden entries included, on github.com, now and later. Never put embargoed results, unpublished personal data, home addresses, phone numbers or anything a person has not agreed to share into any field, visible or not.

**The note next to Save** always says what Save will do with the entry as it is in the form now:

| The entry                                | The note says                                    |
| ---------------------------------------- | ------------------------------------------------ |
| Visible on the website: Yes              | Save puts this on the live site                  |
| Visible on the website: No               | Save keeps it hidden: Visible is No              |
| A person with **Listed** off             | Not listed: Save won't show this person          |
| A listed person without a profile page   | Save updates the People section of the home page |
| An opportunity                           | Save updates the Join page                       |
| A page (Home texts, Join, …) or Settings | Save updates the live site                       |

New entries start with **Visible on the website: Yes** (DECISIONS D-17, default). If the text is not ready for visitors, set it to **No** **before** the first Save.

In the collection lists, a hidden entry carries "· hidden" after its title, and the **Hidden from the website** filter above the list shows only those.

The normal path:

1. Open a collection, click its **＋** button (for example **＋ Publication**, **＋ News item**, **＋ Person**) or an existing entry, and edit. The right-hand column shows the real page with your changes as you type (section 3.2).
2. Check the column: the page, the lists it appears in, and any band that says something is still needed or would be refused.
3. Click **Save**. The status box at the bottom right follows the update until it is live (section 3.1).
4. Made a mistake? Click **Undo** in the "Saved" message, or use the entry's **History** (section 8).

The **file name** (the page address) is made when you first save: news use the date plus the title, people their name, directions the short label, and publications the first author's name, the year you create the entry and the start of the title. The live column shows the address a new entry will get ("New page · address after the first save: … · it can't be changed later"). Fill those fields in **before the first save**. The CMS cannot rename a file afterwards; ask a maintainer, who will also add a redirect. If an address would break the site's rules, the CMS does not save and says what to change. For example, a publication address may have at most 60 characters: when the first author has a long name, type only their last name for the first save, then complete the name and save again.

**Publications: last name first.** The lab's paper addresses start with the first author's **last name** and the year (`sinchaisri-2026-compliance-aware-rl`), but the CMS builds the address from the whole name in the first author field and from the year you **create** the entry. So for every new publication: type only the first author's last name, save once, then complete the name and save again. If you forget, the first Save stops once with "Not saved yet: check the address first …" and shows the address it would use; Save again keeps it as shown. For an older paper (say 2023), the address still carries this year; if it must match, ask a maintainer to add the file.

**Unsaved changes from your last visit.** If you leave an entry without saving, this browser keeps your changes (only here, never on GitHub). Next time the CMS asks: **OK** brings them back (they are still not saved until you press Save), **Cancel** throws them away. If someone else saved the entry in the meantime, Save tells you (section 3.4).

## 3. Save goes live: what "Not live yet" and "hidden" mean

### 3.1 The status box and the "Saved" message

After each Save, a message at the bottom right says **"Saved. The live site updates in about 2 minutes. [Undo]"** (section 8.3), and the **status box** below it follows the update:

| The status box says                                                            | What it means                                                                                                                                  |
| ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Saved. The live site updates in about 2 minutes.                               | GitHub has your change; the site is being rebuilt.                                                                                             |
| Live on the site ✓ · View page                                                 | Your change is live. **View page** opens it. If you still see the old page, reload it: browsers keep pages for up to 10 minutes.               |
| Live on the site ✓ · View the People section (or the Join page, the Home page) | The entry has no page of its own; it shows there.                                                                                              |
| Saved · not shown on the live site because "Visible on the website" is No      | Saved and hidden on purpose (people: "because Listed is off"). There is no View link.                                                          |
| Saved · the live site is taking longer than usual                              | More than 6 minutes. Wait a little; tell a maintainer if it stays.                                                                             |
| Saved. The live site is stuck on an earlier problem (… saved by @…) …          | An earlier save broke the site update. Your change goes live once that is fixed. **No need to undo yours.**                                    |
| Saved, but the live site did not update · What happened?                       | Your save is recorded, but the site could not be rebuilt. **What happened?** explains it in plain words. Undo your save, or tell a maintainer. |
| Saved without the site check (the preview wasn't ready)                        | Added when the check could not run in time (section 3.3). The save went through.                                                               |
| Saved without the conflict check (GitHub didn't answer)                        | Added when GitHub did not say in time whether someone else saved the entry (section 3.4). The save went through.                               |

When nothing is happening the box says **"Live site up to date"**. If the live site stopped updating, a band at the top of every screen names the save that caused it, with **[Open it]** and **[What happened?]**. If the daily rebuild failed, the band says it was not caused by a save. Saves are still recorded and go live once it is fixed.

**Recent changes** (the button in the status box) lists every save to the website, newest first and grouped by day: who, what ("News item › 2026-10-07-informs-talk"), when, and "Not live yet" until the site has it. **Open** takes you to the entry. Changes a maintainer made directly on GitHub read "changed outside the content manager".

Times are shown in your own time zone.

### 3.2 The live preview column

The right-hand column is the real website, drawn from the saved site plus your unsaved changes. Nothing in it is saved until you press Save.

- **Live preview | History** (top left) switch between the page and the entry's history (section 8).
- **Page tabs** show where the entry appears. For a news item: **Article**, **News list**, **Home page**; for a publication: **Paper page**, **Publications list**, **Home page**, **Research page**; and so on. A person gets a **Profile page** tab only when they have a profile page (the PI, or "Profile page" on). Clicking a link inside the page opens that page in the column ("Other page: …", with a button back).
- **Desktop | Phone** show the page at desktop or phone width.
- **Find my entry** scrolls to the entry on a list page and outlines it. On list pages the entry you edit is outlined with a dashed blue line and an "Editing" tag ("New · not saved yet" for a new entry).
- **Open the published page ↗** opens the live page in a new tab ("Not on the live site yet" for a new or hidden entry).
- **Show as visitors see it** shows the page exactly as visitors will see it after you save. Without it, an entry with **Visible on the website: No** is still drawn, so you can check it; the column then says "Hidden from the live site: “Visible on the website” is No. Shown here so you can check it."
- The **address line** shows the page's address and whether you see "your unsaved changes", the "saved version" or an older version.

**Why other hidden entries are missing.** The column follows the live site's rules: other entries with Visible on the website: No, people with Listed off and profile pages that are switched off never show, exactly as on the live site.

**Unfinished new entries.** A new entry shows at once, with stand-ins such as "(Title not filled in yet)" for the fields you have not filled in. Images you just uploaded show before you save.

**Bands above the page:**

- **Still needed before Save** (grey): required fields that are still empty, for example "Title, Year". They are not an error while you are still typing.
- **Fix before Save** (grey): a value in the wrong form, named down to the field, for example "Link › Address: use a full https:// address or a site path starting with /".
- **Problem** (red): "The site check would stop this save: …" (section 3.3). Fix it before you press Save.
- **Information**: for example "Not listed: the site never shows this person", what a person's consent switches show and hide, "This entry isn't on this page", "This page was on the live site. After this save, people who open its address get “Page not found”.", or "@… saved this entry 3 min ago, after you opened it. [Bring in their changes]" (section 3.4).
- If the column could not load part of the site, it says "Some entries couldn't be loaded, so the preview may be missing them and the site check is off. [Try again]".

**Hiding the column.** The eye button at the right edge hides and shows the column. While it is hidden, the History tab and the site check are off, and the note next to Save says so with a **[Show it]** button. The column always comes back when you reload.

**Keyboard.** "Skip to the live preview" is the first thing Tab reaches on an editor page, and "Back to the form" in the column takes you back.

The first time you open an entry in a new browser tab, the column needs a few seconds ("Loading the site… (3 of 8)") while it reads the whole site.

### 3.3 What Save refuses, and what the site check is

Save runs a few checks first. If one fails, **nothing is written** and a red **"Not saved: …"** band appears at the top of the form. It stays until you fix the problem, edit the named field or click **Dismiss**, and **[Go to …]** jumps to the field. Your form keeps everything you typed. A value in the wrong form is named with its place in the form, for example "Not saved: Link › Address: Use a full https:// address or a site path starting with /." (the field itself is marked in red, maybe further down the form).

The content manager refuses:

- an image without alt text, a link with an address but no link text, web addresses that do not start with `https://`, dates in the wrong format, texts longer than the site can show;
- a new entry whose address would not fit the site's rules (section 2);
- fields that are required only in some cases. Their labels say when, for example **Alt text (required with an image)**, **As of (required unless Published)**, **Status source (required unless Published)**, **Year (required with a public version)** and **Research directions (required except for work in progress)**; a paper or project needs at least one research direction unless "Visible on the website" is No;
- the same direction twice in **Direction order**, a colour that another direction already uses (section 6), and a person's photo without photo consent (section 4);
- **a file the website cannot take:** only JPG, PNG, WebP or GIF images up to 2 MB and PDFs up to 10 MB (for example "Not saved: “cv.docx” can't go on the website. Upload a PDF (at most 10 MB) or a JPG, PNG, WebP or GIF image (at most 2 MB)."). A phone photo in HEIC format, a Word file or a 3 MB PNG are refused;
- **a link to a page that is hidden on the live site,** for example a news item that links to `/people/isabelle-cho/` when Isabelle has no profile page: "This links to /people/isabelle-cho/, which is not a page on the live site. Link to /#people (the home page's People section) instead, or remove the link.";
- **hiding a page that other entries link to,** for example setting Visible on the website to No for a project that a news item links to. The band offers **[Open News item “…”]** so you can remove the link there first, then come back;
- **a name the lab has asked never to publish:** "Not saved: this entry contains a name the lab has asked never to publish. Ask the PI before adding it." The message never shows the name;
- **a save over someone else's newer save** (section 3.4).

**The site check.** Before every Save, the column runs the website's own check (the same one the site update runs) twice: on the saved site, and on the saved site with your change. It refuses only **problems your change adds**, in any entry. Problems that were already there never stop your save. For example, two publications with the same title, a colour that clashes once Settings "launched" is on, or a link that breaks because you hid the page it points to. The band names the entry and the field: "Not saved: the site check would reject this: News item “…” › Title: …". If the check is not ready (for example in the first seconds after opening an entry), Save goes through and the status box adds "Saved without the site check (the preview wasn't ready)".

Hiding a page that was already public (Visible on the website: No, or Listed or Profile page off) is **allowed**: the column only warns that visitors who open its old address get "Page not found" (DECISIONS D-05 amendment, owner to confirm). This matters most when someone withdraws consent: hide first, ask questions later.

**Other "Not saved" messages:**

| The band says                                                                          | What to do                                                                  |
| -------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Not saved: someone else saved at the same moment. Nothing was lost — press Save again. | Press Save again; every check runs again.                                   |
| Not saved: your sign-in expired. Sign in again; your changes are kept in this browser. | Log out and in again; your changes come back from this browser (section 2). |
| Not saved: couldn't reach GitHub. Check the connection and press Save again.           | Check the internet connection and press Save again.                         |

### 3.4 Someone else saved this entry

If a colleague saves the entry after you opened it, your Save stops instead of silently replacing their work: "Not saved: Isabelle Cho (@icho) saved this entry at 2:03 pm, after you opened it. Saving now would replace their change. Press “Bring in their changes” above the form; your changes stay, theirs are added, then Save again." The column may also warn you earlier: "@icho saved this entry 3 min ago, after you opened it. [Bring in their changes]".

**Bring in their changes** puts their save into your form and keeps your own changes:

- fields only they changed take their value; fields only you changed keep yours;
- where you **both** changed the same field, the form gets **their** text and shows yours below it with **[Copy my …]**, for example "You both changed Bio: the form now has their text; yours is below. [Copy my Bio]";
- if they switched a consent field off (for example **Photo consent**), it stays off.

Check the column, fix anything you want, and press **Save**. If the message says "you saved this entry in another tab or window", the button is called **Bring in that version** and works the same way.

## 4. Consent rules (people, photos, emails)

**Where people appear.** The lab's people are listed in the **People** section at the bottom of the home page. There is no separate People page any more (owner, October 2026): the header's "People" link goes to that section, and old links to `/people/` land there too. The order is the principal investigator (with photo, title, affiliation and links), then graduate students, then undergraduate RAs (lab managers first: give them a **Sort rank** of 1), then any other group, then alumni behind "Show alumni", by the year they left. A person with **Profile page** on (the PI always) also has a page of their own, linked from their name. In the content manager, the live column's **People (home page)** tab shows this section on its own, with the person you are editing marked "Editing"; a person with **Profile page** on also gets a **Profile page** tab, which opens first.

**Choosing who is shown.** To leave a current member or an alumnus out of the People section, turn their **Visible on the website** switch to **No** and Save; turn it back to **Yes** to show them again. Nothing else changes, and nothing is deleted. Someone who never agreed to appear should have **Listed** off as well (below).

**What "No" does not remove.** The person also leaves the people lists on research and project pages, and their profile page is not published. But their **name stays** where other entries name them: in the author list of papers they wrote (as plain text, without a link), on the team list of a project when they wrote one of its papers, and in news text. Their uploaded **photo file** also stays reachable at its address (`/uploads/people/…`, and the resized copies under `/media/people/`), although no page shows or links it. If someone asks to be taken off the site completely, ask the PI about the papers and news items that name them, clear **Photo** in their entry, and ask a maintainer to delete the file from `public/uploads/` (as for withdrawn photo consent, below).

The site shows people only with their consent (lab decision D-06). The switches in each person entry control this, and the live column shows what each switch hides ("Shown: photo, program. Hidden: email (Email public is off)").

| Switch                           | Off (the default)                                                             | On                                                                                             |
| -------------------------------- | ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| **Listed (consented to appear)** | The person is **never shown or linked anywhere**.                             | The person may appear in the home page's People section, as a linked author, in project teams. |
| **Photo consent**                | The photo is not shown; a square with the person's initials is shown instead. | The uploaded photo is shown, cropped to a square.                                              |
| **Email public**                 | The email is not shown.                                                       | The email is shown as a link.                                                                  |
| **Now at public**                | "Now at …" (alumni) is not shown.                                             | It is shown.                                                                                   |

Rules:

- Turn a switch on **only after the person agreed in writing** (an email is enough). Keep that email; do not paste it into the site. If someone withdraws consent, turn the switch off and **Save at once**; the live site follows in about 2 minutes.
- **Upload a photo only after photo consent.** An uploaded file is public at `/uploads/…` as soon as it is saved, even while "Photo consent" is off and no page shows it. The CMS therefore does not save a person with a photo while "Photo consent" is off. If someone withdraws photo consent, remove the photo from the entry as well and ask a maintainer to delete the file from `public/uploads/`. Older versions of the entry and the file stay readable in the repository's history on github.com (section 8.4).
- **External coauthors are not people.** In a publication, type their name in the author list and optionally their web page. Only the PI, lab members and alumni have person entries.
- Nobody becomes an "Affiliate" without their written consent.
- Project **collaborators** are shown only when their "Consent to be shown" switch is on; **partners** only when "Public" is on.
- Students who leave: set the **End** date (they move to Alumni automatically; the CMS will not save an End before the Start) and ask whether they want "Now at" shown.
- **Program:** when a member consents to appear, ask how they want their program written, with their capitalisation (for example "EECS", "Applied Math & Data Science"). Do not repeat the degree the role already shows ("Master's student · IEOR", not "· IEOR MS"). Never leave it in lower case.
- Never add anyone from old, hidden rosters on other sites. When in doubt, leave the person out and ask the PI. The CMS refuses names the lab has asked never to publish (section 3.3).

## 5. Images and alt text

- Upload **JPG, PNG, WebP or GIF** images up to **2 MB** (PDFs up to 10 MB). A larger file is refused at once by the browser ("File too large. Configured to not allow files greater than 2097 kB."; 2 MB is 2097 kB in that message, and for PDFs it says 10485 kB), and Save refuses any other type (section 3.3). Do not upload SVG, HTML or other files. The site does not show images from other websites, so always upload.
- Upload images from the image field of the entry (**Choose an image**). The header **Media** page and the **Delete** button in the image library are gone, because both changed the live site at once, without Save. To delete a file, ask a maintainer.
- **Give every new file its own name.** If a file with the same name is already on the site, the upload is refused: "A file with this name is already on the site. Rename your file (for example isabelle-cho-2026.jpg) and upload it again." (Replacing it would delete the old file from the site at once.)
- An uploaded image shows in the live column straight away, but goes onto the website only when you press Save.
- Only upload images the lab may use (your own figures, photos with the person's permission, figures from your paper when the publisher allows it).
- **Alt text is required whenever an image is set** (the CMS will not save without it). Write one sentence that says what the image shows and why it matters, as you would describe it on the phone:
  - Good: "Line chart: couriers' delivery times fall over their first 200 orders, faster for those who follow recommendations."
  - Good (headshot): "Portrait of Jane Doe."
  - Avoid: "image", "figure 1", "photo.jpg", or repeating the caption word for word. Do not start with "Image of".
- **Headshots** are shown as squares, so the edges of a wide or tall photo are cut off. Upload a head-and-shoulders photo with the face near the middle.
- For charts, put the key takeaway in the alt text and the details in the caption or "What this shows".
- Rich-text bodies cannot hold images; use the image fields (Figure, Hero image, Teaser image, Image), which enforce alt text.

## 6. Research directions: order, colours, archiving

The research directions are the lines of Fig. 1 on the home page. Each line ends in a black pearl at the "now" rule (section 13). The CMS hints still say "pearls"; they mean the same thing.

**Reorder the lines (pearls).** Go to **Settings → Site → Direction order**. Each item shows the direction's address (for example `ai-at-work`, the file name of the direction). Drag an item by its handle (the two lines at the top of the item), or use the keyboard: press Tab until the handle is focused (a screen reader announces "Reorder “ai-at-work”, item 2 of 4"), then press the **Up** or **Down arrow** key once per step; the focus stays on the item and its new position is announced. Then Save. The order lives in this one list on purpose: changing it never needs edits to several direction entries at once. Each live direction must appear exactly once (the CMS will not save a direction listed twice); archived directions are left out.

**Remove an item** with the **×** at its top right. An item that opens as an empty choice is a direction that has been archived: remove it.

**Add a direction.** Create it under Research directions (fill in the **short label** first: it becomes the address), then add it to **Direction order**. Up to 8 directions fit; with 7–8, consider **Settings → Site → Fig. 1 layout: Dot plot**.

**Choose a colour.** Each direction needs its **own** colour: the CMS will not save a colour that another live (not archived) direction already uses. The colour is a data colour: it draws the direction's line in Fig. 1 and the short line segment next to the direction's name on papers, projects and news. Links and headings stay black. The live column shows the colour on the real pages, and its information band lists the colours the other live directions use. While you choose a colour (a new direction, or a changed colour), it also warns when the colour is hard to tell apart from one that another direction uses now, for example "Hard to tell apart from Jasmine (the colour of “…”) for some colour-blind readers.":

- The four live directions use Butterfly pea (blue), Lychee (rose), Matcha (green) and Oolong (brown). These four were retuned for the redesign and checked against each other for colour-blind readers.
- Jasmine (teal) and Black sesame (charcoal) are used by the two archived directions. Taro (violet) and Thai tea (orange) are **reserve** colours.
- Easy-to-confuse pairs (recomputed 2026-10-24): **Jasmine** with Black sesame, Butterfly pea, Lychee or Matcha; **Thai tea** with Matcha, Lychee or Oolong; **Taro** with Butterfly pea or Black sesame. In short: a fifth live direction should not use Jasmine or Thai tea, and Taro conflicts with Butterfly pea.
- The automatic check warns about shared or confusable colours; fix it before launch.

**Archive a direction** instead of deleting it (section 7): set **Status: Archived**, set **Archived on** (e.g. `2026-10`) and Save; then open **Settings → Site**, remove it from **Direction order** (×) and Save. It leaves Fig. 1, but its page stays with a dated "Archived" note and it is listed under "Earlier and related research".

## 7. Archive instead of deleting

The CMS has no Delete button for entries, on purpose: every page has a permanent address, and links to it from other sites, papers and search engines would break. Instead:

| Entry                          | How to retire it                                                                                                         |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| Research direction             | Status **Archived** + Archived on date; remove from Direction order (section 6).                                         |
| Project                        | Status **Archived** (or Completed).                                                                                      |
| Person                         | Set the **End** date (alumni), or switch **Listed** off if they no longer want to appear.                                |
| News, publication, opportunity | Set **Visible on the website** to **No** to hide it; for opportunities, set Status **Closed** with a new **As of** date. |

A hidden entry can come back at any time: switch it on again and Save. If other entries link to the page you hide, Save asks you to remove those links first (section 3.3).

If a page really must go, or its address must change, ask a maintainer: they remove or rename it and add an entry under **Settings → Site → Redirects** (old address → new address), so old links still work.

## 8. History: who changed what; restore a version

### 8.1 The History tab

Click **History** at the top of the live column (or the "Last saved by … · 2 days ago" line under it). It lists every save of this entry, newest first, 30 at a time (**Show older saves** for more):

- each row shows the person's picture and name and what they did: "changed Title, Photo", "created this entry", "restored the version from Oct 24", "saved without changing the content (formatting only)", or "changed this entry (outside the content manager)" for a maintainer's change on GitHub;
- the second line says how long ago, in your own time zone; hover it for the exact time;
- the newest row carries **Current version**; rows the live site does not have yet carry **Not live yet**;
- while the form has unsaved changes, "Your unsaved changes (not saved yet)" sits on top;
- a new entry that was never saved shows "No history yet. The first row appears when you save."

**Personal details stay private in History.** For people, the values of Email, Now at, Photo, Photo alt text and CV are never shown when the matching switch is off now, or when the person is not listed: the row reads, for example, "Email: changed (hidden: Email public is off)".

### 8.2 Look at an older version and restore it

Click a row. It opens to list its changes, and the column shows the page **as Restore would save it**, with an amber band: "Older version · saved by Jazz Beecham on Oct 24, 2026, 10:02 am. The form still has the current text; Save saves the form, not this version." Nothing changes until you choose:

- **Restore this version** opens a short dialog: what comes back, which later saves it replaces, and what the content manager keeps as it is now (below). Press **Restore this version** again and it is saved like any other Save, with every check; the live site updates in about 2 minutes. Tick **Let me check it in the form first (don't save yet)** to put the old values into the form and save them yourself.
- **Back to the current version** or **Back to History** leave everything as it was.

**What Restore never brings back by itself** (so that a withdrawn consent stays withdrawn, DECISIONS D-19):

- **Consent and visibility switches** (Listed, Profile page, Photo consent, Email public, Now at public; a project collaborator's "Consent to be shown" and a partner's "Public") can go from on to off, **never from off to on**. Switch them on yourself, after checking the person still agrees.
- **Removed personal details** (email, now at, photo, CV) stay removed unless you tick **Also bring back removed personal details (email, now at, photo, CV)** in History's dialog. Undo never brings them back.
- If Photo consent stays off, the photo and its alt text are cleared.
- **Visible on the website:** an entry that is hidden now (No) stays hidden unless you tick **Also make it visible on the live site**.
- **Old publication statuses:** a version saved before October 29, 2026 may have a status the site no longer uses (for example "major-revision"). Restore brings it back as today's status ("Under revision") and says so.
- **Images:** Restore brings back the file name, not the picture. If the file has been deleted or replaced since, the field is cleared and the dialog says so; the column shows the file that is at that address **today**. Bringing back an old picture is a maintainer task.

If a check refuses the restored version (for example because it links to a page that is now hidden), the old values stay in the form with the band "These are the values from Oct 24. Fix the marked problem, then press Save. [Cancel restore]".

### 8.3 Undo

- **Right after a save:** the "Saved" message offers **Undo** for 30 seconds (it waits while the mouse or keyboard is on it). Undo acts at once, without asking, and only on the entry you just saved: it saves the version from before your save, with every check and the same consent rules as Restore. The entry may close and reopen once (under a second) while Undo works; that is expected. If you have already moved on, typed something new or opened another entry, the message closes ("Undo is in this entry's History") and Undo is the **Undo this change** button on the top row of the entry's History instead.
- **Later:** open the entry's History and click **Undo this change** on the top row, or pick an older row and **Restore this version**.
- **A new entry** cannot be undone (there is no older version): to take it off the site, set "Visible on the website" to No (people: or turn off "Listed" if they withdrew consent) and Save.

Undo and Restore never delete anything: the version you replaced stays in History.

### 8.4 Revert is not erasure

The repository is public, so **every saved version stays readable on github.com**, photos and emails included, even after you restore an older version or hide the entry. Restore only changes what the website shows. If something personal was saved by mistake, hide it at once (section 4) and tell a maintainer: removing it from the history needs a maintainer and possibly GitHub Support.

## 9. Per-term checklist

At the **start of each term** (PI or a maintainer):

- [ ] **Onboard new editors:** each has a GitHub account with 2FA; the owner invites them under **Who can edit** (section 17); they accept GitHub's email, sign in once, read this guide and try the local practice mode (section 11).
- [ ] **Offboard leavers:** the owner removes them under **Who can edit**, and cancels invitations nobody accepted.
- [ ] **People:** add new members only with consent (section 4); set **End** dates for people who left; ask leavers about "Now at" and email consent; check photos still have consent.
- [ ] **Opportunities and Join page:** update each opportunity's **Status** and **As of** date (URAP rounds open and close every term); make sure nothing says "open" without a dated source.
- [ ] **Publications:** move each paper's **Status** on where it changed (Work in progress → Under review → Under revision → Published, section 16) and update its **As of** date; add new papers and preprints; check that every paper that is not Published has **Status source**; turn on **Study-design figure checked by the authors** only for figures an author has approved (section 14).
- [ ] **News:** add the term's talks and awards; past events stop showing "Upcoming" automatically after the next rebuild.
- [ ] **Directions:** confirm the order and colours; archive directions the lab no longer pursues.
- [ ] **Accessibility and Privacy pages:** review the text and update **Last reviewed**.
- [ ] **Recent changes:** skim the term's saves (status box → Recent changes) for anything unexpected.
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

Maintainers and curious editors can try the content manager without a GitHub account. It behaves like the live one: one-click Save, the live column, the checks and the "Not saved" band.

1. In a copy of the repository, run `npm ci` once, then **`npm run cms:local`**.
2. Open **`http://localhost:3100/admin/local.html`** and click **Login**.
3. **Save writes straight into the files on your computer.** The status box says "Local demo: Save writes to this computer" and, after a save, "Saved to this computer (local demo: there is no live site)". There is no deploy to follow, no Undo message and no conflict check. The History tab and Recent changes read the real history on GitHub (bobalabx/bobalab-web), not your computer's.
4. An image you upload into an entry shows in the live column at once, but the form's own small thumbnail may show as a broken image until you press Save (the local demo serves new files only once they are saved); the upload itself is fine.
5. The local site at `http://localhost:3100` shows saved changes after a reload. One exception: the own page of an entry you **created** (for example `/news/<new-address>/`) may say "not found" until you stop and restart `npm run cms:local`, because the local site works out the list of pages once; the live column and lists such as `/news/` show the new entry at once.
6. Press **Ctrl+C** to stop. Use Git to review or throw away what you changed (`git status`, `git restore content/`). To run the demo's proxy on another port, start it with `CMS_PROXY_PORT=8097 npm run cms:local`; the page follows that port.

## 12. Tips, phones and known quirks

- **Phones and small windows.** You can edit and save from a phone. Below 800 pixels a switch at the bottom of the screen toggles between **Edit** (the form) and **Preview & history** (the live column at phone width, with a "Page" menu instead of the tabs). Save stays at the top. The status box sits just above the switch.
- **Saving after editing a body re-formats its Markdown.** When you change a rich-text body (Body, Bio, the Join texts), the editor saves the whole text in its own style: `-` list markers become `*`, and list items may get blank lines between them. The page looks the same apart from slightly more space between those list items. Opening an entry and saving other fields leaves the body as it was.
- **Bodies** support bold, italic, links, headings (level 2 and 3), quotes and lists. Switch the editor to **Markdown** mode (toggle above the text) for anything else. Code blocks and images inside bodies are turned off.
- **Long texts:** the CMS stops you at the site's limits (for example a pearl's short label at 28 characters, a news summary at 280).
- **Dates** in "As of", "Archived on" and similar fields accept `2026`, `2026-10` or `2026-10-20`.
- **Relations to people** (an author's lab person, a project team, the people in a news item) only offer people who agreed to be listed.
- **The first save of a file may change lines you did not touch.** The CMS writes the whole file in its own style: long texts are wrapped at 80 characters, quotes around dates are dropped, fields follow the editor's order and empty settings such as `social: {}` disappear. The site reads both forms the same way, and History calls such a save "saved without changing the content (formatting only)".
- **Opening an entry by its address.** If you paste or type another entry's address into the address bar while the editor is open, the page reloads to show that entry (the editor would otherwise keep showing the previous one). If you see "Not saved: the editor still shows …", reload the page (F5) and make the change again.
- **Drag announcements for screen readers.** When you drag an item with the mouse, the spoken messages name the item and its position. Lists cannot be reordered with Space and the arrow keys as the built-in instructions of the drag library suggest; use the Up and Down arrow keys on the focused handle (section 6). The tags of multi-select fields (for example a project's Research directions, where the first is the project's home direction) can be dragged with the mouse; without a mouse, remove the tags with their × and add them again in the order you want.
- **"Save and add another" and "Save and duplicate"** are gone from the Save button. Duplicate is still in the **Saved** menu of an unchanged entry.
- **The first-use tip.** The first time you open the editor, a tip explains Save; **Got it** closes it for good in this browser.
- Something broken or unclear? Tell a maintainer, or open an issue on the repository.

## 13. How Fig. 1 is made from your entries

Nobody draws Fig. 1 by hand. Every build draws it again from the content, so it updates about 2 minutes after you save. What it shows comes from these fields:

| What you see in Fig. 1                                                                | Where it comes from                                                                                                                                                                                                                                              |
| ------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| One horizontal line per research direction, top to bottom                             | The live directions in **Settings → Site → Direction order** (section 6). Archived directions are left out. Directions with Visible on the website: No appear only in preview builds.                                                                            |
| The line's colour and its label                                                       | The direction's **Colour** and **Short label** (at most 28 characters).                                                                                                                                                                                          |
| A filled dot on a line, at a year                                                     | A publication that lists the direction under **Research directions** and **counts as a paper**: it has a **DOI**, or an SSRN, arXiv, PDF or publisher link, or a **presentation** with a source link. Its **Year** places it. Order within a year means nothing. |
| A short vertical link joining two dots                                                | A counted paper with two research directions appears on both lines, and the link joins them.                                                                                                                                                                     |
| Where a line starts                                                                   | The direction's earliest counted paper.                                                                                                                                                                                                                          |
| The black pearl at the "now" rule                                                     | The direction today. Clicking it (or its label) opens the direction's page.                                                                                                                                                                                      |
| Open rings after the "now" rule                                                       | Work in progress: entries tagged with the direction that do not count as a paper yet (no public version and no documented talk). They are not placed by date.                                                                                                    |
| The counts beside each label ("4 papers, 2 in progress") and "As of …" in the caption | Counted from the same entries on the day of the build.                                                                                                                                                                                                           |

To get a paper onto the figure, add its public link or DOI (or a presentation with its source link), its **Year** and at least one **Research direction**, then Save. The live column's **Home page** tab shows the result before you save. To move a direction's line, change **Direction order**. Without JavaScript, and for screen readers, the same counts and the publications list carry the same information.

## 14. Study-design figures (`plate_verified`)

Some papers have a **study-design figure**: a small diagram of how the study was set up (for example the virtual-kitchen experiment in Bastani et al. 2026). These figures are written in code by a maintainer, one per paper. They show design facts only, never results, and each one names its source. You cannot draw one in the CMS. Ask a maintainer if a paper should have one.

Each publication has a checkbox, **Study-design figure checked by the authors** (`plate_verified` in the file):

- **Off** (the default): the figure appears only in **preview builds**, so the authors can check it. The live site does not show it.
- **On**: the live site shows the figure on the paper's page (today the only page that shows study-design figures).
- Turn it on **only after an author of the paper has checked the drawing** against the paper and said it is right. Keep that email; do not paste it into the site. If an author later finds a mistake, turn the box off and Save at once, then ask a maintainer to fix the drawing.
- The checkbox does nothing for a paper without a figure.

## 15. Links for lab members

**Settings → Site → Links for lab members** holds links to internal tools, such as the lab scheduler. They appear in the **Lab members** column of the site footer, next to the "Reduce motion" switch, and at the foot of the home page's People section.

- **Link text:** short, for example "Lab scheduler" (at most 40 characters).
- **Address:** a full address starting with `https://`.
- **Description (optional):** one line on what the link is for and who can use it, for example "Weekly lab meeting scheduling (lab members sign in with Google)."
- These links are **public**: anyone can see them in the footer and in the repository. Only add tools that ask for a sign-in themselves. Never add a link that works for anyone who has it, such as a shared document's "anyone with the link" URL.
- If the list is empty, the footer column is headed "Display" and holds only the "Reduce motion" switch.

## 16. Writing for the site

The redesign follows one rule for words: say what the lab does, plainly, and let the fields carry status and provenance.

- **Status goes in fields, not in prose.** Use **Status**, **Status note**, **As of** and **Status source** (see "Publication status" below). The site prints the status as plain words ("Under revision at Manufacturing & Service Operations Management"), without the date or the source. Never type "reported by the lab", "status not confirmed" or "as of the last check" into a body or summary.
- **Don't describe the site or the pipeline.** Avoid sentences such as "This direction collects…", "listed by title only", "filed here so that…" or "no abstract has been reviewed yet". If an item has no summary, leave the summary empty; the page lists its title and status.
- **Direction bodies** (80–150 words) start with the research itself. The page already opens "Why it matters" with the direction's one-line summary, so don't repeat it. Describe what each paper studies. Leave findings to the Findings list, which needs an evidence label and a paper.
- **Write sentences, not tags.** Say "a submitted paper asks when…", not "when… (a submitted paper)". The lists under the text already show each item's type and status.
- **Vary the wording between pages.** If every direction ends "Newer work includes…", readers notice the template. Only call work "newer" or "later" when the dates show it.
- **Credit co-authors.** Don't write "Park Sinchaisri carried out" a paper that has other authors; name the paper or the lab instead. Project collaborators whose "Consent to be shown" is off are hidden on project pages (section 4), so don't name them in running text either; the author lists on paper pages are citations and stay as published.
- **Name the lab sparingly.** The home page and the header already name BOBALAB. In the mission, the About text and the Join texts, write "we" or "the lab".
- **No arrows, emoji or all-caps labels** in titles or summaries. The site adds its own link styling.
- **Only facts with a source.** Do not round a talk that was "announced" into one that was "given", or a paper Under review into a Published one. If you are unsure, ask the PI and leave the cautious wording.

**Publication status.** Every publication has one of four statuses (owner decision, October 2026; DECISIONS D-21):

| Status           | Use it when                                                                                 | The site prints                                        |
| ---------------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| Work in progress | Not submitted yet. A working paper or preprint with an SSRN or arXiv version is still this. | Nothing more for a working paper (its type says it)    |
| Under review     | Submitted to a journal or conference, waiting for a decision.                               | "Under review at Production and Operations Management" |
| Under revision   | The journal asked for a revision (major or minor revision, revise and resubmit).            | "Under revision at Operations Research"                |
| Published        | Accepted, forthcoming or in print.                                                          | Nothing: the journal and year say it                   |

- **Status note** is printed right after the status: write "at Operations Research" or "at Manufacturing & Service Operations Management (second round)". Anything else follows a comma ("Work in progress, v2").
- Everything except Published also needs **As of** (when the status was last checked) and **Status source**; the content manager will not save without them.
- **The status never decides whether a paper is listed.** A paper is listed with the papers and drawn as a dot in Fig. 1 when it has a public version (a DOI, or an SSRN, arXiv, PDF or publisher link) or a presentation with a source link (section 13), whatever its status. A Work in progress without any of these is listed under "Work in progress" instead.
- A preprint's **Venue** says what it is ("arXiv preprint"): the citation and BibTeX read it from there.

## 17. Who can edit (owner and admins)

**Who can edit**, the button in the status box at the bottom right (next to **Recent changes**; on a phone, open **Recent changes** and it is at the top), lists everyone who can sign in to the dashboard and save, and the invitations nobody has accepted yet. Everyone can open it. Only the owner account **bobalabx** can change the list (or, if the lab ever moves the website to a GitHub organization, the repository's admins; `docs/HANDOVER.md` §4). Everyone else sees whom to ask. In the local practice mode (section 11) the button only explains that access is managed on the live dashboard.

**The extra permission.** Your everyday sign-in only lets the dashboard save the website. To manage editors, the panel first says **"Managing editors needs one extra GitHub permission"**:

1. Press **Give permission**. A GitHub window opens. Check that it shows the owner account, then approve. GitHub describes this permission as full control of all the account's repositories, public and private; the dashboard uses it only to list, invite and remove the website's editors. If nothing opens, allow pop-ups for the site and press it again.
2. The lists appear. The dashboard page forgets the permission when you reload or close it, when you press **Turn it off now** at the bottom of the panel, and after at most 8 hours. Next time, press **Give permission** again (the GitHub window may then open and close by itself).
3. If GitHub was signed in with another account, the panel says so ("GitHub gave the permission for @…, but you are signed in to this dashboard as @…"). Switch accounts on github.com, then press **Try again**. That other account has now given the permission on GitHub too; withdraw it there as described below.

**GitHub itself keeps the permission** for the account until you withdraw it: on github.com, **Settings → Applications → Authorized OAuth Apps → BOBALAB website CMS → Revoke**. Forgetting it in the dashboard does not withdraw it. Withdrawing also signs that account out of the dashboard at once (its everyday sign-in goes with it); the next sign-in asks for approval again. GitHub may also add the wider permission to the owner account's later everyday sign-ins to the dashboard.

If the panel says **"GitHub didn't show who can edit"**, GitHub wants one more permission than the dashboard can ask for today: tell a maintainer (DECISIONS D-20) and, until it is fixed, add and remove editors on github.com (repository → **Settings → Collaborators**; the panel links there).

**Add an editor:**

1. Ask the new editor for their **GitHub username**, not their email address. No account yet? They make a free one at `github.com/signup`, turn on two-factor authentication (section 1) and send you the username.
2. **Who can edit → Invite someone:** type the username and press **Look up** (or Enter). Check that the photo and name are the right person (**See their GitHub profile** opens it), then press **Send invitation**.
3. The panel says **"Invitation sent. <name> must accept the email from GitHub before they can sign in."** They open the invitation email from GitHub and accept it.
4. They sign in at `/admin/` (section 1). Until they accept, they are listed under **Invited, not accepted yet**; **Cancel invitation** withdraws it. An invitation marked **Expired** must be cancelled and sent again.

GitHub allows at most 50 invitations a day for the repository.

**Remove an editor** (someone who left the lab): **Who can edit → Remove** next to their name. The confirmation reads "<name> will no longer be able to sign in to the dashboard or save. Their past changes stay in History." Press **Remove <name>**. The owner account itself is never offered for removal. An admin of an organization can remove their own access; the confirmation then warns that it happens at once and that only another admin can add them back.

Removing someone ends their access to the repository; a sign-in left in their browser can no longer save (DECISIONS D-20).
