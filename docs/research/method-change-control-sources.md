# When an acceptance limit / analytical method version lives as data inside a computerised system, what do the primary data-integrity and computerised-system sources require of the change that creates a new version — and must the change request itself be a record in that system?

**Asked by:** the orchestrator (Benchline wayfinder map)
**Date:** 2026-09-11
**Status of sources:** Every quotation below was extracted from the publisher's own PDF, downloaded today and converted to text locally. Currency checks performed:

- **EU GMP Annex 11** — the legally effective text is still **revision 1, January 2011, in operation 30 June 2011**. Confirmed against the EudraLex Volume 4 index page, which today lists only "Computerised Systems (revision January 2011)". A **draft revision exists** (published for consultation 7 July 2025, consultation closed 7 October 2025) and is quoted below in a separately labelled subsection; it is **not in force**.
- **PIC/S PI 041-1, 1 July 2021** — confirmed current against the PIC/S publications index, which lists PI 041-1 dated 2021-07-01 as the only version.
- **FDA Data Integrity and Compliance With Drug CGMP: Q&A** — the file at https://www.fda.gov/media/119267/download carries the cover date **December 2018**; this is the final guidance, not the 2016 draft. Verified from the document's own cover page.
- **ICH Q7** — Current Step 4 version dated 10 November 2000 (stated on the guideline's own cover page).
- **ICH Q10** — Current Step 4 version dated 4 June 2008 (stated on the guideline's own cover page).
- **21 CFR Part 211** — eCFR reports Title 21 up to date as of **2026-09-09**, latest amendment 2026-09-08.
- **NIST HB 150-2020 was not used.** It is withdrawn and is not cited here.
- **GAMP 5 2nd edition** — paywalled; nothing returned. See section 6.

A note on binding scope, which applies to everything below: all of these documents are GMP/GDP inspection instruments addressed to manufacturers and distributors of medicinal products or APIs. None of them is self-executing against a single laboratory's internal, explicitly-unvalidated software project, and nothing here is a compliance determination. They are read below only for the **shape** the obligation takes.

## Findings

### 1. EU GMP Annex 11 (revision 1, January 2011 — the text in force)

**§10 Change and Configuration Management, quoted in full — this is the entire clause:**

> **10. Change and Configuration Management**
> Any changes to a computerised system including system configurations should only be made in a controlled manner in accordance with a defined procedure.

That is the whole of §10. Twenty-eight words. It requires a *defined procedure* and *controlled manner*; it does not name a change request, does not enumerate its contents, does not require an impact assessment, and does not say where the change record lives.

**§4 (Validation) — the parts bearing on changes to data or configuration:**

> 4.1 The validation documentation and reports should cover the relevant steps of the life cycle. Manufacturers should be able to justify their standards, protocols, acceptance criteria, procedures and records based on their risk assessment.
>
> 4.2 Validation documentation should include change control records (if applicable) and reports on any deviations observed during the validation process.

§4.2 is the only place in the in-force Annex 11 where the phrase **"change control records"** appears, and it appears as an input to *validation documentation* — i.e. the change record is expected to exist as a retained artefact, but Annex 11 does not say it must live inside the system being changed.

Also bearing on the question:

> 4.7 Evidence of appropriate test methods and test scenarios should be demonstrated. Particularly, system (process) parameter limits, data limits and error handling should be considered.

> **9. Audit Trails**
> Consideration should be given, based on a risk assessment, to building into the system the creation of a record of all GMP-relevant changes and deletions (a system generated "audit trail"). For change or deletion of GMP-relevant data the reason should be documented. Audit trails need to be available and convertible to a generally intelligible form and regularly reviewed.

> 11. Periodic evaluation — Computerised systems should be periodically evaluated to confirm that they remain in a valid state and are compliant with GMP. Such evaluations should include, where appropriate, the current range of functionality, deviation records, incidents, problems, upgrade history, performance, reliability, security and validation status reports.

**Does Annex 11 (in force) distinguish configuration data from system software?** *Not meaningfully.* §10 collapses them into one sentence — "Any changes to a computerised system **including system configurations**". The Glossary defines *Application*, *Bespoke/Customized computerised system*, *Commercial off the shelf software*, *IT Infrastructure*, *Life cycle*, *Process owner*, *System owner* and *Third Party*. **There is no glossary entry for "configuration", "configuration data", or "critical data"**, and no clause anywhere in the in-force Annex that treats a stored limit or a rounding rule differently from executable code. The word "configuration" occurs only in §10.

Source: [Annex 11: Computerised Systems, EudraLex Vol. 4, revision 1, coming into operation 30 June 2011](https://health.ec.europa.eu/system/files/2016-11/annex11_01-2011_en_0.pdf)

#### 1b. DRAFT ONLY — NOT IN FORCE — Annex 11 consultation draft, 7 July 2025

Clearly labelled as draft. Consultation closed 7 October 2025; no final text published as of today. Quoted because the orchestrator asked for it, **not** as authority.

The draft restructures the Annex into 17 chapters and **deletes the standalone "Change and Configuration Management" chapter**, relocating the requirement into the Pharmaceutical Quality System chapter:

> ii. Any change to a computerised system including but not limited to its configuration, its hardware and software components, and its platform and operating system, are made in a controlled manner and in accordance with defined procedures. Any significant change which may impact product quality, patient safety or data integrity, should be subject to re-qualification and validation.

The draft **does** introduce an explicit configuration-specification concept that the in-force text lacks:

> 6.6. **Configuration.** It should be clear what functionality, if any, is modified or added by configuration of a system. Options allowing configuration of system functionality should be described in the requirements specification and the chosen configuration should be documented in a controlled configuration specification.

Draft glossary:

> **Change control** — Ongoing evaluation and documentation of system operations and changes to determine whether the actual changes might affect a validated status of the computerised system. The intent is to determine the need for action that would ensure that the system is maintained in a validated state.
>
> **Configuration** — A configuration is an arrangement of functional units and pertains to the choice of hardware, software and documentation. It affects function and performance of the system.

Draft audit-trail chapter, on reason-for-change:

> ... change (including the user's role, if users may have more than one role), what was changed (including the data that was changed and the old and the new value), and the date and time when the change was made (including the time zone if applicable). Audit trail data should be recorded at the time of events, not at the end of a process. Where data is changed from [an original value, it should be recorded] the reason, why the change was made.

> A key element should be to verify the reason why a change is made.

Draft periodic review, on cumulative change effect:

> iii. The combined effect of multiple changes in this, and in other systems, should be assessed. Undocumented (unapproved) changes should be effectively identified, e.g. by means of configuration auditing.

Source (draft): [Annex 11: Computerised Systems — consultation guideline, European Commission, 7 July 2025](https://health.ec.europa.eu/document/download/40231f18-e564-4043-94de-c031f813d38b_en?filename=mp_vol4_chap4_annex11_consultation_guideline_en.pdf)

Even the draft **does not use the term "change request"** and does not say where such a record must be held.

### 2. PIC/S PI 041-1 (1 July 2021)

Document history, from the document itself: adopted by Committee 1 June 2021, entry into force 1 July 2021.

**On change control of computerised systems** — §9.3 (Validation and Maintenance), Item 3 expectation, listing what a Validation Summary Report must state or reference:

> - Critical system configuration details and controls for restricting access to configuration and any changes (change management).

and in the same section's check-list:

> Check the procedures for system access to ensure modifications or changes to systems are restricted and subject to change control management.

**On critical configuration** — §9.3, Item 2 expectation:

> Assessments should also review the vulnerability of the system to inadvertent or unauthorised changes to **critical configuration settings** or manipulation of data. All controls should be documented and their effectiveness verified.

§9.5 (System security), on operating parameters — this is the closest PI 041-1 comes to the question of a limit held as data:

> - Security of system settings, configurations and key data. **Access to critical data/operating parameters of systems should be appropriately restricted and any changes to settings/configuration controlled through change management processes by authorised personnel.**

**On the reason for a change being recorded** — §9.6 (Audit trails), Item 2 expectation:

> The audit trail should include the following parameters:
> - details of the user that undertook the action;
> - what action occurred, was changed, incl. old and new values;
> - when the action was taken, incl. date and time;
> - **why the action was taken (reason)**; and
> - in the case of changes or modifications to data, **the name of any person authorising the change**.

And for paper records, §8.7:

> Where appropriate, the reason for the correction should be clearly recorded and verified if critical. ... If changes have been made to critical data entries, verify that a valid reason for the change has been recorded and that supporting evidence for the change is available.

**The single most load-bearing sentence in PI 041-1 for this design question** — §9.6, following the audit-trail parameter list:

> **Note: An audit trail should not be confused with a change control system where changes may needed to appropriately controlled and approved under a PQS.**

(quoted verbatim, including the grammatical error in the original). PI 041-1 therefore explicitly separates the two mechanisms: the audit trail records *that a value changed and why*; the change control system is a *distinct* thing under the quality system where a change is controlled and approved. It does not say whether that distinct thing is inside or outside the computerised system.

§9.8 (Review of data), on authorisation of change:

> ... critical data should be audited by the regulated user and verified to determine that operations were performed correctly and whether any change (modification, deletion or overwriting) have been made to original information in electronic records ... **All changes should be duly authorised.**

§9.3 Item 5 (Periodic System Evaluation), on cumulative change:

> Computerised systems should be evaluated periodically in order to ensure continued compliance with respect to data integrity controls. The evaluation should include deviations, changes (including any cumulative effect of changes), upgrade history, performance and maintenance, and **assess whether these changes have had any detrimental effect on data management and integrity controls.** ... **The assessment performed should be documented.**

**Is a change to a specification/limit held in a system treated as a change requiring control?** Only by inference from the §9.5 "critical data/operating parameters ... controlled through change management processes" sentence quoted above. **PI 041-1 never uses the phrase "acceptance limit", and never addresses a specification change as such.** It is a data-integrity document, not a change-control document; it presumes a change control system exists under the PQS and describes controls around it.

Source: [PIC/S PI 041-1, *Good Practices for Data Management and Integrity in Regulated GMP/GDP Environments*, 1 July 2021](https://picscheme.org/docview/4234)

### 3. FDA, *Data Integrity and Compliance With Drug CGMP: Questions and Answers*, December 2018

**Plainly: no Q&A in this guidance addresses changes to specifications, limits, or method parameters as a change-control subject, and none requires that the reason for a change be recorded.** The 18 questions are about record definitions, invalidating results, workflow validation, access restriction, shared logins, blank forms, audit trail review (who/how often), electronic copies, printouts, electronic signatures, when data becomes a CGMP record, system suitability, reprocessed data, internal tips, training, FDA's access to records, and remediation. None is about change control.

The one passage that touches limits and method parameters at all is Q4, and it is about **access restriction, not change records**:

> **4. How should access to CGMP computer systems be restricted?**
> You must exercise appropriate controls to assure that changes to computerized MPCRs or other CGMP records or input of laboratory data into computerized records can be made only by authorized personnel (§ 211.68(b)). ... **FDA recommends that you restrict the ability to alter specifications, process parameters, data, or manufacturing or testing methods by technical means where possible (e.g., by limiting permissions to change settings or data).**
>
> The system administrator role, including any rights to alter files and settings, should be assigned to personnel independent from those responsible for the record content.

Q3 bears on what happens when a configured workflow changes, indirectly:

> If you validate the computer system but you do not validate it for its intended use, you cannot know if your workflow runs correctly. For example, qualifying the Manufacturing Execution System (MES) platform, a computer system, ensures that it meets its relevant requirements and specifications; however, it does not demonstrate that a given MPCR generated by the MES contains the correct calculations. In this example, validating the workflow ensures that the intended steps, requirements, and calculations in the MPCR are accurate and perform properly.

The guidance is marked "Contains Nonbinding Recommendations" on every page.

**The binding US requirement on this point is not in the guidance but in the regulation it points at.** 21 CFR 211.160(a) (eCFR, Title 21 up to date as of 2026-09-09):

> The establishment of any specifications, standards, sampling plans, test procedures, or other laboratory control mechanisms required by this subpart, **including any change in such specifications, standards, sampling plans, test procedures, or other laboratory control mechanisms, shall be drafted by the appropriate organizational unit and reviewed and approved by the quality control unit.** The requirements in this subpart shall be followed and shall be documented at the time of performance. Any deviation from the written specifications, standards, sampling plans, test procedures, or other laboratory control mechanisms shall be recorded and justified.

This is the source that *owns* the claim "a change to an acceptance limit must be drafted by one unit and approved by another". It says nothing about where that drafting and approval is recorded, and nothing about impact on results already reported.

Sources: [FDA guidance, December 2018](https://www.fda.gov/media/119267/download); [21 CFR 211.160](https://www.ecfr.gov/current/title-21/part-211/section-211.160)

### 4. ICH Q7 — Change Control

**Correction to the question as asked:** ICH Q7 §2.5 is **Product Quality Review**, not Change Control. Change control is **§13**. §2.5 is quoted anyway because it is adjacent:

> 2.50 Regular quality reviews of APIs should be conducted ... should include at least: ... A review of any changes carried out to the processes or analytical methods; ...
> 2.51 The results of this review should be evaluated and an assessment made of whether corrective action or any revalidation should be undertaken. Reasons for such corrective action should be documented.

**§13 CHANGE CONTROL, quoted in full through 13.17:**

> 13.10 A formal change control system should be established to evaluate all changes that may affect the production and control of the intermediate or API.
>
> 13.11 Written procedures should provide for the **identification, documentation, appropriate review, and approval of changes in raw materials, specifications, analytical methods, facilities, support systems, equipment (including computer hardware), processing steps, labelling and packaging materials, and computer software.**
>
> 13.12 **Any proposals for GMP relevant changes should be drafted, reviewed, and approved by the appropriate organisational units, and reviewed and approved by the quality unit(s).**
>
> 13.13 **The potential impact of the proposed change on the quality of the intermediate or API should be evaluated. A classification procedure may help in determining the level of testing, validation, and documentation needed to justify changes to a validated process. Changes can be classified (e.g. as minor or major) depending on the nature and extent of the changes, and the effects these changes may impart on the process.** Scientific judgement should determine what additional testing and validation studies are appropriate to justify a change in a validated process.
>
> 13.14 When implementing approved changes, measures should be taken to ensure that all documents affected by the changes are revised.
>
> 13.15 **After the change has been implemented, there should be an evaluation of the first batches produced or tested under the change.**
>
> 13.16 **The potential for critical changes to affect established retest or expiry dates should be evaluated.** If necessary, samples of the intermediate or API produced by the modified process can be placed on an accelerated stability program and/or can be added to the stability monitoring program.
>
> 13.17 Current dosage form manufacturers should be notified of changes from established production and process control procedures that can impact the quality of the API.

**And §12.83, which is the most directly on-point sentence found in any source for a *method* change specifically:**

> 12.83 **Complete records should be maintained of any modification of a validated analytical method. Such records should include the reason for the modification and appropriate data to verify that the modification produces results that are as accurate and reliable as the established method.**

**Scope caveat, stated plainly:** ICH Q7 is titled *Good Manufacturing Practice Guide for Active Pharmaceutical Ingredients*. Its scope is APIs and intermediates, not finished drug product QC laboratories, and it is not written for computerised systems at all — computers appear only as "equipment (including computer hardware)" and "computer software" in the 13.11 list.

**Is it nonetheless the clearest statement of the *shape* of a change-control record among these sources?** On the evidence collected: yes, factually. It is the only source examined that names all four elements the orchestrator's synthetic SOP contains — a change proposal that is drafted (13.12), a documented identification and reason (13.11, 12.83), an evaluated impact (13.13, 13.16), and a two-tier approval with the quality unit as second approver (13.12). No other source reviewed names all four. That is an observation about textual coverage, not a recommendation.

Source: [ICH Q7, Current Step 4 version dated 10 November 2000](https://database.ich.org/sites/default/files/Q7%20Guideline.pdf)

### 5. ICH Q10 §3.2.3 Change Management System

Accessible. Quoted in full:

> **3.2.3 Change Management System**
> Innovation, continual improvement, the outputs of process performance and product quality monitoring and CAPA drive change. In order to evaluate, approve and implement these changes properly, a company should have an effective change management system. There is generally a difference in formality of change management processes prior to the initial regulatory submission and after submission, where changes to the regulatory filing might be required under regional requirements.
>
> The change management system ensures continual improvement is undertaken in a timely and effective manner. **It should provide a high degree of assurance there are no unintended consequences of the change.**
>
> The change management system should include the following, as appropriate for the stage of the lifecycle:
>
> (a) **Quality risk management should be utilised to evaluate proposed changes. The level of effort and formality of the evaluation should be commensurate with the level of risk;**
>
> (b) Proposed changes should be evaluated relative to the marketing authorisation, including design space, where established, and/or current product and process understanding. There should be an assessment to determine whether a change to the regulatory filing is required under regional requirements. As stated in ICH Q8, working within the design space is not considered a change (from a regulatory filing perspective). However, from a pharmaceutical quality system standpoint, **all changes should be evaluated by a company's change management system**;
>
> (c) **Proposed changes should be evaluated by expert teams contributing the appropriate expertise and knowledge from relevant areas** (e.g., Pharmaceutical Development, Manufacturing, Quality, Regulatory Affairs and Medical), **to ensure the change is technically justified. Prospective evaluation criteria for a proposed change should be set;**
>
> (d) **After implementation, an evaluation of the change should be undertaken to confirm the change objectives were achieved and that there was no deleterious impact on product quality.**

And Table III, commercial manufacturing column:

> A formal change management system should be in place for commercial manufacturing. **Oversight by the quality unit should provide assurance of appropriate science and risk based assessments.**

Q10 requires a **risk-proportionate level of formality** ((a)), **prospective evaluation criteria set before the change** ((c)), and a **post-implementation evaluation** ((d)). It does not specify a record format or location, and does not use the term "change request".

Source: [ICH Q10, Current Step 4 version dated 4 June 2008](https://database.ich.org/sites/default/files/Q10%20Guideline.pdf)

### 6. GAMP 5 (2nd edition)

**Paywalled. Nothing returned.** The ISPE product page for the GAMP 5 Guide 2nd Edition offers the document for purchase only (digital edition priced for members and non-members; a "Buy Now" link is the only route to the text). The product page itself describes the guide's scope in marketing terms — "a risk-based approach to compliant GxP computerized systems", updated for "service providers, evolving approaches to software development, and expanded use of software tools and automation" — and **says nothing about configuration management or change records**. Per the map's standing rule, no GAMP 5 content is paraphrased from secondary sources here.

Source (product page only, no text obtained): https://ispe.org/publications/guidance-documents/gamp-5-guide-2nd-edition

### 7. The impact question: impact on results already reported / material already released

This is where the sources are thinnest and the answer is mostly negative.

**Nothing in any source examined requires an assessment of the impact of a change on *results already reported*.** The phrases "already reported", "previously reported" and "already released" appear **zero times** in Annex 11 (in force), the Annex 11 draft, PI 041-1, the FDA December 2018 Q&A, ICH Q7 and ICH Q10. This was checked by full-text search of each document.

What the sources *do* require, in descending order of proximity:

1. **ICH Q7 §13.16** — backward-looking, but about dating, not about reported results: "**The potential for critical changes to affect established retest or expiry dates should be evaluated.**" This is the only clause found in any source that looks backwards at material that already exists. It does not require the evaluation to be recorded in any particular place, and does not name an approver.

2. **ICH Q7 §13.13** — impact assessment, but **prospective**: "The potential impact of the proposed change on the quality of the intermediate or API should be evaluated." The grammatical object is "the proposed change", forward-looking.

3. **ICH Q7 §13.15** — **forward-looking**: "After the change has been implemented, there should be an evaluation of the first batches produced or tested under the change." *First batches under the change*, not prior batches.

4. **ICH Q7 §12.83** — the nearest thing to a requirement that a method change be shown not to invalidate prior results, but framed as equivalence rather than retrospective impact: the modification record must include "appropriate data to verify that the modification produces results that are as accurate and reliable as the established method."

5. **ICH Q10 §3.2.3(d)** — **post-implementation**, forward-looking: "an evaluation of the change should be undertaken to confirm the change objectives were achieved and that there was no deleterious impact on product quality."

6. **PI 041-1 §9.3 Item 5** — cumulative effect of changes on the *system's* data-integrity controls, not on results: "assess whether these changes have had any detrimental effect on data management and integrity controls ... The assessment performed should be documented." This is the **only** clause found that both requires an impact assessment *and* explicitly requires it to be documented.

**Must it be recorded, and by whom approved?** Taking the clauses together:

- *Recorded*: only PI 041-1 §9.3 Item 5 says so in terms ("The assessment performed should be documented"), and it is about system change effects on DI controls, not on results. ICH Q7 §13.11 requires written procedures providing for "identification, **documentation**, appropriate review, and approval of changes", which implies the change itself is documented, but §13.13's impact evaluation is not separately stated to be recorded. ICH Q7 §12.83 does explicitly require records of an analytical method modification including the reason.
- *Approved by whom*: **ICH Q7 §13.12** is the only clause that names approvers — "drafted, reviewed, and approved by the appropriate organisational units, and reviewed and approved by the quality unit(s)". **21 CFR 211.160(a)** gives the binding US equivalent for a specification or test-procedure change: "drafted by the appropriate organizational unit and reviewed and approved by the quality control unit". **ICH Q10** Table III assigns "oversight by the quality unit". Annex 11 §10, PI 041-1 and the FDA Q&A name no approver for a change.

**On the orchestrator's actual design question — must the change request be an entity inside the system?**

**No source examined states a location requirement for the change record.** Searched across all six documents, the term **"change request" appears zero times**; **"change proposal" appears zero times** (ICH Q10 says "proposed changes"; ICH Q7 §13.12 says "proposals for GMP relevant changes"). The only clauses touching on where a change record sits are:

- Annex 11 §4.2: "Validation documentation should include change control records (if applicable)" — places the change record in the *validation* documentation set, i.e. outside the operational system.
- PI 041-1 §9.6: "An audit trail should not be confused with a change control system where changes may needed to appropriately controlled and approved under a PQS" — places the change control system in the *PQS*, and explicitly distinguishes it from the system's own audit trail.
- PI 041-1 §9.3 Item 3: the Validation Summary Report should "state (or provide reference to)" critical system configuration details and change management controls — note "**or provide reference to**", which is the only textual acknowledgement found that a required artefact may live elsewhere and be referenced.

That is the whole of what the sources say on location. They require that the change be controlled, documented, reasoned, impact-evaluated and approved by a quality function. They are silent on whether the artefact carrying those attributes is a row in the system or a document the version points at.

**Binding on Benchline's situation?** None of these bind a single QC laboratory's own unvalidated internal system directly. Annex 11, PI 041-1 and ICH Q7/Q10 bind GMP manufacturing authorisation holders and are inspection instruments; 21 CFR 211.160(a) binds finished-pharmaceutical manufacturers subject to Part 211 and concerns the establishment and change of specifications regardless of medium. If the laboratory is a QC laboratory operating within such a manufacturer's quality system, 211.160(a) and Annex 11 reach the *activity* of changing a limit; they reach the *software* only through whatever validation obligation the lab has deferred.

## What I could not establish

- **GAMP 5 2nd edition content** — paywalled; no text obtained; nothing reported. Its treatment of configuration management and change records remains unknown to this scout.
- **Whether the final revised Annex 11 will retain or alter the draft §6.6 configuration-specification requirement.** The consultation closed 7 October 2025; no final text has been published as of 2026-09-11. Any statement about what the final Annex 11 will say would be speculation.
- **Whether any regulator anywhere requires the change record to be held inside the changed system.** The absence of such a requirement across six primary documents is strong evidence of silence, but silence is not proof of a negative; a source not examined here (e.g. MHRA GXP Data Integrity Guidance, WHO TRS annexes, EU GMP Chapter 4 revision draft, Annex 15) could speak to it. Those were outside the requested scope.
- **The specific case of a "rounding rule" or calculation parameter.** No source examined distinguishes it from any other configuration setting. PI 041-1's "critical data/operating parameters" (§9.5) is the closest category and is not defined further.
- **Whether an analytical *method version* is a "specification" for 211.160(a) purposes.** The regulation's list is "specifications, standards, sampling plans, **test procedures**, or other laboratory control mechanisms", which plainly covers a test procedure; whether a *version increment* of a method constitutes "any change in such ... test procedures" is a reading the regulation does not itself settle, and I am not making a compliance determination on it.

## Negative findings

Terms searched for across the full text of Annex 11 (2011), the Annex 11 draft (2025), PI 041-1, the FDA December 2018 Q&A, ICH Q7 and ICH Q10, with the number of documents in which they appear:

| Term | Documents containing it (of 6) |
|---|---|
| "change request" | **0** |
| "change proposal" | **0** |
| "already reported" | **0** |
| "previously reported" | **0** |
| "already released" | **0** |
| "acceptance limit" | 1 (ICH Q7 §11.42 only, and there it means the limit printed on a Certificate of Analysis — not a change-control context) |
| "revalidation" / "re-validation" | 3 (ICH Q7 ×2, PI 041-1 ×1, Annex 11 draft ×1; **zero** in the in-force Annex 11, **zero** in the FDA Q&A, **zero** in ICH Q10) |

Sources that say nothing on specific points:

- **FDA December 2018 Q&A**: nothing on change control, nothing on recording the reason for a change to a specification or method, nothing on impact of a change on prior results. Its only contact with the subject is an access-restriction recommendation (Q4).
- **In-force Annex 11**: no definition of "configuration" or "configuration data"; no distinction between configuration data and software; no required contents for a change record; no impact assessment requirement; no named approver.
- **PI 041-1**: never uses "acceptance limit"; never treats a specification change as such; presumes a change control system exists under the PQS rather than specifying one.
- **ICH Q10**: no mention of computerised systems, configuration, or records of any specific form in §3.2.3; no revalidation language.
- **All six documents**: none says where a change record must be stored, and none requires it to be an entity within the system whose data is being changed.

## Sources

1. European Commission, EudraLex Volume 4, **Annex 11: Computerised Systems**, status revision 1, deadline for coming into operation 30 June 2011 — https://health.ec.europa.eu/system/files/2016-11/annex11_01-2011_en_0.pdf (confirmed still current via the EudraLex Volume 4 index, which lists "Computerised Systems (revision January 2011)")
2. European Commission, **draft Annex 11: Computerised Systems** — consultation guideline, published 7 July 2025, consultation closed 7 October 2025, **NOT IN FORCE** — https://health.ec.europa.eu/document/download/40231f18-e564-4043-94de-c031f813d38b_en?filename=mp_vol4_chap4_annex11_consultation_guideline_en.pdf
3. PIC/S, **PI 041-1, Good Practices for Data Management and Integrity in Regulated GMP/GDP Environments**, adopted 1 June 2021, entry into force 1 July 2021 — https://picscheme.org/docview/4234
4. FDA, **Data Integrity and Compliance With Drug CGMP: Questions and Answers, Guidance for Industry**, CDER/CBER/CVM, **December 2018** (final) — https://www.fda.gov/media/119267/download
5. ICH, **Q7 Good Manufacturing Practice Guide for Active Pharmaceutical Ingredients**, Current Step 4 version dated 10 November 2000 — https://database.ich.org/sites/default/files/Q7%20Guideline.pdf
6. ICH, **Q10 Pharmaceutical Quality System**, Current Step 4 version dated 4 June 2008 — https://database.ich.org/sites/default/files/Q10%20Guideline.pdf
7. **21 CFR 211.160(a)**, eCFR, Title 21 up to date as of 2026-09-09 (latest amendment 2026-09-08) — https://www.ecfr.gov/current/title-21/part-211/section-211.160
8. ISPE, **GAMP 5 Guide 2nd Edition** product page — https://ispe.org/publications/guidance-documents/gamp-5-guide-2nd-edition — **paywalled, no text obtained, nothing reported from it**
