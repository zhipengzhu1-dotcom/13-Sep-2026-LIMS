# Does any primary regulatory source require that a quality unit's review/approval act be performed inside the computerised system that holds the record it approves — or is a "hybrid" arrangement (approval executed on paper or in another system, cited by reference inside the computerised record) a recognised and acceptable construct?

**Asked by:** Orchestrator — whether QA needs a Benchline login, or whether QA can remain an external authority the system records by reference
**Date:** 2026-09-11
**Status of sources:** All text below was fetched live on 2026-09-11 directly from the owning source (eCFR API for 21 CFR Parts 11 and 211; FDA's own PDF for the Part 11 Scope and Application guidance; the European Commission's own PDF for EU GMP Annex 11; PIC/S's own PDF for PI 041-1; ICH's own database PDF for Q7), not from secondary write-ups. Currency checks performed: the FDA Part 11 guidance quoted is the **August 2003 final** ("Guidance for Industry, Part 11, Electronic Records; Electronic Signatures — Scope and Application," CDER/CBER/CDRH/CFSAN/CVM/ORA, dated August 2003 on its own cover page) — this is a different document from the December 2018 data-integrity Q&A guidance covered in other research notes in this repository, and I did not substitute the superseded draft of that separate document. EU GMP Annex 11 quoted is **Revision 1, in force since 30 June 2011** (confirmed from the document's own header text); I did not re-check whether a replacement has since been adopted, and note that as an open item below since it was flagged as pending in other research notes in this repository. PIC/S PI 041-1 quoted is the **1 July 2021** final text (confirmed from the document's own footer, present on every page: "PI 041-1 ... 1 July 2021"). ICH Q7 quoted is the text hosted at ICH's own database (database.ich.org); I did not independently re-verify against FDA's mirrored copy (fda.gov/media/112426/download) but the two are the same ICH-harmonised guideline text by definition and I have not found a version discrepancy. NIST HB 150 was not consulted and is not relevant to this question.

## Findings

### 1. FDA's Part 11 Scope and Application guidance names "hybrid" as an accepted construct, but only in its record-retention discussion — not in a discussion of who may perform an approval act

Source: FDA, *Guidance for Industry — Part 11, Electronic Records; Electronic Signatures — Scope and Application*, August 2003, `https://www.fda.gov/media/75414/download` (retrieved and confirmed final, dated August 2003 on the cover page).

Under the guidance's Section 5, "Record Retention," discussing archiving of required records, the operative sentence reads (quoted verbatim):

> "In addition, paper and electronic record and signature components can co-exist (i.e., a hybrid situation) as long as predicate rule requirements are met and the content and meaning of those records are preserved."

The document's own footnote 8, attached to that sentence, defines the term:

> "Examples of hybrid situations include combinations of paper records (or other nonelectronic media) and electronic records, paper records and electronic signatures, or handwritten signatures executed to electronic records."

This is FDA characterizing hybrid co-existence as **permitted** ("can co-exist ... as long as ... requirements are met"), not merely observed as a fact of the world and not discouraged. There is no qualifying language elsewhere in the document narrowing this permission to certain record types or excluding approval/review records from it. The document does not separately discuss, anywhere I could find, whether the *approving individual* must be a registered user of the system that holds the record being approved — the hybrid discussion here is about the record/signature medium (paper vs. electronic), not about system membership of the approver.

A full-text search of this six-page guidance for "review," "approve," and "quality unit" found no passage connecting the hybrid concept specifically to a quality-unit review-and-approval act; the hybrid passage is generic to any predicate-rule record.

### 2. 21 CFR Part 11 itself: "hybrid" does not appear; nothing ties signature/record linking to system membership of the signer

Source: eCFR, Title 21, Part 11, retrieved via `https://www.ecfr.gov/api/versioner/v1/full/2026-09-09/title-21.xml?part=11`.

Searched the full stripped text of Part 11 case-insensitively:
- **"hybrid"**: 0 occurrences.
- **"paper"**: 11 occurrences.
- **"handwritten"**: 10 occurrences.

Relevant definitions and sections, quoted verbatim:

- **§11.1(a)** — "The regulations in this part set forth the criteria under which the agency considers electronic records, electronic signatures, and handwritten signatures executed to electronic records to be trustworthy, reliable, and generally equivalent to paper records and handwritten signatures executed on paper." This sentence itself contemplates "handwritten signatures executed to electronic records" as a recognized category, i.e., a signature made by hand (on paper, or with a pen-like instrument) that attaches to a record that is itself electronic — a hybrid act by construction.
- **§11.3(b)(8)**, "Handwritten signature" — "means the scripted name or legal mark of an individual handwritten by that individual and executed or adopted with the present intention to authenticate a writing in a permanent form. The act of signing with a writing or marking instrument such as a pen or stylus is preserved. The scripted name or legal mark, while conventionally applied to paper, may also be applied to other devices that capture the name or mark." Note the closing sentence: "while conventionally applied to paper, may also be applied to other devices" — the definition itself contemplates capture devices other than paper for a "handwritten" signature, and does not require that device to be the same system holding the record.
- **§11.3(b)(4)**, "Closed system" — "means an environment in which system access is controlled by persons who are responsible for the content of electronic records that are on the system." This defines the system property, not a requirement about who the approver must be; it says nothing about the approver needing to be a user *of* that system.
- **§11.70**, "Signature/record linking" — "Electronic signatures and handwritten signatures executed to electronic records shall be linked to their respective electronic records to ensure that the signatures cannot be excised, copied, or otherwise transferred to falsify an electronic record by ordinary means." This section requires a **linking** control between the signature and the record — it requires the linkage to be tamper-resistant, but its text does not require the signature to have been executed inside the same system that stores the record. A handwritten signature executed to an electronic record (contemplated at §11.1(a) and defined at §11.3(b)(8)) is, by definition, executed outside the electronic system and then linked to it — this is the express hybrid case the guidance in Finding 1 addresses.

**No provision found in Part 11's text requires the approving individual to be a registered user of, or to act from within, the specific computerised system that holds the record being approved.** The regulation's requirements attach to the record (authenticity, linking, retrievability) and to the signature (uniqueness, non-repudiation), not to the location or system-membership of the act.

### 3. 21 CFR Part 211: no textual requirement locating the approval act inside a particular system

Source: eCFR, Title 21, Part 211, retrieved via `https://www.ecfr.gov/api/versioner/v1/full/2026-09-09/title-21.xml?part=211`.

Searched the full stripped text of Part 211 case-insensitively: **"hybrid"**: 0 occurrences. **"quality assurance"**: 0 occurrences (confirmed independently, as expected — Part 211 uses "quality control unit," not "quality assurance," as its defined term).

- **§211.22(a)** — "There shall be a quality control unit that shall have the responsibility and authority to approve or reject all components, drug product containers, closures, in-process materials, packaging material, labeling, and drug products, and the authority to review production records to assure that no errors have occurred or, if errors have occurred, that they have been fully investigated." No medium or system is specified for how this approval or review act is to be recorded or performed.
- **§211.68(b)** — "Appropriate controls shall be exercised over computer or related systems to assure that changes in master production and control records or other records are instituted only by authorized personnel. Input to and output from the computer or related system of formulas or other records or data shall be checked for accuracy... Hard copy or alternative systems, such as duplicates, tapes, or microfilm, designed to assure that backup data are exact and complete and that it is secure from alteration, inadvertent erasures, or loss shall be maintained." This section explicitly contemplates hard-copy/alternative-format coexistence with computer records as a *backup* measure, but does not address where an approval signature must be executed.
- **§211.160(a)** — "The establishment of any specifications, standards, sampling plans, test procedures, or other laboratory control mechanisms required by this subpart, including any change in such specifications, standards, sampling plans, test procedures, or other laboratory control mechanisms, shall be drafted by the appropriate organizational unit and reviewed and approved by the quality control unit." Requires review/approval by the quality control unit; specifies no system or medium.
- **§211.180(a)** — sets retention periods for production, control, or distribution records; specifies no system or medium for approval.
- **§211.194(a)(8)** — "The initials or signature of a second person showing that the original records have been reviewed for accuracy, completeness, and compliance with established standards." Requires the reviewer's initials or signature on the record; specifies no system or medium in which that signature must be captured.

**No clause in Part 211 requires the quality unit's review/approval act to be performed inside the same computerised system that holds the record.** The regulation is medium-agnostic on this specific point — it requires the act and the attribution, not the locus.

### 4. EU GMP Annex 11 (Revision 1, in force 30 June 2011): the accuracy-check clause explicitly contemplates a person acting outside the automated path; no clause locates approval inside the record-holding system

Source: European Commission, EudraLex Volume 4, Annex 11, `https://health.ec.europa.eu/system/files/2016-11/annex11_01-2011_en_0.pdf` (header confirms "revision 1," "Deadline for coming into operation: 30 June 2011").

Quoted in full, as requested:

- **§6, Accuracy Checks** (full text): "For critical data entered manually, there should be an additional check on the accuracy of the data. This check may be done by a second operator or by validated electronic means. The criticality and the potential consequences of erroneous or incorrectly entered data to a system should be covered by risk management." This clause explicitly authorizes the accuracy check to be performed either **by a second (human) operator** or **by validated electronic means** — it treats a human check as an equally valid alternative to an in-system electronic check, without specifying that the human operator must be a user of the same computerised system.
- **§8, Printouts** (full text): "8.1 It should be possible to obtain clear printed copies of electronically stored data. 8.2 For records supporting batch release it should be possible to generate printouts indicating if any of the data has been changed since the original entry." This section is about the system's ability to produce paper output, not about where approvals occur.
- **§14, Electronic Signature** (full text): "Electronic records may be signed electronically. Electronic signatures are expected to: a. have the same impact as hand-written signatures within the boundaries of the company, b. be permanently linked to their respective record, c. include the time and date that they were applied." This describes electronic signatures' expected properties (equivalence to handwritten, permanent linking, timestamping) but does not state that an electronic signature is mandatory, nor that the signer must be logged into the system holding the record — it only governs what an electronic signature must do *if used*.
- **§17, Archiving** (full text): "Data may be archived. This data should be checked for accessibility, readability and integrity. If relevant changes are to be made to the system (e.g. computer equipment or programs), then the ability to retrieve the data should be ensured and tested." No bearing on approval locus.
- **§4.8** (full text): "If data are transferred to another data format or system, validation should include checks that data are not altered in value and/or meaning during this migration process." This governs data migration between systems generally; it does not address the specific case of an approval executed outside the system and then referenced inside it.
- **§2, Personnel** (full text, quoted for completeness since it is the section nearest to an access/role requirement): "There should be close cooperation between all relevant personnel such as Process Owner, System Owner, Qualified Persons and IT. All personnel should have appropriate qualifications, level of access and defined responsibilities to carry out their assigned duties." This requires "appropriate ... level of access" for personnel who use the system but does not require that every person whose approval attaches to a record held by the system must themselves be a system user.

**No clause in Annex 11 requires that a quality-unit approval act be performed inside the specific computerised system holding the record.** §6 in particular affirmatively treats a human second-check as an alternative to (not a lesser version of) a validated electronic check, without conditioning that on the human being logged into the system.

### 5. PIC/S PI 041-1 (1 July 2021): hybrid systems named, defined, and discouraged — but discouraged as a matter of GMP good practice, not prohibited, and the discouragement is about complexity/vulnerability, not specifically about approval locus

Source: PIC/S, *Good Practices for Data Management and Integrity in Regulated GMP/GDP Environments*, PI 041-1, 1 July 2021, `https://picscheme.org/docview/4234` (confirmed final by the document's own repeated footer "PI 041-1 ... 1 July 2021" on every page checked).

PI 041-1 contains a dedicated section, **9.10, "Management of Hybrid Systems,"** which is the most on-point primary-source text found for this question. Quoted in full:

> "1. Hybrid systems require specific and additional controls in reflection of their complexity and potential increased vulnerability to manipulation of data. For this reason, **the use of hybrid systems is discouraged and such systems should be replaced whenever possible.**
>
> Each element of the hybrid system should be qualified and controlled in accordance with the guidance relating to manual and computerised systems as specified above.
>
> Appropriate quality risk management principles should be followed when assessing, defining, and demonstrating the effectiveness of control measures applied to the system.
>
> A detailed system description of the entire system should be available that outlines all major components of the system, the function of each component, controls for data management and integrity, and the manner in which system components interact.
>
> Procedures and records should be available to manage and appropriately control the interface between manual and automated systems, particularly steps associated with:
> — manual input of manually generated data into computerised systems;
> — transcription (including manual) of data generated by automated systems onto paper records; and
> — automated detection and transcription of printed data into computerised systems.
>
> Potential risk of not meeting expectations/items to be checked
> • Check that hybrid systems are clearly defined and identified, and that each contributing element of the system is validated.
> • Attention should be paid to the interface between the manual and computerised system. Inspectors should verify that adequate controls and secondary checks are in place where manual transcription between systems takes place.
> • Original data should be retained following transcription and processing.
> • Hybrid systems commonly consist of a combination of computerised and manual systems. Particular attention should be paid to verifying:
>   o The extent of qualification and/or validation of the computerised system; and,
>   o The robustness of controls applied to the management of the manual element of the hybrid system due to the difficulties in consistent application of a manual process.
>
> 2. Procedures should be in place to manage the review of data generated by hybrid systems which clearly outline the process for the evaluation and approval of electronic and paper-based data. Procedures should outline:
> — Instructions for how electronic data and paper-based data is correlated to form a complete record.
> — Expectations for approval of data outputs for each system.
> — Risks identified with hybrid systems, with a focus on verification of the effective application of controls
>
> Potential risk of not meeting expectations/items to be checked
> • Verify that instructions for the review of hybrid system data is in place."

The document's Glossary defines the term (quoted in full):

> "Hybrid Systems: A system for the management and control of data that typically consists of an electronic system generating electronic data, supplemented by a defined manual system that typically generate a paper-based record. The complete data set from a hybrid system therefore consists of both electronic and paper data together. Hybrid systems rely on the effective management of both sub-systems for correct operation."

Two further occurrences appear elsewhere in the document (Section 9.5, on legacy single-login systems, quoted in an earlier research note in this repository): "It is acknowledged that some legacy computerised systems support only a single user login or limited numbers of user logins. Where no suitable alternative computerised system is available, equivalent control may be provided by third party software, or a paper based method of providing traceability (with version control). The suitability of alternative systems should be justified and documented. **Increased data review is likely to be required for hybrid systems.**"

**Distinguishing requirement from recommendation:** PI 041-1 is itself a PIC/S "good practices" / inspectorate-guidance document, not a binding regulation. Its own language is aspirational/inspectorial ("should," "is discouraged," "should be replaced whenever possible," "items to be checked" by inspectors) rather than prohibitive ("shall not," "is prohibited"). Read plainly, PI 041-1: (a) treats hybrid systems as a **recognised, named, defined construct** that exists in regulated practice; (b) **discourages** their use and recommends replacement where feasible, on account of the additional complexity and vulnerability to manipulation, particularly at the manual-to-electronic transcription interface; and (c) does **not** say hybrid systems are non-compliant or unacceptable outright — it prescribes additional controls (qualification of each element, documented interface procedures, secondary checks, retention of original data, review/approval procedures spanning both media) for organizations that use them. It does not single out the *quality-unit approval act specifically* as the element that must or must not be inside the system — its concern is the data/record as a whole, including test results and transcriptions, not the approval signature narrowly.

### 6. ICH Q7 (Good Manufacturing Practice Guide for Active Pharmaceutical Ingredients): requires quality-unit signature on Certificates of Analysis; silent on system/medium

Source: ICH, *Q7 Good Manufacturing Practice Guide for Active Pharmaceutical Ingredients*, retrieved from ICH's own database, `https://database.ich.org/sites/default/files/Q7%20Guideline.pdf`.

- **§2.2, "Responsibilities of the Quality Unit(s)"** — "2.20 The quality unit(s) should be involved in all quality-related matters. 2.21 The quality unit(s) should review and approve all appropriate quality-related documents. 2.22 The main responsibilities of the independent quality unit(s) should not be delegated. These responsibilities should be described in writing and should include but not necessarily be limited to: 1. Releasing or rejecting all APIs. Releasing or rejecting intermediates for use outside the control of the manufacturing company; ..." (list continues beyond what was extracted here). No clause in §2.2 specifies the medium or system in which quality-unit review/approval is to be recorded.
- **§11.43, "Certificates of Analysis"** — "Certificates should be dated and signed by authorised personnel of the quality unit(s) and should show the name, address and telephone number of the original manufacturer. Where the analysis has been carried out by a repacker or reprocessor, the Certificate of Analysis should show the name, address and telephone number of the repacker/reprocessor and a reference to the name of the original manufacturer." This requires the Certificate to be "dated and signed" — it does not specify electronic vs. handwritten signature, and does not specify that the signer must be a user of any particular computerised system.

I did not locate a numbered §11.4 requirement distinct from §11.43 addressing signature medium; §11.4 is the section heading ("Certificates of Analysis") under which §§11.40–11.44 fall. §6.1 in Q7 (in the "Documentation and Records" chapter) was not examined in this pass; if it bears on hybrid records specifically, that is not established here (see "What I could not establish").

### 7. EU GMP Chapter 4 (Documentation)

Not retrieved. I did not fetch EU GMP Chapter 4 in this pass; see "What I could not establish" below.

## What I could not establish

- **Whether any source addresses the specific fact pattern in this ticket** — a free-text field inside a computerised record (`qaApprover` / `qaApprovalDate` / `qaApprovalReference`) transcribed by a third party (a laboratory administrator, not the approver) from an approval executed entirely outside the system. Every source above addresses hybrid *records* (paper-plus-electronic) or *signatures* (handwritten-to-electronic) as a medium question. None of the sources I found addresses, specifically, an approval act that is (a) performed by someone who never touches the computerised system at all, and (b) entered into that system by a *different* person acting as scribe. The closest textual hook is PI 041-1 §9.10's general requirement for "procedures... to manage and appropriately control the interface between manual and automated systems, particularly steps associated with... manual input of manually generated data into computerised systems" — but this is about data/record transcription generally, not narrowly about who may transcribe an approval on another person's behalf, and PI 041-1 does not use the word "transcription" in a context that names quality-unit approvals as a special case.
- **Whether Part 11's §11.10(g) "authority checks"** (not quoted at length in this document; see this repository's `docs/research/account-controls-regulatory-text.md` for its full text) bears on the transcription scenario — i.e., whether a system that lets an administrator enter someone else's approval is consistent with an "authority check to ensure only authorized individuals can... perform the operation at hand." I did not analyze that interaction here; it would require reading §11.10(g) together with the hybrid guidance quoted above, and the guidance itself does not cross-reference §11.10(g) in its hybrid discussion.
- **EU GMP Annex 11's current force.** As noted in other research notes in this repository, a revision was in public consultation July–October 2025; I did not re-check whether a replacement has been adopted since. Revision 1 (2011) is quoted here as the version I confirmed live on 2026-09-11 from the European Commission's own site, but I did not repeat the check for a newer adopted text in this pass.
- **ICH Q7 §6.1** and any further Q7 provisions on documentation medium were not examined; only §2.2 and §11.4/11.43 were pulled, per the task's stated priorities.
- **EU GMP Chapter 4 (Documentation)** was not fetched in this pass — I could not locate and retrieve it within scope; its content on signature and "recording by electronic means" is not addressed here.
- **Whether "increased data review... required for hybrid systems" (PI 041-1 §9.5/§9.10) translates into any specific control that a review-and-approval workflow tool like Benchline would need to implement.** PI 041-1 says review should increase; it does not specify what that increase must consist of.

None of the above is a compliance determination. This document reports what the cited primary texts say; it does not decide whether any particular design (including the `qaApprover` field construct described in the ticket) satisfies them.

## Sources

1. FDA, *Guidance for Industry — Part 11, Electronic Records; Electronic Signatures — Scope and Application*, final, August 2003. `https://www.fda.gov/media/75414/download`. Retrieved and confirmed final (August 2003, not a draft) 2026-09-11.
2. 21 CFR Part 11, eCFR, version as of issue date 2026-09-09 (most recent available), retrieved via `https://www.ecfr.gov/api/versioner/v1/full/2026-09-09/title-21.xml?part=11`; canonical view `https://www.ecfr.gov/current/title-21/chapter-I/subchapter-A/part-11`. Retrieved 2026-09-11.
3. 21 CFR Part 211, eCFR, version as of issue date 2026-09-09, retrieved via `https://www.ecfr.gov/api/versioner/v1/full/2026-09-09/title-21.xml?part=211`; canonical view `https://www.ecfr.gov/current/title-21/chapter-I/subchapter-A/part-211`. Retrieved 2026-09-11.
4. European Commission, EudraLex Volume 4, Annex 11: Computerised Systems, "revision 1," in force from 30 June 2011. `https://health.ec.europa.eu/system/files/2016-11/annex11_01-2011_en_0.pdf`. Retrieved 2026-09-11. Currency not re-verified against a possible post-2025-consultation replacement; see "What I could not establish."
5. PIC/S, PI 041-1, *Good Practices for Data Management and Integrity in Regulated GMP/GDP Environments*, 1 July 2021 (final, in force). `https://picscheme.org/docview/4234`. Retrieved 2026-09-11.
6. ICH, Q7, *Good Manufacturing Practice Guide for Active Pharmaceutical Ingredients*, retrieved from ICH's own database. `https://database.ich.org/sites/default/files/Q7%20Guideline.pdf`. Retrieved 2026-09-11. (Also mirrored by FDA at `https://www.fda.gov/media/112426/download`, not independently cross-checked in this pass.)
