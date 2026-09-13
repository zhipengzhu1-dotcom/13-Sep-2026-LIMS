# What do primary sources require to be recorded about the act of receipt of material into a pharmaceutical QC laboratory — as distinct from the per-test analytical record — and is any of it obligated at the level of the delivery rather than the individual container?

**Asked by:** Benchline wayfinder map effort (orchestrator dispatch, no ticket number given)
**Date:** 2026-09-11
**Status of sources:**
- 21 CFR Part 211 and Part 11: fetched live from the eCFR versioner API, `https://www.ecfr.gov/api/versioner/v1/full/2026-09-08/title-21.xml?part=211` and `...part=11`, both returned HTTP 200 on 2026-09-11. The requested date (2026-09-08) is the most recent issue date the API accepted; this is the current text as published by eCFR at time of fetch.
- EU GMP Annex 11 (Computerised Systems): fetched from `https://health.ec.europa.eu/system/files/2016-11/annex11_01-2011_en_0.pdf`, converted with `pdftotext`. This is "Status of the document: revision 1," in force from 30 June 2011. No newer Annex 11 text is published by the European Commission as of this fetch; this is treated as current.
- FDA Data Integrity and Compliance With Drug CGMP Questions and Answers Guidance for Industry: fetched from `https://www.fda.gov/media/119267/download`, confirmed by the document's own title page to be dated **December 2018** (not a superseded draft — checked the title page date explicitly per the known draft-vs-final trap for this document).
- PIC/S PI 041-1 "Good Practices for Data Management and Integrity in Regulated GMP/GDP Environments": fetched the version at `https://picscheme.org/docview/4234`, confirmed by its own header to be dated **1 July 2021** (the final, adopted version, not the November 2018 Draft 3 that also ranks in search — checked the header date explicitly).

All quotations below are verbatim extracts from these fetched texts (XML tags/HTML stripped, PDF text extracted with `pdftotext -layout`).

## Findings

### 1. 21 CFR 211.194(a)(1) — what it requires, and at what granularity

Full text of 211.194(a)(1) as fetched:

> "(1) A description of the sample received for testing with identification of source (that is, location from where sample was obtained), quantity, lot number or other distinctive code, date sample was taken, and date sample was received for testing."

This is one clause within §211.194(a), "Laboratory records," which opens: "Laboratory records shall include complete data derived from all tests necessary to assure compliance with established specifications and standards, including examinations and assays, as follows: ..."

Observations directly from the text:
- The clause attaches these elements to **"the sample received for testing,"** not to a delivery, shipment, or lot of containers as a whole. The unit of reference is a "sample" — the eventual object of laboratory testing, i.e., the article after it has been drawn/taken for analysis — not the incoming physical containers.
- The clause says nothing about how many records must exist when one delivery yields multiple sample containers, multiple lots, or multiple sub-samples. It is silent on record cardinality relative to a delivery. It does not say "each container" or "each delivery"; it says "a description of the sample."
- §211.194 as a whole is titled "Laboratory records" and its neighboring provisions (weight/measure used, calculations, results, initials of tester, initials of a second person reviewing) are all keyed to the test event, reinforcing that (a)(1) is describing what the lab's test record must say about the sample it tested, not a standalone receiving-event record.

**No language in 211.194(a)(1) or its surrounding subsection addresses a delivery-level record separate from the per-sample description.** The regulation is silent on delivery-level record keeping.

### 2. 21 CFR 211.82 and 211.84 — whose obligation, and is the laboratory named

§211.82, "Receipt and storage of untested components, drug product containers, and closures":

> "(a) Upon receipt and before acceptance, each container or grouping of containers of components, drug product containers, and closures shall be examined visually for appropriate labeling as to contents, container damage or broken seals, and contamination.
> (b) Components, drug product containers, and closures shall be stored under quarantine until they have been tested or examined, whichever is appropriate, and released. Storage within the area shall conform to the requirements of § 211.80."

§211.84, "Testing and approval or rejection of components, drug product containers, and closures" (selected):

> "(a) Each lot of components, drug product containers, and closures shall be withheld from use until the lot has been sampled, tested, or examined, as appropriate, and released for use by the quality control unit.
> (b) Representative samples of each shipment of each lot shall be collected for testing or examination. ...
> (c)(5) Sample containers shall be identified so that the following information can be determined: name of the material sampled, the lot number, the container from which the sample was taken, the date on which the sample was taken, and the name of the person who collected the sample.
> (e) Any lot of components, drug product containers, or closures that meets the appropriate written specifications ... may be approved and released for use. Any lot of such material that does not meet such specifications shall be rejected."

**Whose obligation:** Both sections sit in Subpart E, "Control of Components and Drug Product Containers and Closures," which by its position and cross-references (§211.84(a): "released for use by the quality control unit") governs the receiving/warehousing function of a drug **manufacturer**, examining materials as they enter the manufacturing site — not a contract or in-house laboratory receiving samples for testing that have already passed through this receiving step. The "each container or grouping of containers" language in 211.82(a) is about physical, incoming shipments at the point they arrive at the manufacturing facility; §211.84 then governs the sampling and testing of those containers by or for the quality control unit.

**The text does not use the word "laboratory" in either section.** Neither §211.82 nor §211.84 names the laboratory as the actor; §211.84(a) names "the quality control unit" as the releasing authority, and §211.84(c) describes container examination and sample-container labeling as part of the sampling procedure, which could be performed by QC/QA personnel functioning inside or adjacent to the lab, but the regulation does not distinguish a "laboratory receiving a sample" role from a "warehouse/manufacturing receiving a shipment" role — it does not name or contemplate this distinction at all. It regulates the receipt of components/containers/closures at the manufacturing site generally, under the authority of the quality control unit, without carving out a separate laboratory-receipt obligation.

**Conclusion: 211.82/211.84 do not speak to a laboratory receiving a sample for testing as distinct from the site's receipt of a shipment.** They obligate the manufacturing/receiving function (under QC unit authority) at the level of "each container or grouping of containers" (211.82(a)) and "each shipment of each lot" (211.84(b)) — i.e., partially at delivery/shipment level and partially at container level, but this is the incoming-material control regime for manufacturing, not the laboratory's own receipt-of-sample record under 211.194.

### 3. Discrepant or rejected deliveries

Occurrence counts in Part 211 (text extracted from the full-part XML, HTML/XML entities decoded):

| Term | Occurrences |
|---|---|
| "reject" (any form) | 20 |
| "discrepan" (any form) | 5 |
| "damage" | 1 |
| "deviation" (any form) | 10 |
| "quarantine" | 6 |

Where "discrepan" and "damage" land, verbatim:

- §211.125(c): "...shall require evaluation of discrepancies found between the quantity of drug product finished and the quantity of labeling issued when such discrepancies are outside narrow preset limits based on historical operating data. Such discrepancies shall be investigated in accordance with § 211.192."
- §211.192: "...Any unexplained discrepancy (including a percentage of theoretical yield exceeding the maximum or minimum percentages established in master production and control records) or the failure of a batch or any of its components to meet any of its specifications shall be thoroughly investigated... A written record of the investigation shall be made and shall include the conclusions and followup."
- §211.82(a) (the only occurrence of "damage" in Part 211): "...examined visually for appropriate labeling as to contents, container damage or broken seals, and contamination."

**No occurrence of "discrepan" or "damage" in Part 211 concerns a delivery that was refused/rejected before becoming a sample or lot on record.** Every occurrence of "discrepan" is about post-testing/post-production investigation (§211.125, §211.192), not about receipt-time rejection. "Reject" occurs 20 times but in every located instance is about a **lot** of components/containers/product failing testing/specifications and being rejected by the quality control unit (§211.84(e), §211.22(a), §211.180(e)(1)), not about a delivery being turned away at the door before sampling.

**No provision in Part 211 requires a record of a delivery that was examined and refused/not accepted before it became a sampled/tested lot.** §211.82(a) requires visual examination "upon receipt and before acceptance" for labeling, damage, and contamination, but the section does not say what must be recorded if that examination fails, who must record a refusal, or that a refusal record must be kept. The disposition path in Part 211 (quarantine → sample → test → §211.84(e) approve/reject) presupposes the material was accepted into quarantine; the pre-acceptance refusal scenario is not addressed by any Part 211 or Part 11 text found.

**Part 11** contains no requirements specific to receipt or delivery rejection; it is a records/signatures-format regulation and does not use "reject," "discrepan," "damage," or "quarantine" language of this kind (confirmed by inspection of the fetched §11.10 text and surrounding sections; Part 11 is much shorter and topically about electronic records/signatures controls, not receiving).

### 4. Second-person verification of a receipt record specifically

**21 CFR Part 211:**
- §211.194(a)(8) requires "The initials or signature of a second person showing that the original records have been reviewed for accuracy, completeness, and compliance with established standards" — but this is a requirement on the **laboratory test record as a whole** (subsection (a) covers items (1) through (8) collectively), not a provision naming the receipt description in (a)(1) specifically for second-person check. The regulation does not carve out (a)(1) for separate treatment; the second-person review requirement in (a)(8) applies to "the original records," which by structure includes whatever was recorded under (a)(1)-(7).
- §211.186(a): master production/control records "shall be prepared, dated, and signed... by one person and independently checked, dated, and signed by a second person" — this is a manufacturing master-record provision, not a receipt-record provision.
- §211.188(b)(11): requires "[i]dentification of the persons performing and directly supervising or checking each significant step" in batch production — again a manufacturing batch-record provision.
- §211.100(b): requires that written procedures "be documented at the time of performance" and that "[a]ny deviation from the written procedures shall be recorded and justified" — a contemporaneity/deviation-documentation requirement, not a second-person-check requirement.
- §211.22 establishes the quality control unit's authority to "approve or reject" materials and to "review production records," but does not impose a second-person verification requirement on a receipt record as such.

**No provision found in Part 211 or Part 11 that names "receipt record" and requires a second person to verify it, specifically.** The nearest analog is §211.194(a)(8), which requires second-person review of laboratory test records generally (which necessarily includes whatever receipt description was captured under (a)(1)), and §211.186(a)/§211.188(b)(11), which impose "checking by a second person" on manufacturing master and batch records, not on the act of receiving material into a laboratory.

**21 CFR Part 11 §11.10:** contains no clause requiring a second person to verify any record; it requires audit trails (see Finding 5), authority checks, and accountability for actions under one's own electronic signature, but does not impose second-person review as a control.

**EU GMP Annex 11, §6 "Accuracy Checks"** (quoted in full):

> "For critical data entered manually, there should be an additional check on the accuracy of the data. This check may be done by a second operator or by validated electronic means. The criticality and the potential consequences of erroneous or incorrectly entered data to a system should be covered by risk management."

This is the clearest primary-source text on the topic found across all sources searched, and it is explicitly a **permitted method, not a mandatory second-person requirement**: the check "may be done by a second operator **or** by validated electronic means," and whether the check is needed at all is conditioned on the data being "critical" per a risk assessment. Annex 11 does not name "receipt records" specifically; it speaks generally of "critical data entered manually."

**PIC/S PI 041-1 (1 July 2021):** discusses second-person review in two places relevant here:
- On "scribes" (§ with footnote 8): "The use of scribes (second person) to record activity on behalf of another operator should be considered 'exceptional'... the scribe recording should be contemporaneous with the task being performed, and should identify both the person performing the observed task and the person completing the record. The person performing the observed task should countersign the record wherever possible..." — this addresses a different scenario (someone else recording on your behalf), not verification of a receipt record after the fact.
- On computerised-system data review: "An SOP should describe the process by which data is checked by a second operator. These SOPs should outline the critical raw data that is reviewed, a review of data summaries, review of any associated log-books and hard-copy records, and explain how the review is performed, recorded and authorised." This is presented as an expectation for an SOP-driven review process for critical electronic data generally, again not specific to a receipt record, and framed as something "an SOP should describe" rather than as a directly binding regulatory clause (PI 041-1 is inspectorate guidance, not law).

**FDA December 2018 Data Integrity Q&A:** Question 5 discusses "second person review" only in the context of shared login accounts: "Shared, read-only user accounts that do not allow the user to modify data or settings are acceptable for viewing data, but they do not conform with the part 211 and 212 requirements for actions, such as second person review, to be attributable to a specific individual." This treats "second person review" as an existing CGMP practice/requirement elsewhere in Part 211 (citing generally §§211.68(b), 211.188(b)(11), 211.194(a)(7) and (8), 212.50(c)(10)) and is about attributability of whoever performs that review, not about creating a new requirement that receipt specifically be second-person-verified.

**Summary for sub-question 4:** No primary source reviewed states, as a requirement, that a person other than the one who performed a receipt must verify the receipt record specifically. The closest textual anchors are (a) §211.194(a)(8)'s second-person review of laboratory records generally, which would encompass a receipt description if one exists inside the lab record, and (b) Annex 11 §6, which offers second-operator accuracy checking as one of two **permitted, risk-based options** (the other being validated electronic means) for "critical data entered manually" generally — not a mandate, and not receipt-specific.

### 5. Retention pairing — §211.180(a)-(e)

Full text of §211.180(a) through (e) as fetched:

> "(a) Any production, control, or distribution record that is required to be maintained in compliance with this part and is specifically associated with a batch of a drug product shall be retained for at least 1 year after the expiration date of the batch or, in the case of certain OTC drug products lacking expiration dating because they meet the criteria for exemption under § 211.137, 3 years after distribution of the batch.
> (b) Records shall be maintained for all components, drug product containers, closures, and labeling for at least 1 year after the expiration date or, in the case of certain OTC drug products lacking expiration dating because they meet the criteria for exemption under § 211.137, 3 years after distribution of the last lot of drug product incorporating the component or using the container, closure, or labeling.
> (c) All records required under this part, or copies of such records, shall be readily available for authorized inspection during the retention period at the establishment where the activities described in such records occurred. These records or copies thereof shall be subject to photocopying or other means of reproduction as part of such inspection. Records that can be immediately retrieved from another location by computer or other electronic means shall be considered as meeting the requirements of this paragraph.
> (d) Records required under this part may be retained either as original records or as true copies such as photocopies, microfilm, microfiche, or other accurate reproductions of the original records. Where reduction techniques, such as microfilming, are used, suitable reader and photocopying equipment shall be readily available.
> (e) Written records required by this part shall be maintained so that data therein can be used for evaluating, at least annually, the quality standards of each drug product to determine the need for changes in drug product specifications or manufacturing or control procedures. Written procedures shall be established and followed for such evaluations and shall include provisions for: (1) A review of a representative number of batches, whether approved or rejected, and, where applicable, records associated with the batch. (2) A review of complaints, recalls, returned or salvaged drug products, and investigations conducted under § 211.192 for each drug product."

A receipt record, if it exists as an entity, would fall under §211.180(b) if it is treated as a "record... for a component" — that paragraph's plain text is component/container/closure/labeling-keyed, with retention pegged to "at least 1 year after the expiration date... of the last lot of drug product incorporating the component," not to a fixed period from the receipt date itself. Alternatively, if the receipt description lives inside the laboratory test record required by §211.194(a)(1), then §211.180(a) applies (batch-associated record, retained relative to the batch's expiration date), since §211.194 records are typically tied to a specific batch/lot under test.

**§211.180 does not contain a retention clause keyed to "date of receipt" as such** — all retention periods run from expiration date or distribution date, not from the date the material or sample was received. This is a structural mismatch with Part 11 §11.10(e)'s audit-trail retention rule, which is quoted below for reference:

> "(e) Use of secure, computer-generated, time-stamped audit trails to independently record the date and time of operator entries and actions that create, modify, or delete electronic records. Record changes shall not obscure previously recorded information. Such audit trail documentation shall be retained for a period at least as long as that required for the subject electronic records and shall be available for agency review and copying."

Under §11.10(e), an audit trail's retention is pegged to "the subject electronic records" it documents. **What that pegs to, for a receipt record, therefore depends on which §211.180 category the receipt record is classified under** — (a) batch-associated, or (b) component/container/closure/labeling-associated — and Part 211 does not itself resolve which category a receipt-of-sample record (as opposed to a receipt-of-component record) falls into, because as found in sub-questions 1-2 above, Part 211 does not clearly contemplate a standalone "receipt record" for the *laboratory's* receipt of a sample at all.

### 6. ALCOA / contemporaneous / attribution of performer vs. enterer

**FDA December 2018 Data Integrity Q&A**, on ALCOA:

> "Complete, consistent, and accurate data should be attributable, legible, contemporaneously recorded, original or a true copy, and accurate (ALCOA)."

with footnote 5:

> "These characteristics are important to ensuring data integrity and are addressed throughout the CGMP regulations for drugs. For attributable, see §§ 211.101(d), 211.122, 211.186, 211.188(b)(11), and 212.50(c)(10); for legible, see §§ 211.180(e) and 212.110(b); for contemporaneously recorded (at the time of performance), see §§ 211.100(b) and 211.160(a); for original or a true copy, see §§ 211.180 and 211.194(a); and for accurate, see §§ 211.22(a), 211.68, 211.188, and 212.60(g)."

On login accounts and attributability, Question 5 (quoted again for this sub-question):

> "...you must implement documentation controls that ensure that the actions as described in question 4 are attributable to a specific individual (see §§ 211.68(b), 211.188(b)(11), 211.194(a)(7) and (8), and 212.50(c)(10)). Shared, read-only user accounts that do not allow the user to modify data or settings are acceptable for viewing data, but they do not conform with the part 211 and 212 requirements for actions, such as second person review, to be attributable to a specific individual."

The Q&A ties "attributable" to specific individuals performing actions (creating, modifying, reviewing), but **does not distinguish, in any passage found, between the person who performed a physical act (e.g., physically receiving a delivery) and the person who later keys that event into a record.** The guidance's framing is about the record/action being traceable to "a specific individual," without addressing a performer/enterer split.

**PIC/S PI 041-1** on the "Attributable" ALCOA+ attribute:

> "Attributable — It should be possible to identify the individual or computerised system that performed a recorded task and when the task was performed. This also applies to any changes made to records, such as corrections, deletions, and changes where it is important to know who made a change, when, and why."

This defines "attributable" in terms of "the individual... that performed a recorded task," which on its face conflates performing the task and recording it — the clause does not separately name a "performer" role and an "enterer" role. The only place in PI 041-1 that explicitly separates a performer from a recorder is the **scribe provision** (quoted in full in Finding 4 above), which is presented as an **exceptional** practice for specific circumstances (risk to product/activity from the act of recording, or literacy/language accommodation) — not a general model for receipt recording, and it requires that "the person performing the observed task should countersign the record wherever possible," i.e., the performer's own attribution is still expected, just added after the fact.

**Summary for sub-question 6:** No primary source states, as a general rule, that a receipt record must separately capture "who performed the physical act of receipt" as distinct from "who entered the record." The only textual mechanism found that names a performer/recorder split is PIC/S PI 041-1's scribe exception, which is explicitly exceptional and requires eventual performer countersignature, not routine dual-role capture.

## What I could not establish

- Whether 21 CFR 211.82/211.84's receiving-and-examination obligations apply, by extension or by FDA enforcement practice, to a **laboratory** that receives samples from a client or from a separate manufacturing site rather than to the manufacturing site's own incoming-goods receiving function. The regulatory text itself does not address contract/independent testing laboratories receiving samples at all; it is written from the perspective of a single manufacturing establishment's Subpart E control-of-components regime. I found no primary text that settles this for a standalone QC lab.
- Whether a delivery-level record (as opposed to a per-container or per-sample record) is required anywhere in Part 211 for material that is later sampled and tested. §211.84(b) speaks of "each shipment of each lot" for sampling-plan purposes, but I found no clause requiring a persisting record of the shipment/delivery itself, separate from the per-lot/per-sample records that follow.
- What, if anything, must be recorded — and by whom — when a delivery is examined and refused before acceptance. §211.82(a) requires the examination; no clause in Part 211 or Part 11 that I could locate requires a record of the outcome of that examination when the outcome is refusal, nor does it name a responsible recorder or require a stated reason. This appears to be a genuine gap in the regulatory text as fetched, not merely an omission on my part — the search terms "reject," "discrepan," "damage," "deviation," and "quarantine" were checked exhaustively against the full Part 211 text and none of the occurrences addresses a pre-acceptance refusal record.
- Which §211.180 retention category ((a) batch-associated or (b) component-associated) a laboratory's own receipt-of-sample record falls under, since Part 211 does not clearly recognize a "receipt of sample by the laboratory" record as a distinct instrument at all (see Findings 1 and 5). This is not resolvable from the regulatory text alone.
- Whether PIC/S PI 041-1, as inspectorate guidance from a non-U.S.-FDA body, would be treated as binding or merely persuasive in a US FDA-regulated GMP context; I report its text as found but take no position on its authority relative to Part 211.

## Sources

- 21 CFR Part 211, current text via eCFR versioner API, `https://www.ecfr.gov/api/versioner/v1/full/2026-09-08/title-21.xml?part=211`, fetched 2026-09-11, HTTP 200.
- 21 CFR Part 11, current text via eCFR versioner API, `https://www.ecfr.gov/api/versioner/v1/full/2026-09-08/title-21.xml?part=11`, fetched 2026-09-11, HTTP 200 (after transient 503s on the same endpoint).
- EU GMP Annex 11, "Computerised Systems," Volume 4 EudraLex, Status: revision 1, in force 30 June 2011. `https://health.ec.europa.eu/system/files/2016-11/annex11_01-2011_en_0.pdf`, fetched and text-extracted 2026-09-11.
- FDA, *Data Integrity and Compliance With Drug CGMP Questions and Answers, Guidance for Industry*, December 2018 (title page confirms date; this is the final guidance, not the earlier 2016 draft). `https://www.fda.gov/media/119267/download`, fetched and text-extracted 2026-09-11.
- PIC/S, *PI 041-1, Good Practices for Data Management and Integrity in Regulated GMP/GDP Environments*, 1 July 2021 (final adopted version; distinct from the November 2018 Draft 3 that also appears in search results). `https://picscheme.org/docview/4234`, fetched and text-extracted 2026-09-11.
