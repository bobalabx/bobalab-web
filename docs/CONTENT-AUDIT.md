# Content audit (sanitized for the repo)

**Written by:** WP7, 2026-10-20. **Source:** the research team's content audit and reconciled dataset (S1, critic-fixed), which stay **outside** the repo because they mention people who are not on the public roster. This file keeps the same structure but contains no hidden-roster names, no names of CV-only advisees and no hidden-card photo file names. `tests/content/wp7-hidden-names.test.ts` guards the hidden-only names.

**How the content was imported:** `scripts/import/import-dataset.mjs` (see `scripts/import/README.md`), following `docs/CONTENT-MAPPING.md` and `docs/DECISIONS.md` D-03…D-06. Open items for the PI: `docs/CONTENT-QUESTIONS.md`.

**Labels.** DOCUMENTED = an official or primary source states it. CORROBORATED = two or more independent sources agree. HYPOTHESIS = our inference. UNKNOWN = not determinable from public sources. PI-reported = appears only on pages the PI controls (personal site, CV, Haas profile text).

**Review status → draft flag.** `verified` (facts checked against a primary source) → `draft: false`. `needs-lab-approval` or `missing` → `draft: true`. Exceptions (D-04, D-06): every direction and every person except the PI is a draft regardless.

**What was checked (2026-10-20, by the research team):** the PI site and CV (re-fetched), the site's public GitHub commit history, Crossref for 13 DOIs, the arXiv API for 4 IDs, the MSOM 2026 and CSCW 2025 programmes, award pages (INFORMS, AOM OSCM, POMS), the Haas profile and teaching-awards page, the URAP listings, the CHI 2025 workshop page, the two press articles on the teachers' study, and RDAP for bobalab.org. WP7 additionally confirmed (MEASURED, `curl -I`) that four http-only links in the dataset are served over https, so they were upgraded.

---

## 1. Verified and ready

**Lab identity (as published, DOCUMENTED).**

- Name forms in use: "BOBALAB"; "Berkeley Operations and Behavioral Analytics Lab"; "Berkeley Operations & Behavioral Analytics (BOBALAB)".
- The only university pages that use the name are the UC Berkeley URAP Fall 2026 listings: four tracks (modeling/theory; experimental systems/game building; research generalist/operations; data science/econometrics/algorithms) under the project family "Improving Human-AI Interactions in the Future of Work". Fall 2026 applications are closed. These listings are the best public source for the lab's own description and its current questions.
- No Haas lab page exists (DOCUMENTED absence on the Haas research-labs page).

**PI facts (DOCUMENTED / CORROBORATED).** Display name Park Sinchaisri; formal name Wichinpong "Park" Sinchaisri; citation name Wichinpong Park Sinchaisri. Assistant Professor, Operations & IT Management (OITM) group, Haas, since 7/2021. ORCID 0000-0001-9351-0541; Google Scholar viBF-ekAAAAJ; LinkedIn /in/xalapao. Earl F. Cheit teaching awards in 2024 and 2026.
→ `content/people/park-sinchaisri.md` (`draft: false`; no bio written).

**Published papers (Crossref-checked; `draft: false`).**

| File (`content/publications/…`)      | Citation core                                                                 |
| ------------------------------------ | ----------------------------------------------------------------------------- |
| `sinchaisri-2021-community-vibrancy` | PLOS ONE 16(12): e0257530 (2021); arXiv 2008.01778                            |
| `allon-2023-gig-drivers`             | M&SOM 25(4): 1376–1393 (2023); online ~Mar 2023; SSRN 3274628                 |
| `bastani-2026-rl-tips`               | Management Science 72(1): 733–755 (2026); online 2025-05-22; arXiv 2108.08454 |
| `keppler-2025-making-chatgpt-work`   | PACM HCI 9(2): 1–23 (2025); CSCW 2025; SSRN 4700354                           |
| `jiang-2025-learning-on-the-go`      | PACM HCI 9(7): 1–35 (2025); CSCW 2025; SSRN 5376462                           |

Also `draft: false` because their review status is verified: `keppler-2026-teachers-knapsack` (SSRN 4924786) and `liu-2026-strategic-advice-personal-ai` (arXiv 2603.02055, v2).

**Public preprints and working papers (existence DOCUMENTED).** SSRN: Markdown Pricing, Multihoming, Learning to Gig (registered metadata stale, §6), Teacher's Knapsack, Dispatching to Develop. arXiv: Strategic Advice; Stale, Misattributed, or Late.

**Presentations confirmed in official programmes.** MSOM 2026 (HBS, 2026-07-14): Compliance-Aware RL (TB8), Strategic Advice (TD10), Planning vs. Execution (TD10). CSCW 2025 (Bergen): both PACM HCI papers. CHI 2025 workshop poster: Precise or Broad (earlier title). These carry an evidence `url` in the content, so they count as public versions (D-05).

**Awards confirmed by the awarding body.** AOM OSCM Best Student Paper 2019; INFORMS BOM Best Working Paper (3rd place 2019; 1st place 2021, under an earlier title); INFORMS TIMES Best Working Paper (runner-up 2024; 2021 listed among winners without a rank); INFORMS SAS Data Mining Best Paper 2022; INFORMS Service Science Best Paper Competition finalist 2022; POMS COE Best Junior Scholar Paper runner-up 2023; Wharton People Analytics competition 2nd place 2019.

**Members as displayed on the PI site.** 9 current members and 25 visible alumni (21 "Berkeley", 4 "Others"). Imported per D-06 as drafts with all consent flags false; the 4 "Others" are `listed: false`. Topic tags on the site are the lab's own two: "human-ai" and "future of work" (not imported as directions).

**News.** 13 of the 15 PI-site items are verified (8 also confirmed externally) → `draft: false`. The rest are drafts (§2).

**Opportunities.** The URAP route is DOCUMENTED (tracks, 9–11 hours a week, remote possible) → `content/opportunities/urap.md`, `status: closed`, as of 2026-10-20, `draft: false`.

---

## 2. Tentative: needs lab approval

**Identity and settings**

1. Canonical long name: the About paragraph says "…Analytics Lab"; the section heading drops "Lab" and uses "&". `site.yml` uses the "and … Lab" form (H-12 default A, flagged).
2. Lab email `bobalab@berkeley.edu`: printed on the PI site but not linked; we cannot confirm the mailbox is monitored. Used in `site.yml` and all drafts (flagged).
3. X/Twitter: the PI site and the Haas profile link two different handles. `site.social` is empty.
4. bobalab.org: registered 2026-09-21 via Cloudflare (registrant redacted); redirects to a members-only scheduler. Ownership UNKNOWN; not used.
5. About text: a paraphrase of the lab's URAP description, `draft: true`.
6. Region gating: the PI site hides lab content from visitors detected in Thailand. The lab site has no gating (H-18 default); the PI should confirm.

**Roster** 7. Listed both as current and as alumni: Shunan Jiang, Chelsea Kawamura, Austin Zhu. Imported as alumni (with `end`), pending the PI. 8. Display names: the roster card misspells Haonan (William) Deng's first name; the CV form is used. "Jerry Zhu" appears under a different given name in the CV. 9. Class years: Kawamura '25 (site) vs '26 (CV) → `end: "2025"` provisionally. Ron Wang and Jerry Zhu have no year on the site; the CV's '24 is used. Deng is MS '26; is he still current? 10. Ryan Xu is on the roster but not in the CV student list. 11. The CV lists 13 Berkeley advisees who appear nowhere on the PI site, plus 4 CV advisees who appear only on hidden cards. Their lab membership is UNKNOWN; they are **not imported** and their names are withheld from this repo. 12. Hidden roster cards: 25 commented-out cards (9 match visible alumni, 4 match CV-only advisees, 12 appear nowhere else). Nothing from them is imported. The 12 hidden-only names are guarded by a salted-hash test. 13. "Others" alumni: one external student and three Penn-era mentees. Imported `listed: false`, role `affiliate`. 14. Placement wording differs between site and CV for two alumni (Thomas Yeoh, Nick Melamed). 15. Collaborators: 20 external coauthors are **not** people (D-05). They appear as author names (with a homepage link where the PI site has one) and as project `collaborators` with `consent: false`.

**Research content** 16. Which papers count as BOBALAB work (H-3): the dataset marks 7 items as lab work (6 with a lab-member coauthor, plus Precise or Broad, named in the URAP listing). The URAP listing cites Management Science, M&SOM and PLOS ONE as outlets for "our work". 17. Every working-paper status is self-reported and carries `status_source: self-reported` and `as_of`. 18. Items not on the PI site: Dispatching to Develop (SSRN) and Stale, Misattributed, or Late (arXiv), both with author "Haonan Deng" (linked to the lab member as a HYPOTHESIS). Four items appear only in the CV. 19. Project groupings are inferred from shared coauthors and topics. 20. All direction text, project summaries and publication summaries are drafts. Summaries inferred from a title only are **not imported** (empty `in_brief` / `summary`). 21. News: four items drafted from public records are not on the PI site; three items are PI-personal (two Cheit awards, a Fisher Center grant). 22. Opportunities: email routes depend on item 2; advertising course credit depends on the PI. 23. Taxonomy: see §7.

---

## 3. Missing

- A mission statement written for the site (a draft paraphrase is in `content/pages/home.yml`).
- Founding year and history (UNKNOWN; earliest Berkeley alumni are class of '23; the PI joined 7/2021).
- An official logo (the scheduler ships brand files that were not viewed; owner unknown).
- Photos: none imported; consent needed for each person (§4).
- Member bios, pronouns, preferred names, interests; expanded program names (codes such as "eecs" are kept as shown).
- Placements for three Berkeley alumni (Lawrence Chen, Brandon Chin, Edward Lee).
- A PhD/postdoc recruiting statement.
- Lab location (only the PI's mailing address is public).
- Public drafts or abstracts for: Compliance-Aware RL, Sequencing Incentives, Learning Across Jobs, Experimentation without Experiments, Fruits of Labor, Planning vs. Execution, Act/Ask/Defer, the GenAI pricing simulation, the cancer-recognition WIP, and Non-adoption (link broken).
- ACM article numbers for the two PACM HCI papers.
- Code, data and slides links for every paper.
- News after 2026-05-11 (MSOM talks in July 2026 and the Aug/Oct 2026 preprints happened).
- Rank of the 2021 INFORMS TIMES award.
- Independent sources for PI-reported honours (WISE 2022, POMS CBOM 2020/2021, MIT ORC 2017, MS Meritorious Service) and grants (Fisher, BAIR, Center for Growth Markets, Fishman Davidson, Ackoff).

---

## 4. Assets requiring permission

Checked by HEAD request only; nothing was opened, downloaded or imported (D-06). Do not hotlink; re-host only with consent, through `public/uploads/` and `npm run media`.

| Asset                                          | Source                                                  | Permission from                           | Note                                       |
| ---------------------------------------------- | ------------------------------------------------------- | ----------------------------------------- | ------------------------------------------ |
| PI headshot                                    | parksinchaisri.github.io/images/parkweb.png             | Prof. Sinchaisri                          | 1.19 MB                                    |
| Current-member photos (10)                     | parksinchaisri.github.io/bobalab/ (visible cards)       | each member                               | two need resizing (3.0 MB and 6.1 MB)      |
| Two roster photos hotlinked from third parties | LinkedIn CDN (expired) and a umich.edu profile          | each person                               | need new files                             |
| Hidden-card photos (22)                        | parksinchaisri.github.io/bobalab/ (file names withheld) | each pictured person                      | not displayed on the PI site; do not reuse |
| Penn mentorship photos (5)                     | parksinchaisri.github.io/files/stouffer1–5              | Prof. Sinchaisri and anyone identifiable  | not viewed                                 |
| Urban-project photos (4)                       | parksinchaisri.github.io/files/tus1–4                   | Prof. Sinchaisri / photographer (UNKNOWN) | not viewed                                 |
| Self-hosted paper PDFs (8)                     | parksinchaisri.github.io/files/paper-*.pdf              | Prof. Sinchaisri; publisher terms         | linked, not re-hosted; one returns 404     |
| Possible lab logo                              | scheduler.bobalab.org/brand/…                           | whoever runs bobalab.org                  | not viewed                                 |
| PI-site favicons                               | parksinchaisri.github.io                                | Prof. Sinchaisri                          | personal, not a lab mark                   |

Uploaded PDFs and slides must meet WCAG 2.1 AA by 2027-04-26 (UC Berkeley DAP); prefer links to external copies.

---

## 5. Publications needing updated links or statuses

| File                                                                       | Issue                                                                                                    | Suggested action                      |
| -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| `lee-2025-non-adoption-algorithmic-advice`                                 | Only link returns 404; no venue found                                                                    | Working PDF and current venue         |
| `blaettchen-2026-precise-or-broad`                                         | PDF is a Dropbox share link; an unlinked self-hosted copy exists; status self-reported                   | Pick one stable PDF                   |
| `allon-2026-multihoming-workers`                                           | Site says "Submitted to OR" (edited 2026-04-16); CV says R&R (2026-08-10); R&R used                      | Confirm                               |
| `hariss-2020-markdown-pricing`                                             | Site "2nd round" vs CV "Major Revision"; SSRN version from 2020                                          | Confirm; newer draft?                 |
| `deng-2025-learning-to-gig`                                                | Crossref still has the old title and 3 authors; author order differs between site and Haas               | Update SSRN or confirm list/order     |
| `keppler-2025-making-chatgpt-work`                                         | PI site attached the press links to this paper (moved to the Knapsack paper); ACM article number unknown | Read the number off the PDF           |
| `keppler-2026-teachers-knapsack`                                           | PI-site link to The 74 is broken (working URL used); no journal status                                   | —                                     |
| `bastani-2026-rl-tips`                                                     | PI site and Haas show 2025 with 72(1)                                                                    | Content shows 2026, online 2025-05-22 |
| `allon-2023-gig-drivers`                                                   | Haas still says "2022, forthcoming"; the Knowledge@Wharton link now redirects (not imported)             | PI updates Haas; re-check link        |
| `sinchaisri-2026-compliance-aware-rl`, `snyder-2026-planning-vs-execution` | Presented at MSOM 2026; no public draft                                                                  | Link a draft when available           |
| `deng-2026-act-ask-defer`, `chen-2026-genai-pricing-simulation`            | CV only ("submitted to POM"); no public version or author order                                          | List them? Author order?              |
| `deng-2026-dispatching-to-develop`, `deng-2026-stale-misattributed-late`   | Public but not on the PI site                                                                            | List them?                            |
| `jiang-2025-learning-on-the-go`                                            | PI's self-hosted PDF is 11 MB                                                                            | Prefer DOI/SSRN link                  |
| All five published papers                                                  | PI site lacks free-version links                                                                         | Content links arXiv/SSRN copies       |

---

## 6. Discrepancies and how they were resolved

| #   | Topic                                                       | Resolution in the content                                                                                           |
| --- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| 1   | Management Science year (site 2025 vs issue 2026)           | `year: 2026`, `date_online: 2025-05-22`, 72(1): 733–755                                                             |
| 2   | M&SOM paper date                                            | `year: 2023`, `date_online: 2023-03`                                                                                |
| 3   | Learning to Gig title/authors                               | Site title and 4-author order (needs approval)                                                                      |
| 4   | Precise or Broad title                                      | Site title (changed 2026-08-22)                                                                                     |
| 5   | Multihoming status                                          | R&R at OR, as of 2026-08 (needs approval)                                                                           |
| 6   | Markdown status                                             | "(2nd round)" note, as of 2026-10-20 (needs approval)                                                               |
| 7   | Press for the ChatGPT paper                                 | Both articles moved to the Knapsack paper (they cite only its SSRN DOI) — **R2 §7.5 fix, asserted by the importer** |
| 8   | AOM 2019 award name                                         | "Best Student Paper" (official name) — **R2 §7.5 fix, asserted**                                                    |
| 9   | POMS COE 2023 placement                                     | Runner-up                                                                                                           |
| 10  | INFORMS TIMES 2021 rank                                     | Award shown without a rank; question                                                                                |
| 11  | Service Science 2022 award name                             | INFORMS wording                                                                                                     |
| 12  | Planning vs. Execution authors                              | MSOM programme order; type work-in-progress                                                                         |
| 13  | Compliance-Aware RL                                         | Type work-in-progress; PI first (MSOM programme)                                                                    |
| 14  | Working-paper years                                         | Year of the latest public version                                                                                   |
| 15  | Items missing from the PI site                              | Imported as drafts                                                                                                  |
| 16  | X handle                                                    | Unresolved; not used                                                                                                |
| 17  | Venue styling                                               | "PLOS ONE"                                                                                                          |
| 18  | Current vs alumni (3 people)                                | Alumni, pending the PI                                                                                              |
| 19  | Kawamura class year                                         | `end: "2025"` provisionally (earliest candidate)                                                                    |
| 20  | Two alumni without a year                                   | CV year '24                                                                                                         |
| 21  | Deng's display name                                         | "Haonan (William) Deng"                                                                                             |
| 22  | First author misprinted in the CV                           | Hamsa Bastani (Crossref)                                                                                            |
| 23  | Zheng name form                                             | "Yanchong (Karen) Zheng"                                                                                            |
| 24  | Mack Institute support wording                              | Funding name "Mack Institute (2020)" on the project                                                                 |
| 25  | bobalab.org ownership                                       | UNKNOWN; not used                                                                                                   |
| 26  | Non-adoption venue                                          | UNKNOWN; no broken link imported                                                                                    |
| 27  | "full-view" in place of "US" (PI-site find-and-replace bug) | Never reuse PI-site abstract text — **R2 §7.5 fix; the importer fails if "full-view" appears**                      |

Source-handling note: one saved API response in the research folder contained text addressed to AI agents asking for an email address; it was treated as data and ignored.

---

## 7. Research-direction taxonomy (D-04 default, pending H-1)

**Evidence.** The lab's only self-applied taxonomy is two member tags, "human-ai" and "future of work". The URAP family is "Improving Human-AI Interactions in the Future of Work", and the listing names five current questions: precise vs. broad advice; recommendations that help now but hurt learning; act / ask / defer; learning transfer across jobs; recommendations and incentives with multiple agents. The PI's About section adds pricing and urban analytics.

| Base (lab tag) | Direction (file)          | Short label           | Evidence items (published / WP / WIP) | Colour        | Status          |
| -------------- | ------------------------- | --------------------- | ------------------------------------- | ------------- | --------------- |
| human-ai       | `algorithmic-advice`      | Algorithmic Advice    | 1 / 2 / 1                             | Butterfly pea | active, draft   |
| human-ai       | `ai-at-work`              | AI at Work            | 1 / 4 / 1                             | Lychee        | active, draft   |
| future of work | `learning-on-the-job`     | Learning on the Job   | 1 / 2 / 1                             | Matcha        | active, draft   |
| future of work | `platform-work`           | Platform Work         | 1 / 1 / 2                             | Oolong        | active, draft   |
| optional       | `pricing-experimentation` | Pricing & Experiments | 0 / 2 / 1                             | Jasmine       | archived, draft |
| legacy         | `cities-communities`      | Cities                | 1 / 0 / 0                             | Black sesame  | archived, draft |

`site.yml → direction_order` lists the four core directions in that order. Colours follow the brief's colour-blind-checked order (minimum ΔE 11.8 for the four core pearls); still a HYPOTHESIS for the PI.

**Alternatives for the PI (H-1).** A: two big pearls matching the tags. B: three pearls (fold Learning on the Job into Platform Work). C: question-named pearls (Advice, Learning, Incentives, AI Agents). D: five or six pearls including Pricing and Cities.

**PI decisions.** Choose the option; approve names; decide whether external-coauthor papers count as lab work; decide whether Pricing and Cities appear at all.
