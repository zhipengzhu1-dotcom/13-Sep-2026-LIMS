# What do 21 CFR Part 211, ISO/IEC 17025:2017, and USP <11> actually require for reagent/standard/column identity, lot, and expiry records?

**Asked by:** orchestrator (map scout dispatch, no ticket number given)
**Date:** 2026-09-11
**Status of sources:**
- 21 CFR Part 211: fetched the full current text of the part directly from eCFR's versioner API (`https://www.ecfr.gov/api/versioner/v1/full/2026-09-01/title-21.xml?part=211`), which serves the same current, official text as the public eCFR site. Confirmed no amendments pending affect §§211.137, 211.160, 211.165–211.194 beyond what's shown (amendment dates through 89 FR 51770, June 18, 2024, are included in the fetched text).
- ISO/IEC 17025:2017: full standard text is paywalled (iso.org). Used a EUROLAB (European Federation of National Associations of Measurement, Testing and Analytical Laboratories) implementation handbook, "Handbook ISO/IEC 17025:2017," hosted publicly by APHL (Association of Public Health Laboratories) — a clause-by-clause change/cross-reference guide against the withdrawn 2005 edition, not the standard's verbatim text. Treat clause paraphrases below as a secondary summary of primary clause numbering and intent, not a quotation of ISO's copyrighted text.
- USP <11>: USP's own site (usp.org) pages for Reference Standards FAQ and the "QA Policy Statement: USP RS Certificates and Assigned Values" did not return readable content to automated fetch (FAQ page appears JavaScript-rendered; the policy-statement PDF link returned a stub/error, not the document). Findings for USP are therefore drawn from a web search summary of USP's own published FAQ content (title: "Reference Standards FAQs | USP", usp.org) rather than a direct fetch of USP's page text — flagged as lower-confidence than the eCFR quotes below, and I could not independently verify the exact wording.

## A. 21 CFR Part 211

### A1. §211.160 — General requirements
Exact text (eCFR, current, part 211, as amended through 73 FR 51932, Sept. 8, 2008):

> (a) The establishment of any specifications, standards, sampling plans, test procedures, or other laboratory control mechanisms required by this subpart, including any change in such specifications, standards, sampling plans, test procedures, or other laboratory control mechanisms, shall be drafted by the appropriate organizational unit and reviewed and approved by the quality control unit. ... Any deviation from the written specifications, standards, sampling plans, test procedures, or other laboratory control mechanisms shall be recorded and justified.
>
> (b) Laboratory controls shall include the establishment of scientifically sound and appropriate specifications, standards, sampling plans, and test procedures designed to assure that components, drug product containers, closures, in-process materials, labeling, and drug products conform to appropriate standards of identity, strength, quality, and purity. Laboratory controls shall include:
> (1) Determination of conformity to applicable written specifications for the acceptance of each lot within each shipment of components, drug product containers, closures, and labeling ... Samples shall be representative and adequately identified. ...
> (2) Determination of conformance to written specifications ... for in-process materials. Such samples shall be representative and properly identified.
> (3) Determination of conformance ... for drug products. Such samples shall be representative and properly identified.
> (4) The calibration of instruments, apparatus, gauges, and recording devices at suitable intervals in accordance with an established written program containing specific directions, schedules, limits for accuracy and precision, and provisions for remedial action ... Instruments, apparatus, gauges, and recording devices not meeting established specifications shall not be used.

**Finding:** §211.160(b) does not mention reagents, standard solutions, or reference standards by name at all. Its four numbered laboratory-control requirements cover (1) components/containers/closures/labeling, (2) in-process materials, (3) drug products, and (4) instrument calibration. There is no subparagraph on labelling, expiration, or standardisation of reagents/standard solutions in §211.160. That obligation lives in §211.194(c) instead (see A2).

### A2. §211.194(a)–(e) — Laboratory records
Exact text:

> (a) Laboratory records shall include complete data derived from all tests necessary to assure compliance with established specifications and standards, including examinations and assays, as follows:
> (1) A description of the sample received for testing with identification of source (that is, location from where sample was obtained), quantity, lot number or other distinctive code, date sample was taken, and date sample was received for testing.
> (2) A statement of each method used in the testing of the sample. The statement shall indicate the location of data that establish that the methods used in the testing of the sample meet proper standards of accuracy and reliability as applied to the product tested. (If the method employed is in the current revision of the United States Pharmacopeia, National Formulary, AOAC INTERNATIONAL, Book of Methods, or in other recognized standard references, or is detailed in an approved new drug application and the referenced method is not modified, a statement indicating the method and reference will suffice). The suitability of all testing methods used shall be verified under actual conditions of use.
> (3) A statement of the weight or measure of sample used for each test, where appropriate.
> (4) A complete record of all data secured in the course of each test, including all graphs, charts, and spectra from laboratory instrumentation, properly identified to show the specific component, drug product container, closure, in-process material, or drug product, and lot tested.
> (5) A record of all calculations performed in connection with the test, including units of measure, conversion factors, and equivalency factors.
> (6) A statement of the results of tests and how the results compare with established standards ...
> (7) The initials or signature of the person who performs each test and the date(s) the tests were performed.
> (8) The initials or signature of a second person showing that the original records have been reviewed for accuracy, completeness, and compliance with established standards.
> (b) Complete records shall be maintained of any modification of an established method employed in testing. Such records shall include the reason for the modification and data to verify that the modification produced results that are at least as accurate and reliable ... as the established method.
> (c) Complete records shall be maintained of any testing and standardization of laboratory reference standards, reagents, and standard solutions.
> (d) Complete records shall be maintained of the periodic calibration of laboratory instruments, apparatus, gauges, and recording devices required by §211.160(b)(4).
> (e) Complete records shall be maintained of all stability testing performed in accordance with §211.166.

**Direct answer on lot of reference standard:** §211.194(a)(1) requires a lot number (or distinctive code) for **the sample under test**. It does not require, anywhere in its text, that the lot number of the reference standard or reagent *used in the determination* be recorded. The closest provision is §211.194(c), which requires "complete records ... of any testing and standardization of laboratory reference standards, reagents, and standard solutions" — this is a record of standardizing/testing the reference material itself (i.e., a qualification record for the reference standard/reagent as a stock item), not a requirement to record, in each test record, which lot of standard/reagent was consumed in that particular determination. **Part 211's text does not explicitly require a per-test tie between the analytical record and the specific reference-standard lot used.** (Note: this is commonly required in practice via SOPs, and is discussed in FDA guidance/483 citations, but that is not what §211.194's text itself says.)

### A3. Equipment identification in the record
- **§211.180(e)/(f):** general record-retention/review requirements; no equipment-identification language.
- **§211.182 (Equipment cleaning and use log):** "A written record of major equipment cleaning, maintenance ..., and use shall be included in individual equipment logs that show the date, time, product, and lot number of each batch processed." This section is about *major* equipment logs tied to *batches*, not analytical instruments generically, and it doesn't require a unique equipment ID field, only that entries "show the date, time, product, and lot number."
- **§211.194(d):** "Complete records shall be maintained of the periodic calibration of laboratory instruments, apparatus, gauges, and recording devices required by §211.160(b)(4)." This requires calibration records for lab instruments but does not itself specify an instrument-ID/serial-number field.
- **§211.194(e):** stability testing records per §211.166 — no equipment-identification content.
- Elsewhere, **§211.188(b)(2)** (batch production and control records, not §211.194) requires "Identity of individual major equipment and lines used" — this is the clearest Part 211 requirement for recorded equipment identity, but it sits in the *batch record* subpart (211.188), not the laboratory-records subpart (211.194).

### A4. "Column" search
Searched the full current text of Part 211 (all subparts, as fetched) for the string "column": **zero occurrences**. Part 211 does not mention chromatography columns, consumables, or any analogous term anywhere in its text. This is a negative finding, not an oversight in my search — the full part text was searched directly.

### A5. §211.170 (reserve samples) and §211.137 (expiration dating) — relevance to reagent/standard expiry
- **§211.137** ("Expiration dating") applies expressly to "a drug product" — its five operative subsections (a)-(d), plus exemptions for homeopathic, no-standard-of-potency allergenic extracts, investigational, and certain OTC products — never mention reagents, reference standards, or standard solutions. **No bearing on reagent/standard expiry.**
- **§211.170** ("Reserve samples") governs retention of reserve samples of active ingredients and of drug products (with retention periods tied to expiration dates under §211.137). It is about retaining physical samples of the *material being tested/marketed*, not about reagents or reference standards used to test them. **No bearing on reagent/standard expiry.**
- **Conclusion:** neither section addresses reagent or reference-standard expiration at all. The only Part 211 text that touches reagent/reference-standard control is §211.194(c) (testing/standardization records), which does not itself impose an expiration-dating requirement either — Part 211 nowhere requires reagents or standard solutions to bear an expiration date.

## B. ISO/IEC 17025:2017, clauses 6.4–6.6 (secondary source — full text not read)

Per the EUROLAB/APHL implementation handbook (a clause-cross-reference guide against the 2005 edition, not ISO's verbatim text):

- **Clause 6.4 (Equipment):** the handbook states plainly that "Standards, reference materials, reagents, and software are now also considered as equipment (6.4.1)" in the 2017 edition — i.e., 17025:2017 folds reagents and reference materials into the Equipment clause, not the externally-provided-products clause, for control-system purposes. The handbook's implementation suggestion is to "adapt and extend the equipment control system to reagents, standards, reference materials, auxiliary equipment, and software," covering at least: identification; inventory and storage; calibration/verification; and record of malfunction/repairs. I could not independently verify the numbering of a 6.4.13 records subclause or its exact wording from this secondary source; the handbook does not quote 6.4.13 verbatim.
- **Clause 6.5 (Metrological traceability):** per the handbook, this clause covers linking results to SI via calibration chains, with an informative Annex A listing acceptable routes (NMI, accredited calibration lab, reference materials/procedures/laboratories where SI traceability isn't achievable). It references ISO 17034 (competence of reference-material producers) as the standard against which reference-material producer competence should be judged.
- **Clause 6.6 (Externally provided products and services):** per the handbook, this clause merged the old subcontracting (4.5) and purchasing (4.6) provisions from the 2005 edition. It requires a system to "select, assess, monitor, and reassess external providers," ensure purchased products/services meet requirements, and communicate specification/acceptance criteria to providers.

**Direct answer to the key question:** according to this secondary source, ISO/IEC 17025:2017 treats reagents and reference materials primarily under the **Equipment** clause (6.4), which now explicitly includes them, and requires an equipment-style control system (identification, inventory/storage, calibration/verification, records) applied to them — rather than treating their *day-to-day laboratory use* as an "externally provided product" governed solely by 6.6. Clause 6.6 remains relevant to the initial *procurement* of reagents/reference materials from external suppliers (i.e., how the lab selects and qualifies its reagent/RM vendors), while 6.4 governs how the lab controls and records them once in use. I could not confirm this from ISO's own text; it rests entirely on the EUROLAB secondary summary.

## C. USP General Chapter <11> USP Reference Standards

USP's own text of chapter <11> is behind USP-NF's paywall and was not read directly. Fetch attempts against usp.org's Reference Standards FAQ page and the "QA Policy Statement: USP RS Certificates and Assigned Values" PDF did not return usable content (the FAQ page appears to require JavaScript rendering; the PDF link resolved to a non-document stub). The following is drawn from a search-engine summary of USP's own published FAQ page content, not a direct read of USP's page — **lower confidence, could not verify exact wording**:

- A lot of USP Reference Standard is reportedly usable "as long as it is listed as Current Lot in the current Official USP Reference Standards Catalog," with "Current Lot" or "Previous Lot" status both described as valid.
- Assigned potency/value is reportedly not applicable for qualitative uses; for quantitative uses, an assigned value (e.g., via mass-balance analysis) is used.
- Certificates are reportedly lot-specific documents provided with (or available for) each USP RS lot, referenced alongside the compendial application and the RS label for instructions on use.
- A cited change: revisions to chapter <11> becoming official August 1, 2020 reportedly removed a prior allowance to assume 100.0% potency for quantitative use of a lot lacking a labeled value.

I flag all of the above as **unverified against USP's own primary text** — I was not able to fetch or quote USP's chapter <11> or its own FAQ/policy PDF directly, only a search engine's paraphrase of that page's content.

## What I could not establish

- The exact numbering/wording of an ISO/IEC 17025:2017 "6.4.13" records subclause — the secondary source used does not quote it, and I had no access to the paid standard text.
- Any verbatim USP <11> text — both direct fetch attempts (FAQ page, QA policy PDF) failed to return document content; findings for USP rest on a search-engine paraphrase only.
- Whether FDA guidance (as distinct from Part 211's own text) elsewhere states an expectation that reference-standard/reagent lot be recorded per-test — that would be a different source (guidance, not the regulation) and was out of scope for this text-search of Part 211 itself. Part 211's own text does not impose that requirement.

## Sources

- 21 CFR Part 211, current text as codified, fetched via eCFR versioner API (https://www.ecfr.gov/api/versioner/v1/full/2026-09-01/title-21.xml?part=211), reflecting amendments through 89 FR 51770 (June 18, 2024). Public-facing equivalent: https://www.ecfr.gov/current/title-21/chapter-I/subchapter-A/part-211
- EUROLAB, "Handbook ISO/IEC 17025:2017" (clause-by-clause cross-reference to ISO/IEC 17025:2005), hosted by APHL: https://aphl.org/docs/default-source/food-safety/human-and-animal-food-testing/eurolab-handbook-iso-iec-17025-2017.pdf — secondary source; ISO's own standard text was not accessed (paywalled at iso.org).
- USP, "Reference Standards FAQs" (usp.org): https://www.usp.org/frequently-asked-questions/reference-standards — accessed only via search-engine summary, not a direct fetch; content not independently verified.
- USP, "QA Policy Statement: USP RS Certificates and Assigned Values" (usp.org PDF, referenced but not successfully retrieved): https://www.usp.org/sites/default/files/usp/document/our-work/reference-standards/qa-policy-statement-usp-rs-certificates-and-assigned-values.pdf
