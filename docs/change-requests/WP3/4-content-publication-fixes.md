# WP3 request 4: publication content fixes found in the WP3 review (for WP7 / the lab)

- File(s): `content/publications/*.md` (WP7; the lab confirms where marked)
- Why: these show on `/publications/`, the paper pages, the citations (APA + BibTeX) and the Scholar tags.
  Evidence: R2 §1, §3, §7 (`scratchpad/bobalab/research/R2-content-corroborate.md`) and `docs/CONTENT-MAPPING.md` §3.2.
- Proposed changes:
  1. **Journal name of the two PACM HCI papers** (`jiang-2025-learning-on-the-go`, `keppler-2025-making-chatgpt-work`):
     `venue: Proceedings of the ACM on Human-Computer Interaction (CSCW 2025)` puts "(CSCW 2025)" into the
     journal name, so the BibTeX reads `journal = {Proceedings of the ACM on Human-Computer Interaction (CSCW 2025)}`
     and Scholar gets the same `citation_journal_title`. R2 §3 P4/P5: the journal is _Proceedings of the ACM on
     Human-Computer Interaction_; CSCW 2025 is where it was presented (DOCUMENTED, R2 §1.2: Bergen, 2025-10-20
     "The Gig Economy" and 2025-10-21 "Enhancing Learning", program https://cscw.acm.org/2025/index.php/program-overview-3/).
     → `venue: Proceedings of the ACM on Human-Computer Interaction`, and add
     `presentations: [{ event: "CSCW 2025, Bergen", year: 2025, url: <program URL> }]` to each.
     Then regenerate the two golden files: `UPDATE_GOLDEN=1 npx vitest run --config vitest.config.ts tests/unit/publications/bibtex.test.ts`
     and review the diff (only the `journal` line and the APA venue should change).
  2. **`status_source` differs from CONTENT-MAPPING §3.2** for publicly posted papers, so their pages say
     "reported by the lab" about a state anyone can check:
     `keppler-2026-teachers-knapsack` (SSRN), `liu-2026-strategic-advice-personal-ai` (arXiv v2),
     `deng-2026-dispatching-to-develop` (SSRN), `deng-2026-stale-misattributed-late` (arXiv v1) →
     `status_source: documented` as the mapping table says.
  3. **`blaettchen-2026-precise-or-broad`: the only public copy is a Dropbox share link** (`…?rlkey=…&dl=0`).
     It becomes the URL in the APA reference and the BibTeX `url` (no DOI/SSRN/arXiv exists, R2 §4 WP1), and it
     breaks whenever the file is moved. Lab decision: post it to SSRN/arXiv, or host the PDF under
     `public/uploads/` (accessibility rules for uploaded PDFs apply, brief critic gaps), then replace `links.pdf`.
  4. **Presentation text carries ISO dates** ("…, Yokohama, 2025-04-26", "…, session TD10, 2026-07-14"), which
     read as data on the page. Write them as the site writes dates ("Apr 26, 2025"), or drop the day.
  5. **"The PI's …" in public copy** (`in_brief` of `sinchaisri-2021-penn-dissertation` and
     `sinchaisri-2016-mit-sm-thesis`): "PI" is lab jargon for a first-time visitor and the meta description
     repeats it. Suggest "Park Sinchaisri's doctoral dissertation …" / "… master's thesis …" (lab to confirm wording).
- Blocking? No. WP3 renders whatever content provides.
- Test that proves it: `tests/unit/publications/bibtex.test.ts` (golden files after item 1), the paper-page
  screenshots in `test-results/WP3/`.

Status: Applied in integration commit "integration: apply change requests" (2026-10-20): item 1 (journal names; "CSCW 2025, Bergen" presentations with the programme URL; golden files regenerated, only the journal line and the APA venue changed), item 2 (four items now `status_source: documented`), item 4 (presentation dates written "Apr 26, 2025" / "Jul 14, 2026"), item 5 ("Park Sinchaisri's …"; the lab may reword). Item 3 rejected — a lab decision (which stable PDF to link), tracked as CONTENT-QUESTIONS D9.
