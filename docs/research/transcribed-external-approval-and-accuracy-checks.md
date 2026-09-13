# When a person keys an externally-executed approval (a paper-signed quality-unit approval, say) into a computerised GMP system as a citation — approver name, date, document reference — what do primary sources require of that transcription? Is it a "true copy" question, does it demand a second-person accuracy check, and what is required of the transcriber's own attribution?

**Asked by:** Orchestrator — quality-unit-approval-as-citation question, Benchline wayfinder map
**Date:** 2026-09-11
**Status of sources:** All texts below were fetched live as PDFs/XML and converted with `pdftotext -layout` or read as XML on 2026-09-11, then searched and quoted from the extracted text — not recalled or paraphrased from memory or from secondary write-ups. Currency checks performed: (1) the FDA guidance's own text was grepped for "December 2018" and for the word "draft," confirming this is the final December 2018 Q&A guidance, not the 2016 or November 2018 draft; (2) EU GMP Annex 11 was confirmed by its own header text as "revision 1... Deadline for coming into operation: 30 June 2011," the version still current as of retrieval (a 2025 draft revision remains in consultation and unadopted — not re-verified in this pass, see prior ticket `docs/research/account-controls-regulatory-text.md`); (3) PIC/S PI 041-1 was confirmed by its own cover/footer text as "1 July 2021," the current final version (not Draft 2/2016 or Draft 3/2018); (4) MHRA's guidance was confirmed by its own header/footer text as "Revision 1: March 2018," the correct current version named in the task; (5) 21 CFR Parts 11 and 211 were retrieved from the eCFR versioner API for issue date 2026-09-09, the most recent available. NIST HB 150 was not consulted and is not relevant to this question.

## Findings

### 1. EU GMP Annex 11 (Revision 1, in force since 30 June 2011)

Source: `https://health.ec.europa.eu/system/files/2016-11/annex11_01-2011_en_0.pdf`, retrieved and converted to text 2026-09-11.

**§6, "Accuracy Checks," quoted in full and verbatim:**

> "6. Accuracy Checks
> For critical data entered manually, there should be an additional check on the accuracy of the data. This check may be done by a second operator or by validated electronic means. The criticality and the potential consequences of erroneous or incorrectly entered data to a system should be covered by risk management."

This confirms the wording given in the task prompt as a lead: the check is conditional on the data being **"critical"** (a risk-management determination, not automatic for all manually entered data), and the check "may be" done by a second operator or by validated electronic means — phrased as a permitted method of satisfying the requirement, not as an unconditional mandate for human double-entry. The requirement itself ("there should be an additional check") is stated as an obligation ("should," in EU-guidance usage, functions as a requirement unless a documented, risk-based justification is made for departing from it) that attaches once the data is determined "critical."

**§5, "Data," quoted in full:**

> "5. Data
> Computerised systems exchanging data electronically with other systems should include appropriate built-in checks for the correct and secure entry and processing of data, in order to minimize the risks."

This addresses **system-to-system electronic data exchange**, not manual keying of a citation by a person. It is not on point to the transcription scenario in the task; §6 is the operative clause for manual entry.

**§8, "Printouts," quoted in full:**

> "8. Printouts
> 8.1 It should be possible to obtain clear printed copies of electronically stored data.
> 8.2 For records supporting batch release it should be possible to generate printouts indicating if any of the data has been changed since the original entry."

Addresses output from the computerised system, not input of external citation data. Not on point.

**§12.4, quoted in full:**

> "12.4 Management systems for data and for documents should be designed to record the identity of operators entering, changing, confirming or deleting data including date and time."

This is the clause bearing on the **transcriber's own attribution**: it requires that the system record who entered the data (and when), independent of and in addition to the check required by §6. It does not by its own terms require the transcriber's identity to be recorded *as part of the data content itself* — only that the system's management design record the operator's identity against the entry.

No clause of Annex 11 uses the phrase "true copy" or "transcription." §6 is written generically to "critical data entered manually," which textually covers keying in a citation to an external approval, but Annex 11 does not separately address the distinction between transcribing the *content* of an external document (a copy question) and transcribing a *pointer/citation* to it (an attribution question) — see item 7 below.

### 2. FDA, *Data Integrity and Compliance With Drug CGMP: Questions and Answers*, final, December 2018

Source: `https://www.fda.gov/media/119267/download`, retrieved and converted to text 2026-09-11. Confirmed final December 2018 (the document's own header/footer reads "Guidance for Industry ... December 2018"; no "draft" language appears anywhere in the extracted text).

**Q1.a, on "data integrity" and ALCOA** — the guidance states: "Complete, consistent, and accurate data should be attributable, legible, contemporaneously recorded, original or a true copy, and accurate (ALCOA)." A footnote maps each ALCOA element to specific CFR citations: "for original or a true copy, see §§ 211.180 and 211.194(a)."

**Q1.d, "How does FDA use the terms 'static' and 'dynamic'?"** (quoted): "static is used to indicate a fixed-data record such as a paper record or an electronic image, and dynamic means that the record format allows interaction between the user and the record content."

**Q1.e, on "backup" under §211.68(b)** (quoted): "FDA uses the term backup in § 211.68(b) to refer to a true copy of the original record that is maintained securely throughout the record retention period... Backup data must be exact, complete, and secure from alteration, inadvertent erasures, or loss."

**Q10, "Is it acceptable to retain paper printouts or static records instead of original electronic records from stand-alone computerized laboratory instruments?"** (quoted, the most extended true-copy/static-dynamic treatment in the guidance): "A paper printout or static record may satisfy retention requirements if it is the original record or a true copy of the original record... True copies of dynamic electronic records may be made and maintained in the format of the original records or in a format that allows for the content and meaning of the original records to be preserved if a suitable reader and copying equipment ... are readily available (§§ 211.180(d) and 212.110)." The same answer states: "You must ensure that original laboratory records, including paper and electronic records, are subject to second-person review (§ 211.194(a)(8)) to make certain that all test results and associated information are appropriately reported."

**Q12, "When does electronic data become a CGMP record?"** contains the only explicit statement in this guidance on discarding paper after transcription (quoted): "It is not acceptable to record data on pieces of paper that will be discarded after the data are transcribed to a permanent laboratory notebook (see §§ 211.100(b), 211.160(a), and 211.180(d))." This addresses transcription **within a lab's own record chain** (bench paper to notebook), not transcription of a citation to a separately retained, externally executed approval. It is analogous in kind (loss of the original if the paper is discarded) but does not speak to the fact pattern in the task.

**On the specific fact pattern (a citation — name/date/document reference — to an externally executed paper approval, keyed into a separate computerised system while the paper original is retained elsewhere):** I searched the full extracted text of this guidance for "citation," "reference," "pointer," and found no Q&A addressing that pattern by name. The guidance's true-copy discussion (Q10, Q1.e) is framed around retaining or reproducing the *content* of a record, not around a system field that merely cites (identifies) an external record that continues to exist and be retained as the record of approval. This guidance does not resolve whether a name/date/document-reference citation is treated as a "copy" requiring true-copy controls, or as ordinary attributable metadata.

### 3. PIC/S PI 041-1, "Good Practices for Data Management and Integrity in Regulated GMP/GDP Environments," 1 July 2021

Source: `https://picscheme.org/docview/4234`, retrieved and converted to text 2026-09-11. Confirmed final by cover-page text "PI 041-1, 1 July 2021" (distinct from the superseded 2016/2018 drafts).

**§7.7, "True copies," quoted (selected, verbatim):**

> "7.7.1 Copies of original paper records (e.g. analytical summary reports, validation reports, etc.) are generally very useful for communication purposes... These records should be controlled during their life cycle to ensure that the data received from another site (sister company, contractor, etc.) are maintained as 'true copies' where appropriate, or used as a 'summary report' where the requirements of a 'true copy' are not met."
>
> "7.7.5 Care should be taken to ensure that documents are appropriately authenticated as 'true copies' in a manner that allows the authenticity of the document to be readily verified, e.g. through the use of handwritten or electronic signatures or generated following a validated process for creating true copies."

The accompanying procedural table (§7.7, "How should the 'true copy' be issued and controlled?") requires, for a paper true copy: "Obtain the original of the document to be copied; Photocopy the original document ensuring that no information from the original copy is lost; Verify the authenticity of the copied document and sign and date the new hardcopy as a 'true copy'." For an electronic true copy: "A 'true copy' of an electronic record should be created by electronic means (electronic file copy), including all required metadata. Creating pdf versions of electronic data should be prohibited, where there is the potential for loss of metadata." At the receiving company: "The document should clearly indicate that it is a true copy and not an original record," and "A system should be in place to verify the authenticity of 'true copies' e.g. through verification of the correct signatories."

This entire section is framed around **copying the content** of a document (a photocopy, scan, or file copy of the approval record itself) so that the copy can substitute for or accompany the original. It does not address a bare name/date/reference citation typed into an unrelated system field.

**§8.8, "Verification of records (secondary checks)," quoted (verbatim, selected):**

> "Records of critical process steps, e.g. critical steps within batch records, should be: - reviewed/witnessed by independent and designated personnel at the time of operations occurring; and - reviewed by an approved person within the production department before sending them to the Quality unit; and - reviewed and approved by the Quality Unit ... before release or distribution of the batch produced... Laboratory records for testing steps should also be reviewed by designated personnel (e.g.: second analysts) following completion of testing... This verification should be conducted after performing production-related tasks and activities and be signed or initialled and dated by the appropriate persons."

Also, on transcription for calculations, §8.8's inspection checklist (item under "Check items 1, 2, 3, and 4 of section 8.6 and Items 1 and 2 of section 8.7"): "View original data (where possible) to confirm that the correct data was transcribed for the calculation." This is the closest PI 041-1 language to a second-person accuracy check specifically on a transcription step, but it is framed as an inspector's checklist item tied to calculation review, not a general rule for citation entries.

**Hybrid systems, §8.6 area (quoted, verbatim):** "Procedures and records should be available to manage and appropriately control the interface between manual and automated systems, particularly steps associated with: - manual input of manually generated data into computerised systems; - transcription (including manual) of data generated by automated systems onto paper records; and - automated detection and transcription of printed data into computerised systems." The associated inspection guidance states: "Attention should be paid to the interface between the manual and computerised system. Inspectors should verify that adequate controls and secondary checks are in place where manual transcription between systems takes place. Original data should be retained following transcription and processing."

This is on point for the fact pattern under study: it treats "manual input of manually generated data into computerised systems" as a hybrid-system interface requiring "adequate controls and secondary checks," and separately requires "original data" to be "retained" — i.e., it contemplates that the paper original continues to exist as the record of record and the computerised entry is a downstream, controlled transcription, not itself a substitute record. It does not, however, specifically use the word "citation" or distinguish a pointer from a content copy.

**Scribes (§8, footnote, quoted verbatim):** "The use of scribes (second person) to record activity on behalf of another operator should be considered 'exceptional'... In both situations, the scribe recording should be contemporaneous with the task being performed, and should identify both the person performing the observed task and the person completing the record. The person performing the observed task should countersign the record wherever possible." This is about someone recording *on behalf of* the person who performed an act (not the fact pattern here — a lab administrator would not be recording on behalf of the approver, but transcribing a reference to an approval that has already been separately, independently made and signed), but it is the clearest PIC/S statement that when a second person enters data attributable to someone else's act, **both** the entering person's identity and the acting person's identity must appear in the record, with a countersignature by the person whose act is being recorded "wherever possible."

**Occurrence check:** "true copy"/"true copies" appears repeatedly, concentrated in §7.7; "transcri-" (transcription/transcribed/transcribing) appears in the hybrid-systems section (§8.6 area), the calculation-verification checklist (§8.8 area), and the interface/migration risk section (data may be "amended or transcribed incorrectly during the transfer process"); "second person"/"secondary check(s)" appear in §8.8 (record verification) and the scribe footnote.

### 4. 21 CFR Part 211

Source: eCFR versioner API, `https://www.ecfr.gov/api/versioner/v1/full/2026-09-09/title-21.xml?part=211`, retrieved 2026-09-11 (compressed XML, decompressed and parsed with a script; text quoted below extracted directly from that XML).

**Case-insensitive occurrence counts across the full text of Part 211** (searched with `grep -o -i <term> part211.xml | wc -l` against the retrieved XML): "transcri" — **0 occurrences**. "true copy" — **0 occurrences**. "verif" — **11 occurrences** (§§211.84, 211.101(d), 211.103, 211.115, 211.150(b)-area, 211.166, 211.194(a)(2), 211.194(b), 211.68(b)-area language uses "verification" once). Part 211's own text never uses the words "transcription" or "true copy" — those are FDA guidance terms (from the Q&A document) mapped onto Part 211 sections, not Part 211's own vocabulary.

- **§211.180(d), quoted in full:** "Records required under this part may be retained either as original records or as true copies such as photocopies, microfilm, microfiche, or other accurate reproductions of the original records. Where reduction techniques, such as microfilming, are used, suitable reader and photocopying equipment shall be readily available." (Note: the phrase "true copies" appears here in the regulation's own text as an example category — the grep count above found the split words "true" and "copy" would not co-locate as the literal string "true copy," since the regulation writes "true copies"; a search for "true cop" returns this hit. This section is the CFR anchor for what FDA's guidance calls a "true copy.")
- **§211.188(a)**, quoted: "An accurate reproduction of the appropriate master production or control record, checked for accuracy, dated, and signed." This requires that a batch record be an accurate reproduction of the master, and be "checked for accuracy" — a second-person-style accuracy check on reproduction, though not explicitly requiring a second person.
- **§211.194(a)(7)–(8)**, quoted: "(7) The initials or signature of the person who performs each test and the date(s) the tests were performed. (8) The initials or signature of a second person showing that the original records have been reviewed for accuracy, completeness, and compliance with established standards." This is the textual basis FDA's guidance (Q10) cites for "second-person review" of laboratory records, but it requires review of "the original records" for accuracy/completeness/compliance — it does not by its own terms require a second person specifically at the point of a manual transcription/citation entry; it requires a second-person review of the record as a whole.
- **§211.68(b)**, quoted: "Appropriate controls shall be exercised over computer or related systems to assure that changes in master production and control records or other records are instituted only by authorized personnel. Input to and output from the computer or related system of formulas or other records or data shall be checked for accuracy. The degree and frequency of input/output verification shall be based on the complexity and reliability of the computer or related system." This is the closest Part 211 language to an "accuracy check on manual entry" requirement (paralleling Annex 11 §6): it requires input/output to be "checked for accuracy," with the "degree and frequency" of that check scaled by risk ("complexity and reliability of the... system") rather than fixed. It does not name a second person specifically, though FDA's Q&A guidance (Q4, quoted in a related prior ticket) reads §211.68(b) together with §211.194(a)(8) to require attributability and accuracy controls on data entry.

**No provision found in Part 211 that distinguishes a citation/pointer to an external record from a copy of its content.** The regulation's "true copies" language (§211.180(d)) is about retaining the record itself in an alternate medium, not about a separate system recording a reference to a record retained elsewhere.

### 5. 21 CFR Part 11

Source: eCFR versioner API, `https://www.ecfr.gov/api/versioner/v1/full/2026-09-09/title-21.xml?part=11`, retrieved 2026-09-11.

**§11.10, quoted in relevant part (verbatim):**

> "(a) Validation of systems to ensure accuracy, reliability, consistent intended performance, and the ability to discern invalid or altered records.
> (b) The ability to generate accurate and complete copies of records in both human readable and electronic form suitable for inspection, review, and copying by the agency...
> (c) Protection of records to enable their accurate and ready retrieval throughout the records retention period.
> ...
> (e) Use of secure, computer-generated, time-stamped audit trails to independently record the date and time of operator entries and actions that create, modify, or delete electronic records. Record changes shall not obscure previously recorded information...
> ...
> (k) Use of appropriate controls over systems documentation including: (1) Adequate controls over the distribution of, access to, and use of documentation for system operation and maintenance. (2) Revision and change control procedures to maintain an audit trail that documents time-sequenced development and modification of systems documentation."

§11.10(b) requires that the system be able to produce "accurate and complete copies" of its own records for the agency — this is about the system's records generally, not specifically about a citation field's accuracy against an external paper document. §11.10(e) requires an audit trail of "operator entries," which would capture who entered a citation and when, but does not itself impose a second-person check on the entry's correctness. Part 11 contains no clause specifically addressing accuracy-checking of manually keyed data against an external source, and none addressing "true copy" of externally-signed paper approvals (that vocabulary is Part 211/guidance/PIC/S/MHRA, not Part 11).

### 6. MHRA, 'GXP' Data Integrity Guidance and Definitions, Revision 1: March 2018

Source: `https://assets.publishing.service.gov.uk/media/5aa2b9ede5274a3e391e37f3/MHRA_GxP_data_integrity_guide_March_edited_Final.pdf`, retrieved and converted to text 2026-09-11 — reachable, and its own header/footer text ("MHRA GXP Data Integrity Guidance and Definitions; Revision 1: March 2018") confirms this is the version named in the task, not a later or earlier edition (a subsequent MHRA "Data Integrity Guidance and Definitions" was in development as of late 2020s industry commentary, but this fetch obtained the March 2018 text specifically requested and did not attempt to locate a newer edition).

**§6.11.2, "True copy," quoted (verbatim):**

> "A copy (irrespective of the type of media used) of the original record that has been verified (i.e. by a dated signature or by generation through a validated process) to have the same information, including data that describe the context, content, and structure, as the original."

This is the clearest primary-source *definition* found across all documents checked: a true copy is defined by (1) being a copy of the original record's full information (content, context, structure) and (2) having been *verified* as such, by dated signature or validated process. This definition, by its own terms, is about copying a record's full content — a bare citation (name/date/reference) is not "the same information... as the original" in the sense used here; it is a much smaller extract.

**§6.11.1, "Original record"** includes (verbatim): "Where the data obtained requires manual observation to record (for example results of a manual titration, visual interpretation of environmental monitoring plates) the process should be risk assessed and depending on the criticality, justify if a second contemporaneous verification check is required." This states the check is conditional on a risk assessment and criticality determination, and is presented as something to be "justif[ied]" as required or not — closer to Annex 11's "should" language than to an unconditional mandate.

**On manual transcription specifically, in the context of retaining static records of dynamic data (verbatim, directly on point):**

> "Where manual transcriptions occur, these should be verified by a second person or validated system."

This sentence is the single most directly on-point statement found in any source for the general proposition "manual transcription requires a second-person (or validated-system) accuracy check." It appears in §6.11 in the specific context of retaining printed/static copies of what were originally dynamic electronic records — not framed generally as a rule for all manual transcription across all record types, and not framed specifically around citations to externally executed paper approvals. Whether it extends to a citation-only entry (as opposed to a content transcription) is not addressed by the surrounding text.

**On attribution of the person entering data:** §5.1 (Designing systems) states, among enablers of good practice: "User access rights that prevent (or audit trail, if prevention is not possible) unauthorised data amendments." Elsewhere (§ on system access, quoted): "...functionality that is appropriate for their job role, and that actions are attributable to a specific [individual]... because they are vulnerable to non-attributable data changes." The guidance's general ALCOA framework (§3, referencing "Attributable, Legible, Contemporaneous, Original, and Accurate") requires that data be "attributable to the person generating the data" (§6.1, "A – attributable to the person generating the data"), which by its terms would require the transcribing administrator's own identity to be recorded against the entry they made — but the guidance does not separately state whether the *system* must also capture that this data originated from, and cites, an external paper record signed by a different, named individual (the approver), as opposed to treating the administrator as the sole "generator" of the entered data.

### 7. The pointer/citation vs. content-copy distinction

Across all six primary sources checked, none draws an explicit, named distinction between:

(a) **transcribing/copying the content** of an external record (which each source addresses at length — under "true copy," Annex 11 §6/§8, Part 211 §211.180(d), Part 11 §11.10(b), PI 041-1 §7.7, MHRA §6.11.2), and

(b) **entering a citation or pointer** to an external record that continues to exist and be retained separately (approver name, date, document reference, as three free-text fields, with the underlying paper document retained elsewhere as the record of the approval).

The closest textual hooks are: EU GMP Annex 11 §6 ("critical data entered manually" — broad enough on its face to cover a citation, since a citation is manually entered data, but not framed around the copy/pointer distinction); PIC/S PI 041-1's hybrid-systems language on "manual input of manually generated data into computerised systems" requiring "adequate controls and secondary checks" while "original data should be retained following transcription" (which contemplates exactly the pattern of an external original being retained while a downstream system holds a transcribed reference to it, but does not name the citation/copy distinction); and MHRA's "manual transcriptions... verified by a second person or validated system" (stated in the static/dynamic-record-retention context, not the citation-vs-copy context). No source states whether a three-field citation (name, date, document reference) is subject to the same accuracy-check expectation as a full content transcription, or a lesser one, or none.

## What I could not establish

- **Whether a bare citation (name/date/document-reference) triggers the same "true copy" and accuracy-check obligations as a content transcription.** No source draws this line explicitly; the reasoning above is inference from adjacent text, not a stated rule, and should not be read as a finding that the distinction is settled either way.
- **Whether Annex 11 §6's "critical data" threshold would, as a matter of the sources' own text, classify a quality-unit approval citation as "critical."** The clause makes criticality a risk-management determination; none of the six sources states a rule for what counts as critical data in this specific context.
- **Whether MHRA's "manual transcriptions... verified by a second person or validated system" sentence (§6.11) is confined to the static/dynamic-record-retention context in which it appears, or is meant as a general rule for all manual transcription.** The document's structure places it inside the discussion of retaining paper/static copies of originally-dynamic records; I could not find MHRA restating or generalizing this rule elsewhere in the document.
- **Whether a later edition of the MHRA guidance supersedes the March 2018 Revision 1 text quoted here.** I did not search beyond the version named in the task; if a newer MHRA data-integrity guidance has since been published, it was not checked in this pass.
- **PIC/S PI 041-1's scribe provision** (§8, footnote) addresses someone recording an act on another's behalf, which is analogous to but not identical to the administrator-transcribing-a-citation fact pattern; I found no PIC/S provision that maps precisely onto "administrator enters a reference to an approval action that a different, named person independently and previously completed on paper."
- This document does not, and is not intended to, determine whether Benchline's specific field design (three free-text columns) satisfies or fails any of the obligations quoted above. That determination is outside the scope of a source-scouting exercise and is not made here.

## Sources

1. European Commission, EudraLex Volume 4, Annex 11: Computerised Systems, "revision 1," in force from 30 June 2011. `https://health.ec.europa.eu/system/files/2016-11/annex11_01-2011_en_0.pdf`. Retrieved 2026-09-11.
2. FDA, "Data Integrity and Compliance With Drug CGMP — Questions and Answers," Guidance for Industry, final, December 2018. `https://www.fda.gov/media/119267/download`. Retrieved and confirmed final (not draft) 2026-09-11.
3. PIC/S, PI 041-1, "Good Practices for Data Management and Integrity in Regulated GMP/GDP Environments," 1 July 2021 (final). `https://picscheme.org/docview/4234`. Retrieved 2026-09-11.
4. 21 CFR Part 211, eCFR, version as of issue date 2026-09-09. `https://www.ecfr.gov/api/versioner/v1/full/2026-09-09/title-21.xml?part=211`; canonical view `https://www.ecfr.gov/current/title-21/chapter-I/subchapter-A/part-211`. Retrieved 2026-09-11.
5. 21 CFR Part 11, eCFR, version as of issue date 2026-09-09. `https://www.ecfr.gov/api/versioner/v1/full/2026-09-09/title-21.xml?part=11`; canonical view `https://www.ecfr.gov/current/title-21/chapter-I/subchapter-A/part-11`. Retrieved 2026-09-11.
6. MHRA, "'GXP' Data Integrity Guidance and Definitions," Revision 1, March 2018. `https://assets.publishing.service.gov.uk/media/5aa2b9ede5274a3e391e37f3/MHRA_GxP_data_integrity_guide_March_edited_Final.pdf`. Retrieved 2026-09-11.

This is source-gathering only; nothing in this document is a compliance determination.
