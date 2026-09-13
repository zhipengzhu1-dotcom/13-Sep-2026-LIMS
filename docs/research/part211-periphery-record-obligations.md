# For each peripheral laboratory programme (reagents, reference standards, calibration, training, stability, retains, sample storage, CoA, in-run QC), where does 21 CFR Part 211 put the record obligation, and does the laboratory's analytical record have to contain or reference it?

**Asked by:** Orchestrator, for the ticket deciding which laboratory workflows Benchline covers, which it holds a seam for, and which stay outside
**Date:** 2026-09-11

**Status of sources:**

- **21 CFR Part 211** — retrieved in full as XML from the eCFR Versioner API (`https://www.ecfr.gov/api/versioner/v1/full/2026-09-09/title-21.xml?part=211`). The API rejected today's date (2026-09-11) as "past the title's most recent issue date of 2026-09-09", so **2026-09-09 is the most recent issue date of Title 21 available** and is the version every quotation below is taken from. 60 sections retrieved (§211.1 through §211.208), across Subparts A–K. Latest source credit appearing anywhere in the part is **89 FR 51770, June 18, 2024** (amending §211.170 and §211.196). Human-readable equivalent: https://www.ecfr.gov/current/title-21/chapter-I/subchapter-A/part-211
- **FDA, *Data Integrity and Compliance With Drug CGMP: Questions and Answers*** — downloaded as PDF from https://www.fda.gov/media/119267/download. Cover page reads **December 2018**. Confirmed current and final against the FDA guidance-search landing page, which labels it **"Final Level 1 Guidance," docket FDA-2018-D-3984, content currency date 12/13/2018**. This is the final document, not the 2016 draft.
- **FDA, *Investigating Out-of-Specification (OOS) Test Results for Pharmaceutical Production*** — downloaded as PDF from https://www.fda.gov/media/158416/download. Cover page reads **May 2022, Revision 1**. Confirmed against the FDA landing page as **"Final Level 2 Revised Guidance," docket FDA-1998-D-0019**. This is the current version, not the October 2006 one.
- **USP General Chapter 〈621〉 Chromatography — PAYWALLED.** `https://doi.usp.org/USPNF/USPNF_M99380_08_01.html` returns HTTP 200 but serves only a preview: the chapter's "INTRODUCTION" paragraph on chromatographic separation, followed by "This is a preview of USP-NF/PF content. Subscriber? Access here!" The system suitability content is behind the subscription wall. Citation given by the page itself: *United States Pharmacopeia (2023). General Chapter, 〈621〉 Chromatography. Rockville, MD. DOI: https://doi.org/10.31003/USPNF_M99380_08_01*. **I did not read 〈621〉's system suitability text and have not paraphrased it from any secondary source.** The only thing reported below about 〈621〉's content is FDA's own characterisation of it, quoted from FDA's guidance, which is a primary source for what *FDA* says 〈621〉 requires.

---

## The structural finding that governs everything below

§211.194 is not one list. It is **five independent obligations**, and only the first is about a test's record:

- **§211.194(a)** — "Laboratory records shall include complete data derived from all tests necessary to assure compliance with established specifications and standards, including examinations and assays, as follows:" then eight enumerated items, (a)(1)–(a)(8). *This* is the per-test analytical record.
- **§211.194(b)** — "Complete records shall be maintained of any modification of an established method employed in testing."
- **§211.194(c)** — "Complete records shall be maintained of any testing and standardization of laboratory reference standards, reagents, and standard solutions."
- **§211.194(d)** — "Complete records shall be maintained of the periodic calibration of laboratory instruments, apparatus, gauges, and recording devices required by § 211.160(b)(4)."
- **§211.194(e)** — "Complete records shall be maintained of all stability testing performed in accordance with § 211.166."

Paragraphs (b) through (e) are **parallel to (a), not subordinate to it.** They say "complete records shall be maintained" — a standing obligation to hold a record of the programme — not "the laboratory record for each test shall include." Nothing in the text of (b)–(e) ties the programme record to any particular test, and nothing in (a)(1)–(a)(8) reaches out to pull (b)–(e) in.

That distinction is the whole answer to question 3 for most of the programmes below, so here is the exhaustive content of **§211.194(a)(1)–(8)**, which is the complete regulatory list of what a test record must contain:

1. "A description of the sample received for testing with identification of source (that is, location from where sample was obtained), quantity, lot number or other distinctive code, date sample was taken, and date sample was received for testing."
2. "A statement of each method used in the testing of the sample. The statement shall indicate the location of data that establish that the methods used in the testing of the sample meet proper standards of accuracy and reliability as applied to the product tested. (If the method employed is in the current revision of the United States Pharmacopeia, National Formulary, AOAC INTERNATIONAL, Book of Methods, or in other recognized standard references, or is detailed in an approved new drug application and the referenced method is not modified, a statement indicating the method and reference will suffice). The suitability of all testing methods used shall be verified under actual conditions of use."
3. "A statement of the weight or measure of sample used for each test, where appropriate."
4. "A complete record of all data secured in the course of each test, including all graphs, charts, and spectra from laboratory instrumentation, properly identified to show the specific component, drug product container, closure, in-process material, or drug product, and lot tested."
5. "A record of all calculations performed in connection with the test, including units of measure, conversion factors, and equivalency factors."
6. "A statement of the results of tests and how the results compare with established standards of identity, strength, quality, and purity for the component, drug product container, closure, in-process material, or drug product tested."
7. "The initials or signature of the person who performs each test and the date(s) the tests were performed."
8. "The initials or signature of a second person showing that the original records have been reviewed for accuracy, completeness, and compliance with established standards."

Note what item (4) identifies: the data must be "properly identified to show the specific component … and lot tested." The identification demanded is **of the material under test**, not of the instrument, the standard, or the reagent.

Note also §211.194(a)(2)'s pointer construction: for methods, the record need only "indicate the **location** of data" establishing accuracy and reliability — a reference to where the validation record lives, not a copy of it. **This is the only place in §211.194(a) where the regulation itself uses a pointer/reference mechanism**, and it is used for methods, not for any of the peripheral programmes.

---

## Findings by programme

### 1. Reagents, solutions and standard solutions — preparation, standardisation, expiry

**Which section imposes the obligation.** §211.194(c): "Complete records shall be maintained of any testing and standardization of laboratory reference standards, **reagents, and standard solutions**." That is the entire Part 211 treatment of reagents as a record obligation.

**Whose record it is.** A standing laboratory-controls record, not the test record. §211.194(c) is a parallel paragraph to (a) (see structural finding above). §211.160(a) supplies the surrounding obligation that "other laboratory control mechanisms" be drafted by the appropriate organizational unit and reviewed and approved by the quality control unit, and that "The requirements in this subpart shall be followed and shall be documented at the time of performance." §211.160(b) lists what laboratory controls "shall include" — four items, (b)(1) component/container/closure lot conformity, (b)(2) in-process conformance, (b)(3) drug product sampling/specifications, (b)(4) calibration. **Reagents are not among §211.160(b)'s four enumerated items.**

**Does §211.194 require the test record to contain or reference it?** **No.** Neither §211.194(a)(1)–(8) nor any other paragraph requires the record of a given test to cite the reagent lot used, the reagent's standardisation record, or its date of preparation. I established this by reading (a)(1)–(8) in full (above) and by a term-occurrence check across all 60 sections of the part: "reagent" appears in exactly **two** sections — §211.194 (paragraph (c) only) and §211.170 (where it appears only inside the phrase "nonradioactive reagent kits," describing a class of drug product, not a laboratory reagent).

**Scope check — the word "expiry."** "expiry" occurs **zero** times in Part 211. "Expiration" occurs in five sections (§§211.137, 211.166, 211.170, 211.180, 211.198) and in every instance refers to the **drug product's or active ingredient's** expiration date, never to a reagent's. **Part 211 imposes no reagent expiry requirement and no reagent expiry record.** Reagent expiry dating is industry convention, not a Part 211 requirement — flagging this explicitly because it is the single most commonly assumed-mandatory practice in this list.

**Obligated party.** §211.194(c) is written in the passive voice with no named actor: "Complete records shall be maintained." §211.160(a) does name actors, but for the establishment and approval of control mechanisms ("drafted by the appropriate organizational unit and reviewed and approved by the quality control unit"), not for reagent record-keeping.

**Corroborating guidance (does not change the regulation).** FDA's OOS guidance (May 2022, p.4, Phase I supervisor step 5) says the investigation should "Determine that appropriate reference standards, solvents, reagents, and other solutions were used and that they met quality control specifications." This tells you the reagent record must be *retrievable and linkable to a test when an investigation demands it* — but it is a guidance expectation attached to an investigation, not a Part 211 requirement that the routine test record carry the reagent identity.

---

### 2. Reference standards — identity, lot, qualification, expiry/re-test

**Which section.** The same one sentence: §211.194(c), "Complete records shall be maintained of any testing and standardization of laboratory **reference standards**, reagents, and standard solutions."

**Term-occurrence check.** The phrase "reference standard" occurs in **exactly one** section of Part 211: §211.194, in paragraph (c). Nowhere else in the part.

**Whose record it is.** A standing laboratory record under §211.194(c), sitting alongside §211.160's laboratory-controls framework. It is not part of the test record.

**Does §211.194 require the test record to cite the reference standard lot?** **No.** There is no requirement anywhere in Part 211 that the analytical record of a test identify which reference standard lot was used. §211.194(a)(4) requires data to be "properly identified to show the specific component … and lot tested" — that is the lot of the *material under test*, not the standard. Recording the reference standard lot number on a test worksheet is **industry convention**, not a Part 211 requirement. (Flagged: this is the second place where the temptation to state convention as requirement is strongest.)

**Qualification and expiry/re-test.** Part 211 says nothing about reference standard qualification, characterisation, expiry dating, or re-test intervals. §211.194(c) speaks only of "testing and standardization." The word "qualification" in the sense of material qualification does not appear in this context anywhere in the part; "qualif-" appears only in §211.25 and §211.34, both about *people*. §211.87 ("Retesting of approved components, drug product containers, and closures") imposes retesting, but its subject is components/containers/closures used in manufacture, not laboratory reference standards. **A reference-standard expiry/re-test programme is an absence in Part 211.**

**FDA guidance touchpoints (not Part 211 obligations).** The DI guidance (Dec 2018, Q13) says that if an actual sample is used for system suitability, "it should be a properly characterized secondary standard" (citing §§211.160, 211.165, 212.60) — "should," in a nonbinding guidance, and conditional on a specific practice. The OOS guidance (May 2022, p.3) notes that "in chromatographic systems, reference standard solutions may be injected at intervals throughout chromatographic runs to measure drift, noise, and repeatability" — descriptive of practice, not a mandate.

**Obligated party.** None named; passive voice.

---

### 3. Equipment calibration and maintenance

**Which sections.** Three, and they say different things:

- **§211.68(a)**: "Automatic, mechanical, or electronic equipment or other types of equipment, including computers, or related systems that will perform a function satisfactorily, may be used in the manufacture, processing, packing, and holding of a drug product. If such equipment is so used, it shall be routinely calibrated, inspected, or checked according to a written program designed to assure proper performance. **Written records of those calibration checks and inspections shall be maintained.**"
- **§211.160(b)(4)**: laboratory controls shall include "The calibration of instruments, apparatus, gauges, and recording devices at suitable intervals in accordance with an established written program containing specific directions, schedules, limits for accuracy and precision, and provisions for remedial action in the event accuracy and/or precision limits are not met. **Instruments, apparatus, gauges, and recording devices not meeting established specifications shall not be used.**"
- **§211.194(d)**: "Complete records shall be maintained of the **periodic** calibration of laboratory instruments, apparatus, gauges, and recording devices required by § 211.160(b)(4)."

**Whose record it is.** A standing equipment/calibration programme record, explicitly cross-referenced: §211.194(d) points *out* to §211.160(b)(4). The direction of the cross-reference matters — §211.194(d) defines a record *of the calibration programme*, defined by reference to §211.160(b)(4)'s scheduling obligation. It does not point into any individual test.

**Does the test record have to say which instrument was used?** **No — and this is the most counter-intuitive finding in this document.** §211.194(a)(1)–(8) contains no requirement to identify the instrument. The word "instrument" occurs in only two sections of Part 211: §211.160 (in (b)(4), about the calibration programme) and §211.194 (in (a)(4)'s phrase "graphs, charts, and spectra from laboratory **instrumentation**" — which requires the *output* to be captured and identified to the material tested, not the instrument to be named; and in (d), the calibration records paragraph).

Contrast this sharply with the **batch production record**, where the regulation *does* demand equipment identity:

- **§211.188(b)(2)**: batch production and control records shall include documentation of "**Identity of individual major equipment and lines used**."
- **§211.105(b)**: "Major equipment shall be identified by a distinctive identification number or code that **shall be recorded in the batch production record** to show the specific equipment used in the manufacture of each batch of a drug product."

So Part 211 knows exactly how to write "record which equipment was used, by unique identifier, in the record for this unit of work" — and it wrote it for **production**, in §211.105(b) and §211.188(b)(2), and **did not write it for the laboratory test record** in §211.194(a). That asymmetry is in the regulation's own drafting and is not ambiguous. **Recording the instrument ID on an analytical test record is industry convention (and a data-integrity expectation, see below), not a §211.194 requirement.**

**Does the test record have to say the instrument was calibrated?** **No.** No provision requires a per-test calibration attestation. §211.160(b)(4)'s operative rule is a *prohibition on use* ("shall not be used"), enforced against the calibration programme, not a record entry in the test.

**Maintenance.** "Maintenance" occurs in §§211.42, 211.58, 211.63, 211.67, 211.182 — all in Subparts C (Buildings and Facilities) and D (Equipment), and §211.182 (Records). **§211.67** requires written cleaning/maintenance procedures and, at (c), "Records shall be kept of maintenance, cleaning, sanitizing, and inspection as specified in §§ 211.180 and 211.182." **§211.182** (Equipment cleaning and use log) requires an equipment log showing "the date, time, product, and lot number of each batch processed," dated and signed by the persons performing and double-checking. Note §211.182 records the *batch* in the *equipment* log — the reverse direction from a test record referencing equipment. §211.194 contains **no** maintenance obligation at all; laboratory instrument maintenance is not addressed by the laboratory-records section.

**FDA DI guidance on instrument ID (guidance, not regulation).** The Dec 2018 DI guidance, answering "What is 'metadata'?", says: "metadata for a particular piece of data could include a date/time stamp documenting when the data were acquired, a user ID of the person who conducted the test or analysis that generated the data, **the instrument ID used to acquire the data**, material status data, the material identification number, and audit trails," and then: "Data should be maintained throughout the record's retention period with all associated metadata required to reconstruct the CGMP activity (e.g., §§ 211.188 and 211.194)." This is the closest thing to an instrument-ID-in-the-test-record expectation that exists in the sources, and its precise status should be stated carefully: it is a **nonbinding guidance** ("Contains Nonbinding Recommendations" is printed on every page), the instrument ID is offered as one item in an open-ended example list ("could include"), and the binding hook it cites is §211.194 generally, not any enumerated item of §211.194(a).

**Obligated party.** §211.68(a) and §211.194(d) are passive with no named party. §211.67(b)(1) does require, inside the written procedure, "Assignment of responsibility for cleaning and maintaining equipment" — i.e. the regulation requires the firm to name a responsible party in its own procedure, without naming one itself.

---

### 4. Analyst training, qualification and competence

**Which section.** §211.25(a): "Each person engaged in the manufacture, processing, packing, or holding of a drug product shall have education, training, and experience, or any combination thereof, to enable that person to perform the assigned functions. **Training shall be in the particular operations that the employee performs** and in current good manufacturing practice … Training in current good manufacturing practice shall be conducted by qualified individuals on a continuing basis and with sufficient frequency to assure that employees remain familiar with CGMP requirements applicable to them." §211.25(b) imposes the analogous obligation on supervisors; §211.25(c) requires "an adequate number of qualified personnel."

**Whose record it is.** §211.25 is in Subpart B (Organization and Personnel). **Notably, §211.25 does not itself require a training record at all** — it requires that people *be* trained and qualified, with no documentation clause. Compare §211.34 (Consultants), which *does* have one: "Records shall be maintained stating the name, address, and qualifications of any consultants and the type of service they provide." The drafters put a records clause in §211.34 and not in §211.25. (A training record is of course required in practice via §211.180(c)/inspection and is universal industry convention — flagging that as convention, since the section text does not demand it.)

**Is there any requirement tying a specific analyst's qualification to a specific method or test?** **No.** §211.25(a)'s "Training shall be in the particular operations that the employee performs" is the closest text, and it is an obligation about the *content of the training programme* — training must be operation-specific — not an obligation to demonstrate, per test, that this analyst was qualified for this method. Nothing in §211.194(a) requires the test record to reference the performing analyst's qualification status. §211.194(a)(7) requires only "The initials or signature of the person who performs each test and the date(s) the tests were performed" — identity and date, not competence.

**Term-occurrence check.** The word **"analyst" occurs zero times in Part 211.** It is FDA-guidance vocabulary (the OOS guidance uses it heavily, e.g. "A. Responsibility of the Analyst," p.3), not regulatory vocabulary. "Training" occurs in only two sections: §211.25 and §211.34. "Competen-" occurs once, in §211.28(d), in the unrelated phrase "competent medical personnel" about illness exclusion. **"Proficiency" occurs zero times.**

**Guidance touchpoints.** The OOS guidance (May 2022) does make two per-test-ish statements, both hedged: "It is often important for the predefined retesting plan to include retests performed by an analyst other than the one who performed the original test," and "A second analyst performing a retest should be at least as experienced and qualified in the method as the original analyst" (p.7 area, lines around the retesting discussion). The DI guidance Q16 confirms data-integrity training is "consistent with the personnel requirements under §§ 211.25 and 212.10." Neither creates a per-test qualification record obligation.

**Obligated party.** §211.25 places the obligation on "Each person" (to have the training) and, at (b), on "Each person responsible for supervising." It does not name who must *deliver* or *record* training, except that CGMP training "shall be conducted by qualified individuals."

---

### 5. Stability testing

**Is it a distinct programme with its own record?** **Yes, explicitly.** §211.166(a): "There shall be **a written testing program** designed to assess the stability characteristics of drug products. The results of such stability testing shall be used in determining appropriate storage conditions and expiration dates. The written program shall be followed and shall include: (1) Sample size and test intervals based on statistical criteria for each attribute examined to assure valid estimates of stability; (2) Storage conditions for samples retained for testing; (3) Reliable, meaningful, and specific test methods; (4) Testing of the drug product in the same container-closure system as that in which the drug product is marketed; (5) Testing of drug products for reconstitution at the time of dispensing (as directed in the labeling) as well as after they are reconstituted." §211.166(b) adds: "An adequate number of batches of each drug product shall be tested to determine an appropriate expiration date and **a record of such data shall be maintained**."

**Whose record it is.** Its own. §211.194(e) creates a dedicated, separate record obligation: "Complete records shall be maintained of all stability testing performed in accordance with § 211.166." This is the only one of the peripheral programmes to which §211.194 gives its own dedicated paragraph *and* an explicit cross-reference to a substantive programme section.

**Does it flow through the same test-record requirements?** This is the one place the sources genuinely under-determine the answer, so state it carefully. §211.194(a)'s scope clause is broad on its face — "complete data derived from **all tests** necessary to assure compliance with established specifications and standards, including examinations and assays." A stability test is a test against specifications, so on the plain text of (a) its individual test records fall within (a)(1)–(8). But §211.194(e) then adds a *separate* obligation for the stability programme as a whole. The regulation does not say whether (e) is (i) merely a retention clause on top of (a), or (ii) a distinct programme-level record obligation running in parallel. **The text does not resolve it**, and I am not going to invent a resolution. What is certain: both obligations exist, and §211.166(a)(2) uniquely requires the *programme* to specify "Storage conditions for samples retained for testing" — the one storage-condition requirement in Part 211 that attaches to laboratory samples (see programme 7).

**Cross-link to retains.** §211.170(b) sends one result back into the stability record: reserve samples "shall be examined visually at least once a year for evidence of deterioration… The results of the examination shall be recorded and **maintained with other stability data on the drug product**."

**Obligated party.** Passive throughout; no party named in §211.166 or §211.194(e).

---

### 6. Reserve samples / retains (§211.170)

**Confirming the refutation you asked for: §211.170 names no obligated party.** Every operative clause is passive with no actor:

- §211.170(a): "An appropriately identified reserve sample that is representative of each lot in each shipment of each active ingredient **shall be retained**." (No "the manufacturer shall retain," no "the quality control unit shall retain.")
- §211.170(b): "An appropriately identified reserve sample that is representative of each lot or batch of drug product **shall be retained and stored** under conditions consistent with product labeling."

I checked the full current text of §211.170 (both paragraphs and all retention-period sub-paragraphs) for any named actor. There is none — no "manufacturer," no "contract laboratory," no "quality control unit," anywhere in the section. **The absence is confirmed.** The section also never uses the word "laboratory."

Two further points bearing on where the obligation sits:

- §211.170's *placement* is in **Subpart I — Laboratory Controls**, alongside §§211.160, 211.165, 211.166, 211.167, 211.173. Placement is suggestive of context but assigns no party.
- The only actor-bearing text adjacent to retains is elsewhere: **§211.84(b)** says the amount of material to be taken shall be based on criteria including "the quantity needed for analysis and **reserve where required by § 211.170**," and §211.84(a) does name the quality control unit — but for release, not for retention. **§211.22(a)** puts on the quality control unit the responsibility for "approving or rejecting drug products manufactured, processed, packed, or held **under contract by another company**," which is the general hook for contract-lab oversight, but §211.22 says nothing about reserve samples.

**Substantive requirements §211.170 does impose** (all passive): the sample must be "appropriately identified" and "representative"; quantity "at least twice the quantity necessary for all tests required to determine whether the active ingredient meets its established specifications, except for sterility and pyrogen testing" (a) / "at least twice the quantity necessary to perform all the required tests, except those for sterility and pyrogens" (b); drug-product retains stored "under conditions consistent with product labeling" and "in the same immediate container-closure system in which the drug product is marketed or in one that has essentially the same characteristics"; annual visual examination of statistically selected retains "unless visual examination would affect the integrity of the reserve sample," with deterioration "investigated in accordance with § 211.192" and results "recorded and maintained with other stability data"; and retention periods keyed to the drug product's expiration date (1 year after, with radiopharmaceutical and undated-OTC variants).

**Currency note:** §211.170 carries a **June 18, 2024 (89 FR 51770)** amendment in its source credit, so this is recently-touched text, not a 1978 fossil.

**Does §211.194 require the test record to reference the retain?** No. "Reserve sample" occurs in exactly one section of Part 211 — §211.170. §211.194(a) does not mention retains.

---

### 7. Sample handling and storage conditions for a received laboratory sample

**The finding is an absence, with one narrow exception.**

I ran a full-part occurrence check on "storage" and read every hit in context. "Storage" appears in 13 sections: §§211.42, 211.80, 211.82, 211.87, 211.94, 211.105, 211.110, 211.122, 211.137, 211.142, 211.166, 211.204, 211.208. Every one of them is about **something other than a laboratory test sample**:

- §211.42(c), §211.80(a), §211.82, §211.122 — storage of components, drug product containers, closures, labeling and packaging materials (receipt/quarantine/release areas).
- §211.87, §211.110 — conditions that might degrade a *component* or in-process material "after storage for long periods."
- §211.94 — container closure systems protecting the *product*.
- §211.105(a) — compounding and storage *containers* in production.
- §211.137, §211.142, §211.204, §211.208 — expiration dating, warehousing of finished drug products ("Storage of drug products under appropriate conditions of temperature, humidity, and light"), returned and salvaged drug products.

**The single exception is §211.166(a)(2)**: the written stability programme "shall include … (2) **Storage conditions for samples retained for testing**." This is the only place in Part 211 that imposes a storage-condition obligation on samples held for laboratory testing — and it lives inside the *stability programme*, applying to stability samples, not to routine QC samples received for release testing. (§211.170(b) also imposes storage conditions, but on reserve samples, which are retained rather than tested.)

**Conclusion: Part 211 imposes no obligation on how a routine laboratory sample is stored between receipt and analysis, and no obligation to record its storage conditions.** §211.194(a)(1) requires the test record to capture the sample's source, quantity, lot/code, "date sample was taken, and date sample was received for testing" — dates of taking and receipt, and nothing about what happened to the sample in between.

**Two further confirmed absences, consistent with prior map findings:**
- **"chain of custody" — zero occurrences in Part 211.**
- **"holding time" — zero occurrences in Part 211.** (Also "traceab-": zero occurrences.)

I established each of these by searching the extracted text of all 60 sections case-insensitively.

**Obligated party.** §211.166 names none. §211.42(c) frames its storage requirement as an obligation on the firm's areas and control systems; §211.42(c)(1) mentions "the quality control unit" only as the body whose sampling/testing the material awaits, and §211.42(c)(9) lists "Control and laboratory operations" as an area requiring definition — a facilities obligation, not a sample-handling record obligation.

---

### 8. Certificate of Analysis / report issuance, and amendment or reissue

**Does Part 211 require a Certificate of Analysis?** **No. "Certificate of analysis" occurs zero times in Part 211.** The word "certificate" occurs in exactly one section, §211.84, and there it appears in the *receiving* direction, as something a manufacturer may **accept in lieu of its own testing**:

- §211.84(d)(2): "In lieu of such testing by the manufacturer, **a report of analysis may be accepted from the supplier of a component**, provided that at least one specific identity test is conducted on such component by the manufacturer, and provided that the manufacturer establishes the reliability of the supplier's analyses through appropriate validation of the supplier's test results at appropriate intervals."
- §211.84(d)(3): "In lieu of such testing by the manufacturer, **a certificate of testing may be accepted from the supplier**, provided that at least a visual identification is conducted on such containers/closures by the manufacturer and provided that the manufacturer establishes the reliability of the supplier's test results…"

So Part 211's only treatment of supplier documentation is a **permission to rely on it, conditioned on independent verification** — an obligation that falls on the *receiving manufacturer*, and specifically names the manufacturer as the obligated party in both clauses. Part 211 nowhere obliges any party to *issue* a CoA. It does not use the phrase "report of analysis" outside §211.84(d)(2). **A laboratory issuing a CoA to a client is industry and commercial practice, not a Part 211 requirement** — flagging this as the third and largest convention-vs-requirement gap in this document.

**What must an analytical report contain?** Part 211 specifies contents for the **laboratory record** (§211.194(a)(1)–(8), quoted in full above), not for any outward-facing report. There is no section specifying the contents of a certificate, report of analysis, or test report. §211.196 (Distribution records) specifies contents but for distribution, not analysis.

**Is there any requirement about amending or reissuing a previously issued report?** **No — and the absence is total.** I checked: "reissue" occurs **zero** times in Part 211. Every occurrence of "amend" in the part (24 sections) is inside a Federal Register source-credit line ("as amended at 73 FR 51932, Sept. 8, 2008") — I verified this by extracting the surrounding context of all matches and confirming none is in operative regulatory text. "Revis-" occurs once, in §211.194(a)(2)'s "current revision of the United States Pharmacopeia." **Part 211 contains no provision governing the amendment, correction, supersession or reissue of an issued analytical report.**

The nearest adjacent obligations, none of which is about report reissue:
- §211.192 requires that "Any unexplained discrepancy … or the failure of a batch or any of its components to meet any of its specifications shall be thoroughly investigated, **whether or not the batch has already been distributed**," extending to other batches, with "A written record of the investigation… including the conclusions and followup." This is the mechanism Part 211 provides for a post-hoc problem — an *investigation*, not a corrected certificate.
- §211.180(f) requires notification procedures so that responsible officials are informed in writing of investigations under §§211.198, 211.204, 211.208, recalls, FDA inspectional observations, or regulatory actions.
- The OOS guidance (May 2022) bears on what gets reported: "All test results, both passing and suspect, should be reported and considered in batch release decisions," and on invalidation, "all original data must be retained (§ 211.180) and an explanation should be recorded."

**Obligated party.** §211.84(d)(2) and (d)(3) both explicitly name **the manufacturer** ("testing by the manufacturer," "conducted on such component by the manufacturer," "the manufacturer establishes the reliability of the supplier's analyses"). §211.84(a) names **the quality control unit** as the body that releases. §211.22(a) names the quality control unit as responsible for "approving or rejecting drug products manufactured, processed, packed, or held under contract by another company," and §211.22(b) requires that "Adequate laboratory facilities for the testing and approval (or rejection)… shall be available to the quality control unit." This is the only contract-lab-shaped hook in Part 211, and it points the obligation at the *manufacturer's* QC unit, not at the contract laboratory.

---

### 9. Analytical quality control within a run — system suitability, blanks, controls

**Does Part 211 require these to be part of the test record?**

**"System suitability" occurs zero times in Part 211. "Blank" occurs zero times. "Control sample" occurs zero times.** These are not regulatory terms. Established by case-insensitive search across all 60 sections.

What Part 211 actually provides:

- **§211.160(a)**: the framework obligation. "The establishment of any specifications, standards, sampling plans, test procedures, or **other laboratory control mechanisms** required by this subpart, including any change in such… shall be drafted by the appropriate organizational unit and reviewed and approved by the quality control unit. **The requirements in this subpart shall be followed and shall be documented at the time of performance. Any deviation from the written specifications, standards, sampling plans, test procedures, or other laboratory control mechanisms shall be recorded and justified.**" If the firm's own written test procedure specifies a system suitability criterion, this is the clause that makes following it and documenting it at the time of performance mandatory, and makes any deviation a recorded, justified event — but the obligation derives from the firm's procedure, not from a named regulatory requirement for system suitability.
- **§211.160(b)**: "Laboratory controls shall include the establishment of scientifically sound and appropriate specifications, standards, sampling plans, and test procedures…" followed by four enumerated items, none of which is in-run QC.
- **§211.165(e)**: "The accuracy, sensitivity, specificity, and reproducibility of test methods employed by the firm shall be established and documented. Such validation and documentation may be accomplished in accordance with § 211.194(a)(2)." Note this is **method validation**, a one-time-plus-maintenance characterisation of the method, not per-run QC, and the record mechanism it points to is §211.194(a)(2)'s *location-of-data pointer*.
- **§211.194(a)(2)** final sentence: "**The suitability of all testing methods used shall be verified under actual conditions of use.**" This is the sentence in the regulation closest to a per-use verification requirement. But read carefully: the subject is "the suitability of all testing **methods**," and the obligation is method verification under actual conditions of use (the verification-of-compendial-methods obligation), not per-run instrument system suitability. It does not enumerate injections, blanks or controls, and it does not say the result of that verification goes in each test's record.
- **§211.194(a)(4)** does the rest of the work by breadth: "A complete record of **all data** secured in the course of each test, including all graphs, charts, and spectra from laboratory instrumentation." Once a system suitability injection or a blank has been run as part of a test, its chromatogram is "data secured in the course of" that test and falls within (a)(4). **This is the actual regulatory basis for in-run QC data living in the test record — a generic completeness requirement, not a named requirement for system suitability.**

**FDA's own statements (primary for what FDA says, not a substitute for USP).** DI guidance Dec 2018, Q13: "According to the United States Pharmacopeia (USP), system suitability tests **must include replicate injections of a standard preparation or other standard solutions to determine if requirements for precision are satisfied** (see USP General Chapter <621> Chromatography). System suitability tests should be performed according to the firm's established written procedures—which should include the identity of the preparation to be injected and the rationale for its selection—and the approved application or applicable compendial monograph (§§ 211.160 and 212.60)." Same answer: "FDA considers it a violative practice to use an actual sample in test, prep, or equilibration runs as a means of disguising testing into compliance," and "**All data—including obvious errors and failing, passing, and suspect data—must be in the CGMP records that are retained and subject to review and oversight**," citing §§211.68(b), 211.188, 211.194, 211.186(a), 211.192, 211.194(a)(8). Q14 adds, on reprocessed chromatography: "**each result retained for review** (see §§ 211.160, 211.165(c), 211.194(a)(4), and 212.60(a))."

Note what FDA has done here: it grounded the *content* of system suitability in USP 〈621〉 and §211.160 (i.e. in the firm's own procedure and the compendium), and grounded the *retention and completeness* of the resulting data in §211.194(a)(4). That is the same split the regulation's text implies.

**OOS guidance (May 2022, p.3)** on in-run standards: "Certain analytical methods have system suitability requirements, and systems not meeting these requirements should not be used. For example, in chromatographic systems, reference standard solutions may be injected at intervals throughout chromatographic runs to measure drift, noise, and repeatability. If reference standard responses indicate that the system is not functioning properly, all of the data collected during the suspect time period should be properly identified and should not be used." Note "Certain analytical methods have system suitability requirements" — FDA describes it as a property of the method, not a universal rule.

**USP 〈621〉 itself: paywalled.** See "Status of sources" above. The publicly reachable portion is the introduction on chromatographic separation principles only. I have not read and am not paraphrasing 〈621〉's system suitability requirements; the only characterisation of them above is FDA's, quoted verbatim from FDA's guidance.

**Obligated party.** §211.160(a) names two: "drafted by the appropriate organizational unit and reviewed and approved by the **quality control unit**." §211.194(a)(4) is passive. §211.194(a)(7) and (a)(8) name roles without titles — "the person who performs each test" and "a second person" reviewing.

---

## Cross-cutting: where Part 211 does and does not use a reference/pointer mechanism

Because the ticket turns on "seam vs contained," it is worth isolating every place Part 211 itself permits or requires one record to *point at* another rather than contain it:

| Provision | Pointer mechanism in the regulation's own text |
|---|---|
| §211.194(a)(2) | The test record "shall indicate the **location** of data that establish that the methods… meet proper standards of accuracy and reliability." For compendial methods, "a statement indicating the method and reference will suffice." |
| §211.194(d) | Calibration records are defined by reference out to "§ 211.160(b)(4)" — the programme, not the test. |
| §211.194(e) | Stability records defined by reference out to "§ 211.166." |
| §211.165(e) | Method validation documentation "may be accomplished in accordance with § 211.194(a)(2)" — i.e. via the location-pointer. |
| §211.170(b) | Reserve-sample examination results "shall be recorded and maintained **with other stability data** on the drug product" — a record filed *into* another programme's record. |
| §211.182 | Equipment log records "the date, time, product, and lot number of each batch processed" — the equipment record points at the batch, not the batch at the equipment. |
| §211.105(b) | Equipment ID "shall be recorded in the **batch production record**" — the only mandated equipment-identity-inside-a-work-record in the part, and it is production, not laboratory. |
| §211.198(b)(2) | Complaint record "shall include the findings of the investigation and followup"; the investigation record itself may be "maintained at the establishment where the investigation occurred in accordance with § 211.180(c)." |
| §211.180(c) | Records "readily available for authorized inspection… at the establishment where the activities described in such records occurred," with an explicit allowance: "Records that can be immediately retrieved from another location by computer or other electronic means shall be considered as meeting the requirements of this paragraph." |

---

## What I could not establish

1. **Whether §211.194(e) is a retention clause on top of §211.194(a), or a parallel programme-level obligation that displaces (a) for stability testing.** The text supports either reading and offers no interpretive aid. Neither FDA guidance I read addresses the relationship between (a) and (e).

2. **What USP 〈621〉 actually requires for system suitability.** Paywalled (preview only at `https://doi.usp.org/USPNF/USPNF_M99380_08_01.html`; DOI 10.31003/USPNF_M99380_08_01; USP-NF 2023). I report the paywall as the finding and did not source it secondarily. FDA's characterisation is quoted above and is attributable to FDA, not to USP.

3. **Whether a contract laboratory, as distinct from the manufacturer, bears any Part 211 obligation directly.** Part 211's obligations are overwhelmingly passive-voice, and its two contract-related hooks (§211.22(a) "manufactured, processed, packed, or held under contract by another company"; §211.84(d)(2)–(3) supplier reports) both point the duty at the manufacturer's quality control unit. Part 211 does not state whether a contract laboratory is itself a regulated party under this part, and §211.1 (Scope) defines scope by *activity* ("preparation of drug products… for administration to humans or animals") rather than by *party*. The OOS guidance (May 2022) speaks to contract-lab workflow — "the laboratory should convey its data, findings, and supporting documentation to the manufacturing firm's quality unit (QU)" — but that is guidance describing a handoff, not a regulatory assignment of the underlying record obligation. **I could not establish from Part 211 alone who owns any of these records when the testing is contracted out.**

4. **Whether any Part 211 obligation attaches to a laboratory sample between receipt and analysis.** I established the *absence* of any explicit provision (term-occurrence check on "storage," "chain of custody," "holding time," "traceab-", all reported above). What I could not establish is whether FDA reads a general obligation into §211.160(b)'s "scientifically sound and appropriate… test procedures" or §211.100(b)-style "documented at the time of performance" duties. Neither guidance document addresses routine sample storage. The absence in the regulation's text is solid; the question of whether FDA enforces an implied duty is outside what these three sources settle.

5. **Reagent and reference-standard expiry.** I established that Part 211 contains no such requirement. I could not establish from these sources whether an expiry obligation arrives from elsewhere (a USP general chapter, ICH, or a compendial monograph) — USP is paywalled and ICH was outside the scope of this question.

---

## Sources

1. **21 CFR Part 211**, Current Good Manufacturing Practice for Finished Pharmaceuticals. Full XML retrieved from the eCFR Versioner API at issue date **2026-09-09** (the most recent issue date available for Title 21; the API explicitly rejected 2026-09-11 as later than the title's most recent issue). `https://www.ecfr.gov/api/versioner/v1/full/2026-09-09/title-21.xml?part=211`. Human-readable: `https://www.ecfr.gov/current/title-21/chapter-I/subchapter-A/part-211`. 60 sections, Subparts A–K. Latest amendment appearing in any source credit: 89 FR 51770, June 18, 2024.
2. **FDA, *Data Integrity and Compliance With Drug CGMP: Questions and Answers, Guidance for Industry*, December 2018.** CDER/CBER/CVM. PDF: `https://www.fda.gov/media/119267/download`. Confirmed as **Final Level 1 Guidance**, docket **FDA-2018-D-3984**, content currency 12/13/2018, via the FDA guidance-search landing page. Marked "Contains Nonbinding Recommendations" on every page.
3. **FDA, *Investigating Out-of-Specification (OOS) Test Results for Pharmaceutical Production*, May 2022, Revision 1.** CDER. PDF: `https://www.fda.gov/media/158416/download`. Confirmed as **Final Level 2 Revised Guidance**, docket **FDA-1998-D-0019**, via the FDA guidance-search landing page (the older URL slug 301-redirects to the Level 2 revision page). Not the October 2006 version. Marked "Contains Nonbinding Recommendations."
4. **USP General Chapter 〈621〉 Chromatography — NOT READ, PAYWALLED.** `https://doi.usp.org/USPNF/USPNF_M99380_08_01.html` (HTTP 200, preview only). Publisher citation as given on the page: United States Pharmacopeia (2023), General Chapter 〈621〉 Chromatography, Rockville, MD, DOI `https://doi.org/10.31003/USPNF_M99380_08_01`. Reported as a paywall, not summarised.
