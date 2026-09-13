# What do the primary texts actually say about retrieving, searching, copying and inspecting records — as distinct from retaining them?

**Asked by:** Orchestrator, ticket deciding whether a work-queue/list view should default to a bounded time window (e.g. "last 90 days") vs. showing all records
**Date:** 2026-09-11
**Status of sources:**

- **21 CFR Part 211** — fetched as XML from the eCFR Versioner API at issue date **2026-09-09** (the most recent issue date available for Title 21 at the time of the request), `https://www.ecfr.gov/api/versioner/v1/full/2026-09-09/title-21.xml?part=211`. Human-readable equivalent: https://www.ecfr.gov/current/title-21/chapter-I/subchapter-A/part-211. Converted the XML to plain text and searched it directly; all quotations below are from that fetched text.
- **21 CFR Part 11** — fetched the same way, same issue date, `...title-21.xml?part=11`. Human-readable: https://www.ecfr.gov/current/title-21/chapter-I/subchapter-A/part-11.
- **FDA, *Data Integrity and Compliance With Drug CGMP: Questions and Answers*, final, December 2018** — downloaded PDF from https://www.fda.gov/media/119267/download and converted to text. This is the final Level 1 guidance (confirmed against FDA's guidance-search landing page in a prior session, see `docs/research/part211-periphery-record-obligations.md`); this is **not** the 2016 draft. I re-searched the full converted text for retrieval/archival/accessibility language in this session.
- **PIC/S PI 041-1**, *Good Practices for Data Management and Integrity in Regulated GMP/GDP Environments* — downloaded PDF from `https://picscheme.org/docview/4234`. Cover page reads **"PI 041-1, 1 July 2021"**, with a document-history page stating "Adoption by Committee of PI 041-1: 1 June 2021 / Entry into force of PI 041-1: 1 July 2021." This is the current, adopted (final) version, not a draft — the earlier drafts (Draft 2, 10 Aug 2016; Draft 3, 30 Nov 2018) are superseded by this one. I did not find a later PIC/S revision in this session's search.
- **EU GMP Annex 11, "Computerised Systems"** — downloaded PDF from `https://health.ec.europa.eu/system/files/2016-11/annex11_01-2011_en_0.pdf`. This is the version dated 2010/2011 (in force since 30 June 2011), which is the version the European Commission's own health.ec.europa.eu portal currently serves at that URL. **I did not independently confirm there is no newer official Annex 11 text in force** — I searched for one and found only discussion of a *draft* revision (per `pharmout.net` and `simplerqms.com` search hits) with no confirmation it has been adopted; I am reporting the 2010/2011 text as current based on it being what the Commission's own portal serves under the canonical Annex 11 filename, but flag this as **not independently cross-checked against a EudraLex index page for a superseding version**, so treat "current" here as "current-as-served-by-the-Commission-URL," not verified against a change log.

---

## 1. 21 CFR 211.180(c)

Fetched, exact text (part of §211.180, "General requirements"):

> "(c) All records required under this part, or copies of such records, shall be readily available for authorized inspection during the retention period at the establishment where the activities described in such records occurred. These records or copies thereof shall be subject to photocopying or other means of reproduction as part of such inspection. Records that can be immediately retrieved from another location by computer or other electronic means shall be considered as meeting the requirements of this paragraph." (21 CFR 211.180(c))

**Obligated action:** the records (or copies) "shall be readily available" — a state the records must be kept in, not an act someone performs on request, though the paragraph also authorizes photocopying/reproduction "as part of such inspection."

**Beneficiary:** the text says "for authorized inspection" without naming FDA explicitly in this paragraph, but the phrase "authorized inspection" in this Subpart's context (and confirmed by §211.180(f)'s cross-references to regulatory/recall/investigation processes) means an inspection by the regulatory agency (or another party FDA has authorized, e.g. under contract-manufacturing oversight). Part 211 does not extend "readily available" to a patient, a customer, or the firm's own internal reviewer as a named beneficiary — the paragraph's beneficiary is the inspecting authority.

**Time bound — retention vs. availability, precisely:**
- §211.180(a) and (b) set the **retention period**: "at least 1 year after the expiration date of the batch" (or "3 years after distribution" for certain OTC exemption cases), and the same for component/container/closure/labeling records.
- §211.180(c) sets a separate, narrower requirement that operates **during** that retention period: the records must be **readily available** "during the retention period at the establishment where the activities described in such records occurred."
- These are not the same thing: retention is *how long the record must continue to exist*; readily-available is *the condition the record must be kept in, and the place it must be reachable from, throughout that same window*. The paragraph does not state any separate, shorter "availability period" distinct from the retention period — availability is coextensive with retention, not a subset of it.

**Form of availability:** the paragraph does address form, in one specific way: "Records that can be **immediately retrieved from another location by computer or other electronic means** shall be considered as meeting the requirements of this paragraph." This is the regulation's own acknowledgment that "at the establishment" can be satisfied electronically/remotely, provided retrieval is "immediate." It does not otherwise specify UI, search, indexing, or format — only the physical/computer-immediacy of getting to the record.

**Confidence:** High — text fetched directly and quoted verbatim.

---

## 2. 21 CFR Part 11, §11.10(b) and (c)

Fetched, exact text (part of §11.10, "Controls for closed systems"):

> "(b) The ability to generate accurate and complete copies of records in both human readable and electronic form suitable for inspection, review, and copying **by the agency**. Persons should contact the agency if there are any questions regarding the ability of the agency to perform such review and copying of the electronic records." (21 CFR 11.10(b))

> "(c) Protection of records to enable their accurate and ready retrieval throughout the records retention period." (21 CFR 11.10(c))

**Whose inspection (§11.10(b)):** the text names the beneficiary explicitly and only once — "by the agency." The requirement is that the closed system be able to produce human-readable and electronic copies suitable for FDA's inspection, review, and copying. It is not phrased as a requirement that the system's ordinary users be able to inspect, review, or copy records through the interface; "the agency" is the stated party.

**Does §11.10(b) impose a requirement on the system's user interface, or only on the ability to produce copies?** On its text, **only on the ability to produce copies.** The operative phrase is "the ability to generate accurate and complete copies … in both human readable and electronic form suitable for inspection, review, and copying by the agency." Nothing in (b) speaks to how records are displayed, listed, filtered, or navigated by a user in the ordinary course of work — it is a copy-generation capability requirement, satisfiable by an export/printout/report function, not a mandate on the shape of a list view or a search interface.

**§11.10(c) — what "ready retrieval" is attached to:** the sentence's structure is "protection of records **to enable** … ready retrieval **throughout the records retention period**." Two things follow from the text as written:
1. "Ready retrieval" is the *purpose* the protection controls serve, not itself a separately defined interface requirement — the clause is drafted as a protection-of-records control (alongside the other closed-system controls in §11.10(a),(d)–(k): validation, access limits, audit trails, authority checks, etc.), where the protection's aim is stated as enabling retrieval.
2. The temporal scope explicitly stated is "throughout the records retention period" — i.e., retrieval must remain possible for as long as the record must be retained, not for some shorter "active" window and not for a period beyond retention.

Neither (b) nor (c) uses the words "search," "index," "query," "sort," or "filter," and neither specifies how a record is to be located among many (by date, ID, or otherwise) — only that, once located, retrieval must be "ready" and copies "accurate and complete."

**Confidence:** High — text fetched directly and quoted verbatim.

---

## 3. Occurrence counts

Counted with a case-insensitive term search against the full fetched, tag-stripped text of Part 211 (60 sections) and Part 11 (all sections, Subparts A–D).

| Term | Part 211 | Part 11 |
|---|---|---|
| "search" | 2 | 0 |
| "retrieve" | 1 | 2 |
| "retrieval" | 0 | 1 |
| "readily available" | 3 | 1 |
| "ready retrieval" | 0 | 1 |
| "index" | 0 | 0 |
| "query" | 0 | 0 |
| "sort" | 0 | 0 |
| "filter" | 11 | 0 |

**Context of every hit, so the counts are not misleading:**

- **"search" (Part 211, 2 hits)** — both occurrences are in §211.94's cross-reference to an incorporated-by-reference test method, in the phrase "...available for inspection at the National Archives and Records Administrati[on]..." context describing where a referenced testing method document can be examined. Neither occurrence concerns searching laboratory records; this is a citation/availability note about an external incorporated document, not a records-search requirement.
- **"retrieve" (Part 211, 1 hit)** — this is the §211.180(c) sentence already quoted above: "Records that can be immediately retrieved from another location by computer or other electronic means shall be considered as meeting the requirements of this paragraph."
- **"readily available" (Part 211, 3 hits)** — §211.180(c) (quoted above); §211.180(d), "suitable reader and photocopying equipment shall be readily available" (for reduced/microfilmed records); and §211.180(a)/(c)-adjacent text about an alternate-facility file being "readily available for inspection at that other facility."
- **"filter" (Part 211, 11 hits)** — every one of the eleven occurrences is a physical air or liquid filter (§§211.42, 211.46, 211.72), e.g. "high-efficiency particulate air filters," "Filters for liquid filtration used in the manufacture … of injectable drug products." **None concerns record filtering/searching.** This is a clean false-positive on the term and worth stating as such rather than silently excluding.
- **"retrieve" (Part 11, 2 hits)** — both in §11.1 and §11.3(b)(6)'s definitional language: records "created, modified, maintained, archived, retrieved, or transmitted" (§11.1(b)) and "electronic record" defined as information "created, modified, maintained, archived, retrieved, or distributed by a computer system" (§11.3(b)(6)). Both are scope/definition clauses listing the record lifecycle, not retrieval requirements in themselves.
- **"retrieval" (Part 11, 1 hit)** — §11.10(c), quoted above.
- **"ready retrieval" (Part 11, 1 hit)** — the same §11.10(c) sentence; "ready" and "retrieval" co-occur only there.
- **"readily available" (Part 11, 1 hit)** — §11.1(e): "Computer systems (including hardware and software), controls, and attendant documentation maintained under this part shall be readily available for, and subject to, FDA inspection." Same beneficiary pattern as §211.180(c) — the inspecting agency.

**"index," "query," "sort," "filter" (in the records-navigation sense) occur zero times in both parts.** This absence is itself a finding: neither Part 211 nor Part 11 uses any vocabulary describing how a person is to locate one record among many. The only retrieval-adjacent vocabulary either part uses is "readily available" and "(ready) retrieval," both of which describe a state records must be kept in and reachable from, not a mechanism (index, search field, sort order, filter) by which a person finds a specific record.

**Confidence:** High for the counts themselves (mechanically reproducible against the fetched text); the classification of each hit's context is a reading I performed and report as such.

---

## 4. FDA, Data Integrity and Compliance With Drug CGMP Q&A (final, December 2018)

Searched the converted text of the full guidance for "archiv," "retriev," "search," "readily available," and "accessible."

Relevant hits, quoted:

- **Q1(a), "What is 'data integrity'?"** — describes the CGMP data life cycle as including "creation, modification, processing, maintenance, **archival, retrieval**, transmission, and disposition of data after the record's retention period ends." This states that archival and retrieval are both part of the data life cycle the guidance is concerned with, but does not itself impose a distinct retrieval standard beyond that framing sentence.
- **Q1(b), "What is 'metadata'?"** — "Metadata is structured information that describes, explains, or otherwise makes it easier to **retrieve**, use, or manage data." This is the guidance's only substantive statement connecting a specific concept (metadata) to retrieval, and it is offered as an explanation of what metadata *is for*, not as a standalone requirement to make records retrievable by any particular means.
- **Q [backup], "How does FDA use the term 'backup' in §211.68(b)?"** — "FDA uses the term backup in §211.68(b) to refer to a true copy of the original record that is maintained securely throughout the record retention period (e.g., §211.180). Backup data must be exact, complete, and secure from alteration, inadvertent erasures, or loss (§211.68(b))." And: "FDA's use of the term backup is consistent with the term archive as used in guidance for industry and FDA staff *General Principles of Software Validation*." **Note: this guidance treats "backup" and "archive" as the same concept**, in contrast to PIC/S PI 041-1 below, which draws a sharp definitional distinction between the two (see §5). This guidance does not use "archive" as its own defined term with separate requirements from "backup."
- **Q10 area (paper printouts from stand-alone instruments)** — "True copies of dynamic electronic records may be made and maintained in the format of the original records or in a format that allows for the content and meaning of the original records to be preserved **if a suitable reader and copying equipment (e.g., software and hardware, including media readers) are readily available** (§§ 211.180(d) and 212.110)." This restates §211.180(d)'s own "readily available" language (reader/photocopying equipment), not a new retrieval standard.

**Does any Q&A bear on how long records must stay in the live system versus archived, or on whether archived records must remain accessible?** **No Q&A in this guidance draws a live-system-vs-archive distinction, and none states a required duration for keeping records in an "active" or "live" system as opposed to an archive.** The guidance's only archive-adjacent statement is the backup-equals-archive equivalence above, and it addresses accuracy/security/integrity of the copy, not a location- or system-tier requirement, and not accessibility of an archive as a separately named concept.

**Confidence:** High that these are the only relevant hits — I searched the full converted text of the document for the listed terms and read every occurrence in context.

---

## 5. PIC/S PI 041-1, Good Practices for Data Management and Integrity in Regulated GMP/GDP Environments (1 July 2021)

**§9.9, "Storage, archival and disposal of electronic data"** — the operative expectations, quoted:

> "Storage of data should include the entire original data and all relevant metadata, including audit trails, using a secure and validated process… Stored data should be accessible in a fully readable format. Companies may need to maintain suitable software and hardware to access electronically stored data backups or copies during the retention period… Back-up data should be readable for all the period of the defined regulatory retention period, even if a new version of the software has been updated or substituted for one with better performance. Systems should allow backup and restoration of all data, including meta-data and audit trails." (PI 041-1 §9.9, Expectation 1)

> "The record retention procedures should include provisions for retaining the metadata. This allows for future queries or investigations to reconstruct the activities that occurred related to a batch." (PI 041-1 §9.9, Expectation 2)

> "Data should be backed-up periodically and archived in accordance with written procedures. Archive copies should be physically (or virtually, where relevant) secured in a separate and remote location from where back up and original data are stored. **The data should be accessible and readable and its integrity maintained for all the period of archiving. There should be in place a procedure for restoring archived data in case an investigation is needed. The procedure in place for restoring archived data should be regularly tested.**" (PI 041-1 §9.9, Expectation 3)

**Does it require archived data to remain readable and retrievable?** **Yes, explicitly** — "accessible and readable … for all the period of archiving," and a restoration procedure must exist and "should be regularly tested."

**Does it state a time to restore?** **No.** I searched for "timely manner," "restoration time," and "time to restor[e]" across the full document; the only "timely manner" hits concern software patching/updates and issue escalation, not archive restoration. **PI 041-1 does not state a numeric or bounded time-to-restore requirement** — only that a restoration procedure must exist and be tested periodically. This is an absence worth stating plainly since a ticket weighing "bounded time window in the UI vs. all records searchable" might look here for a restoration-time obligation and not find one.

**Does it distinguish "archive" from "backup"?** **Yes, explicitly, in its own glossary:**

> "**Archiving** — Long term, permanent retention of completed data and relevant metadata in its final form for the purposes of reconstruction of the process or activity." (PI 041-1 Glossary)

> "**Back-up** — A copy of current (editable) data, metadata and system configuration settings (e.g. variable settings which relate to an analytical run) maintained for the purpose of disaster recovery." (PI 041-1 Glossary)

The distinction in the primary text is: archiving is the *permanent, final-form* retention of *completed* data for reconstruction; backup is a *disaster-recovery* copy of *current, editable* data. This is a materially different distinction from the FDA Dec 2018 guidance's treatment of "backup" as synonymous with "archive" (§4 above) — the two primary/guidance sources do not use the terms the same way, and this scout is not resolving that tension, only reporting that it exists in the primary texts as read.

**Confidence:** High — quoted directly from the fetched, current (1 July 2021, in-force) PDF.

---

## 6. EU GMP Annex 11 (version served at the Commission's canonical URL, in force since 30 June 2011 per that document's own text)

**§7, Data Storage:**

> "7.1 Data should be secured by both physical and electronic means against damage. Stored data should be checked for accessibility, readability and accuracy. **Access to data should be ensured throughout the retention period.**
> 7.2 Regular back-ups of all relevant data should be done. Integrity and accuracy of backup data and the ability to restore the data should be checked during validation and monitored periodically." (Annex 11 §7)

**§8, Printouts:**

> "8.1 It should be possible to **obtain clear printed copies of electronically stored data**.
> 8.2 For records supporting batch release it should be possible to generate printouts indicating if any of the data has been changed since the original entry." (Annex 11 §8)

**§17, Archiving:**

> "Data may be archived. This data should be checked for accessibility, readability and integrity. If relevant changes are to be made to the system (e.g. computer equipment or programs), then the ability to retrieve the data should be ensured and tested." (Annex 11 §17)

**Does anything require a readable printed copy?** **Yes** — §8.1, quoted above, directly requires that clear printed copies of electronically stored data be obtainable. This is a copy-production requirement (parallel to 21 CFR 11.10(b)), not a UI/search requirement.

**Does anything bear on locating a record?** **No.** As with the other sources, Annex 11 uses "accessible," "readable," "retrieve," and "ensure access throughout the retention period," but nowhere addresses how a specific record is to be located among many (no search, index, sort, or filter vocabulary). §7.1's "access to data should be ensured throughout the retention period" is the closest textual analogue to §11.10(c)'s "ready retrieval throughout the records retention period" and to 211.180(c)'s "readily available … during the retention period" — all three texts independently peg the *availability* obligation to the *retention* period, using near-identical structure, none specifying retrieval mechanism.

**Confidence:** Moderate-high on the text itself (directly quoted from the fetched PDF); **lower confidence that this is the single most current officially-in-force version** — I did not cross-check against a EudraLex Volume 4 index or Official Journal notice confirming no newer adopted revision exists, only that this is the document served at the Commission's own canonical Annex 11 URL. Flagged in "What I could not establish."

---

## 7. The narrow practical question

**Is there any primary text that constrains what a laboratory system's default list view shows, or that would be violated by a UI defaulting to a recent time window while keeping all records retrievable by explicit search?**

**Plainly: no.** None of the five primary/guidance texts examined — 21 CFR 211.180(c), 21 CFR 11.10(b)/(c), the FDA Dec 2018 DI guidance, PIC/S PI 041-1, or EU GMP Annex 11 — uses any vocabulary of default views, list scope, search-by-default, indexing, sorting, or filtering. Every operative sentence found is about one of three things: (a) the record/copy must exist and be producible (211.180(c)'s photocopying/reproduction, 11.10(b)'s copy-generation, Annex 11 §8.1's printouts); (b) the record must remain accessible/readable/retrievable for the duration of its retention period (211.180(c), 11.10(c), Annex 11 §7.1 and §17, PI 041-1 §9.9); or (c) audit-trail/backup/archive integrity controls (11.10(e), Annex 11 §7.2/§9, PI 041-1 §9.9). None constrains what is shown by default when a person opens a list, and none requires that "all" records be displayed at once as opposed to being reachable through an explicit lookup.

**The nearest-adjacent obligation** is the recurring "readily available"/"ready retrieval"/"access … ensured" language, which is consistently and only about the *retention-period-long persistence of the ability to reach a record* — not about a default view. On the plain text, a system that defaults a list to a recent window but preserves the ability to reach any record within its retention period through an explicit search or query would not, on these words alone, appear to conflict with "readily available" or "ready retrieval" — provided the retrieval that explicit search performs is itself immediate/ready and covers the full retention period. **This is a reading of what the text does and does not say, not a compliance determination**, and I am not asserting it as a green light — only that I found no operative clause that speaks to default-view scope one way or the other.

---

## What could not be verified

1. **Whether the EU GMP Annex 11 text fetched (2010/2011, in force since 30 June 2011) is the single most current officially adopted version.** I found search-engine references to a *draft* revision under public consultation but no confirmation of its adoption; the fetched text is what the European Commission's own canonical Annex 11 URL currently serves, but I did not cross-check a EudraLex Volume 4 table of contents or Official Journal notice to positively rule out a newer adopted text existing elsewhere.
2. **Any numeric or bounded time-to-restore requirement for archived data.** Searched PI 041-1, Annex 11, and the FDA Dec 2018 guidance for such a figure; none states one. PI 041-1 requires a restoration procedure to exist and be "regularly tested," without quantifying frequency or maximum restoration time.
3. **Whether FDA's equating of "backup" with "archive" (Dec 2018 guidance) and PIC/S's explicit definitional separation of the two (PI 041-1 glossary) reflect a real substantive disagreement or just differing document scope/vocabulary choices.** Both are quoted verbatim above; I am not resolving the tension between them, only reporting that the two primary/guidance texts define the terms differently.
4. **Whether any FDA-specific guidance (beyond the Dec 2018 DI Q&A) addresses default list-view or search-interface behavior in laboratory systems specifically.** I searched only the Dec 2018 DI guidance in this session; FDA's broader CSA (Computer Software Assurance) or Part 11 scope-and-application guidance were outside the scope of this scouting task and were not fetched.
5. **ILAC-G8/G17 and USP General Chapter content on retrieval** were out of scope for this question and were not fetched in this session (USP 〈621〉 was separately confirmed paywalled in a prior session's research, see `docs/research/part211-periphery-record-obligations.md`).

## Sources

1. **21 CFR Part 211**, Current Good Manufacturing Practice for Finished Pharmaceuticals. Full XML, eCFR Versioner API, issue date 2026-09-09. `https://www.ecfr.gov/api/versioner/v1/full/2026-09-09/title-21.xml?part=211`. Human-readable: `https://www.ecfr.gov/current/title-21/chapter-I/subchapter-A/part-211`.
2. **21 CFR Part 11**, Electronic Records; Electronic Signatures. Full XML, eCFR Versioner API, same issue date. `https://www.ecfr.gov/api/versioner/v1/full/2026-09-09/title-21.xml?part=11`. Human-readable: `https://www.ecfr.gov/current/title-21/chapter-I/subchapter-A/part-11`.
3. **FDA, *Data Integrity and Compliance With Drug CGMP: Questions and Answers, Guidance for Industry*, December 2018** (final Level 1 guidance, docket FDA-2018-D-3984). PDF: `https://www.fda.gov/media/119267/download`.
4. **PIC/S PI 041-1, *Good Practices for Data Management and Integrity in Regulated GMP/GDP Environments*, 1 July 2021** (adopted 1 June 2021, entered into force 1 July 2021 — current, final version, not a draft). PDF: `https://picscheme.org/docview/4234`.
5. **EU GMP, EudraLex Volume 4, Annex 11: Computerised Systems** (in force since 30 June 2011, per the document's own text; fetched from the European Commission's canonical URL, currency not independently cross-checked beyond that — see "What could not be verified" item 1). PDF: `https://health.ec.europa.eu/system/files/2016-11/annex11_01-2011_en_0.pdf`.
6. Prior-session findings referenced but not repeated: `docs/research/part211-periphery-record-obligations.md` (§211.180(c) retention/availability structural finding), `docs/research/iso17025-record-obligations.md` (ISO 17025 record obligations, out of scope here but establishing that §11.10(e)'s audit-trail retention is pegged to the subject record's retention — used as the given starting point per the task instructions and not re-derived).
