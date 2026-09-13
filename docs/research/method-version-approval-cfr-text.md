# Under 21 CFR Part 211, who must approve a laboratory analytical method and its specification/acceptance criteria, and does the regulation address effective dates, supersession, or change control?

**Asked by:** the orchestrator (Benchline wayfinder map)
**Date:** 2026-09-11
**Status of sources:** All CFR text below was retrieved from the eCFR versioner API on 2026-09-11 at the snapshot date **2026-09-09**, which is eCFR's `up_to_date_as_of` value for Title 21. The API reported Title 21 `latest_amended_on: 2026-09-08`, `latest_issue_date: 2026-09-08`. No text in this document is recited from memory or from a secondary source. Parts retrieved: 21 CFR Part 210, Part 211, Part 11.

**Retrieval method (reproducible):**

```
curl --compressed \
  "https://www.ecfr.gov/api/versioner/v1/full/2026-09-09/title-21.xml?chapter=I&subchapter=A&part=211"
```

(same for `part=11` and `part=210`). Counts below were taken two ways and cross-checked: (1) `grep -o -i` against the raw XML, and (2) `grep -o -i` against a tag-stripped plain-text flattening of the same XML. Both passes agreed on every term reported. Counts are **case-insensitive substring** counts unless the term is shown with `\b` word boundaries. Counts cover the whole of Part 211 including section headings and source/authority notes.

---

## 1. §211.22 — quality control unit responsibilities

> **(a)** There shall be a quality control unit that shall have the responsibility and authority to approve or reject all components, drug product containers, closures, in-process materials, packaging material, labeling, and drug products, and the authority to review production records to assure that no errors have occurred or, if errors have occurred, that they have been fully investigated. The quality control unit shall be responsible for approving or rejecting drug products manufactured, processed, packed, or held under contract by another company.
>
> **(b)** Adequate laboratory facilities for the testing and approval (or rejection) of components, drug product containers, closures, packaging materials, in-process materials, and drug products shall be available to the quality control unit.
>
> **(c)** The quality control unit shall have the responsibility for approving or rejecting all procedures or specifications impacting on the identity, strength, quality, and purity of the drug product.
>
> **(d)** The responsibilities and procedures applicable to the quality control unit shall be in writing; such written procedures shall be followed.

— 21 CFR 211.22, <https://www.ecfr.gov/current/title-21/chapter-I/subchapter-A/part-211/subpart-B/section-211.22>

**Does it name *specifications* and *test procedures* explicitly?** It names **"procedures or specifications"** in (c) — both words appear, but generically and qualified by "impacting on the identity, strength, quality, and purity of the drug product." §211.22 does **not** use the phrase "test procedures"; that phrase is in §211.160(a) (see §2).

**Is the approval authority the "quality control unit"?** Yes. The term used throughout is *quality control unit*, 18 occurrences in Part 211.

**"Quality Assurance" in Part 211:** **0 occurrences.** Searched case-insensitively across the full Part 211 XML (headings, body, and notes) and across the flattened text; both returned zero. Also **0 occurrences** in Part 210. The regulation never uses the term.

The governing definition is in Part 210, not Part 211:

> **(15)** *Quality control unit* means any person or organizational element designated by the firm to be responsible for the duties relating to quality control.

— 21 CFR 210.3(b)(15), <https://www.ecfr.gov/current/title-21/chapter-I/subchapter-A/part-210/section-210.3>

**What it obliges:** a QCU must exist and must hold approve/reject authority over procedures and specifications. **What it does not oblige:** it does not name the unit "Quality Assurance", does not prescribe how many approvers, does not prescribe an approval sequence, and does not prescribe any document-state model. The definition is deliberately open — "any person or organizational element designated by the firm."

---

## 2. §211.160(a) — general requirements for laboratory controls

> **(a)** The establishment of any specifications, standards, sampling plans, test procedures, or other laboratory control mechanisms required by this subpart, including any change in such specifications, standards, sampling plans, test procedures, or other laboratory control mechanisms, shall be drafted by the appropriate organizational unit and reviewed and approved by the quality control unit. The requirements in this subpart shall be followed and shall be documented at the time of performance. Any deviation from the written specifications, standards, sampling plans, test procedures, or other laboratory control mechanisms shall be recorded and justified.

— 21 CFR 211.160(a), <https://www.ecfr.gov/current/title-21/chapter-I/subchapter-A/part-211/subpart-I/section-211.160>

**Who drafts, reviews, approves:** drafting is by "the appropriate organizational unit"; review **and** approval are both by the quality control unit. **Yes, it distinguishes the drafting unit from the approving unit** — they are named as two different units in a single sentence, and the QCU is not assigned the drafting role.

**Deviations:** "Any deviation ... shall be recorded and justified." Note this obliges a record and a justification; it does not require pre-approval of the deviation, nor does it name who justifies.

**What it obliges:** this is the single strongest hook in Part 211 for the question asked. It covers *test procedures* and *specifications* by name, and it explicitly extends the same draft/review/approve obligation to **"any change in"** them. **What it does not oblige:** it says nothing about *when* an approved change takes effect, nothing about identifying which revision is in force, and nothing about what happens to the prior text.

---

## 3. §211.165(e) — accuracy, sensitivity, specificity, reproducibility

> **(e)** The accuracy, sensitivity, specificity, and reproducibility of test methods employed by the firm shall be established and documented. Such validation and documentation may be accomplished in accordance with § 211.194(a)(2).

— 21 CFR 211.165(e), <https://www.ecfr.gov/current/title-21/chapter-I/subchapter-A/part-211/subpart-I/section-211.165>

Related, in the same section:

> **(d)** Acceptance criteria for the sampling and testing conducted by the quality control unit shall be adequate to assure that batches of drug products meet each appropriate specification and appropriate statistical quality control criteria as a condition for their approval and release. The statistical quality control criteria shall include appropriate acceptance levels and/or appropriate rejection levels.

**Who it obliges:** "the firm" — not the QCU specifically, and not a named role. This is the only actor named in (e).

**What it obliges:** that the four properties be *established and documented* for methods the firm employs. **What it does not oblige:** it sets no validation protocol, no approval signature for the validation, no revalidation trigger on change, and no expiry or periodic-review interval. (§211.165(d) is the only place in Part 211 that uses the phrase "acceptance criteria", and it assigns them to QCU sampling and testing, not to the method document.)

---

## 4. §211.194(a)(2) — what the laboratory record must say about the method

> **(2)** A statement of each method used in the testing of the sample. The statement shall indicate the location of data that establish that the methods used in the testing of the sample meet proper standards of accuracy and reliability as applied to the product tested. (If the method employed is in the current revision of the United States Pharmacopeia, National Formulary, AOAC INTERNATIONAL, Book of Methods, or in other recognized standard references, or is detailed in an approved new drug application and the referenced method is not modified, a statement indicating the method and reference will suffice). The suitability of all testing methods used shall be verified under actual conditions of use.

— 21 CFR 211.194(a)(2), <https://www.ecfr.gov/current/title-21/chapter-I/subchapter-A/part-211/subpart-J/section-211.194> (footnote marker in the original directs readers to AOAC INTERNATIONAL for copies)

**Does it require the *version*?** **No — not of the firm's own method.** The record must contain "a statement of each method used" and "the location of data" establishing accuracy and reliability. The word *version* does not appear. The word *revision* appears exactly once in all of Part 211, and it is **here** — in the phrase **"the current revision of the United States Pharmacopeia"**, i.e. it is a currency requirement on an *external compendial reference being cited*, not a versioning requirement on an internal method document.

**Does it require a reference to where the method is on file?** Partially and indirectly: it requires the statement to "indicate the **location of data** that establish that the methods ... meet proper standards of accuracy and reliability." That is a pointer to the *validation data*, not a pointer to the method document itself.

Also relevant to method change:

> **(b)** Complete records shall be maintained of any modification of an established method employed in testing. Such records shall include the reason for the modification and data to verify that the modification produced results that are at least as accurate and reliable for the material being tested as the established method.

— 21 CFR 211.194(b). This is the closest Part 211 comes to a method-change record obligation. It requires *a record of the modification*, a reason, and comparative verification data. It does not require version numbering, an approval signature, or an effective date.

---

## 5. §211.100(a) and §211.186 — is there a general change-control obligation?

> **(a)** There shall be written procedures for production and process control designed to assure that the drug products have the identity, strength, quality, and purity they purport or are represented to possess. Such procedures shall include all requirements in this subpart. These written procedures, **including any changes**, shall be drafted, reviewed, and approved by the appropriate organizational units and reviewed and approved by the quality control unit.
>
> **(b)** Written production and process control procedures shall be followed in the execution of the various production and process control functions and shall be documented at the time of performance. Any deviation from the written procedures shall be recorded and justified.

— 21 CFR 211.100, <https://www.ecfr.gov/current/title-21/chapter-I/subchapter-A/part-211/subpart-F/section-211.100> (emphasis added)

**Scope note — this is load-bearing.** §211.100 sits in **Subpart F (Production and Process Controls)**. It governs *production and process control* procedures. The laboratory analogue is §211.160(a) in **Subpart I (Laboratory Controls)**. The two are near-parallel but **not identical**:

- §211.100(a): drafted, reviewed, **and approved** by the appropriate organizational units, **then** reviewed and approved by the QCU. (Two approval steps.)
- §211.160(a): drafted by the appropriate organizational unit, reviewed and approved by the QCU. (One approval step; the drafting unit is not assigned an approval.)

So the answer to "is there a general change-control obligation for written procedures" is: there is a **change-*approval*** obligation ("including any change(s)") in both, but neither uses the term *change control*, and neither specifies effective dating, revision identity, or supersession handling.

**§211.186** — relevant by analogy only, and the analogy is instructive:

> **(a)** To assure uniformity from batch to batch, master production and control records for each drug product, including each batch size thereof, shall be **prepared, dated, and signed** (full signature, handwritten) by one person and **independently checked, dated, and signed by a second person**. The preparation of master production and control records shall be described in a written procedure and such written procedure shall be followed.

— 21 CFR 211.186(a), <https://www.ecfr.gov/current/title-21/chapter-I/subchapter-A/part-211/subpart-J/section-211.186> (emphasis added)

§211.186(b)(9) requires master records to include "Complete manufacturing and control instructions, sampling and testing procedures, specifications, special notations, and precautions to be followed."

**What §211.186 obliges:** an explicit two-person prepare/check pattern, with **dates and full handwritten signatures**, for *master production and control records*. **What it does not oblige:** §211.186 applies to master production and control records, **not** to laboratory analytical methods. There is **no §211.186-equivalent two-person dated-signature requirement stated for laboratory test methods anywhere in Subpart I.** The dating requirement in §211.186(a) is a date *of signature*, not a future *effective date*.

---

## 6. Effective dates and supersession — term-by-term search of Part 211

Counts are over the entire Part 211 (2026-09-09 snapshot), case-insensitive, cross-checked raw-XML vs. flattened-text.

| Term searched | Occurrences in Part 211 |
|---|---|
| `effective date` | **0** |
| `change control` | **0** |
| `withdrawn` | **0** |
| `superseded` | **0** |
| `supersede` | 2 (both in §211.1(b)) |
| `revision` | 1 (§211.194(a)(2)) |
| `\bversion\b` / `\bversions\b` | **0** |
| `obsolete` | 1 (§211.122(e)) |
| `quality assurance` | **0** |

**Every hit, quoted:**

`supersede` — both occurrences are in §211.1(b) and concern **precedence between regulations**, not between documents:

> **(b)** The current good manufacturing practice regulations in this chapter as they pertain to drug products; in parts 600 through 680 of this chapter, as they pertain to drugs that are also biological products for human use; and in part 1271 of this chapter, as they are applicable to drugs that are also human cells, tissues, and cellular and tissue-based products (HCT/Ps) and that are drugs ...; supplement and do not **supersede** the regulations in this part unless the regulations explicitly provide otherwise. In the event of a conflict between applicable regulations in this part and in other parts of this chapter, or in parts 600 through 680 of this chapter, or in part 1271 of this chapter, the regulation specifically applicable to the drug product in question shall **supersede** the more general.

— 21 CFR 211.1(b). **Not a laboratory-controls context.** This is regulatory-hierarchy language and has no bearing on document supersession.

`revision` — the single occurrence is in §211.194(a)(2), quoted in full at §4 above: "the current **revision** of the United States Pharmacopeia, National Formulary, AOAC INTERNATIONAL, Book of Methods". **This is in a laboratory-controls context**, but it imposes currency on an *external compendium being cited*, not on the firm's own method document.

`obsolete` — the single occurrence is §211.122(e), in Subpart G (Packaging and Labeling Control):

> **(e)** Obsolete and outdated labels, labeling, and other packaging materials shall be destroyed.

— 21 CFR 211.122(e). **Not a laboratory-controls context.** This is about physical destruction of printed label stock. It is the only place Part 211 addresses the fate of superseded *material*, and it concerns labels, not procedures or methods. Note it says *destroyed* — the opposite of retained.

(The substring `version` returns 1 raw hit in Part 211; on inspection it is inside **"con*version* factors"** in §211.194(a)(5), not the word *version*. With word boundaries the count is **0**. Reported here so the count is reproducible and not mistaken for a real hit.)

**Direct answer to the orchestrator's question:** the concept of a **future effective date set by the approver** has **no textual basis anywhere in 21 CFR Part 211**. The phrase "effective date" occurs zero times. No provision distinguishes the moment of approval from the moment a method becomes the one that must be followed. §211.160(a) requires QCU approval of any change and requires that "the requirements in this subpart shall be followed" — it creates an approved/not-approved distinction, but no approved-but-not-yet-effective state. A future effective date is therefore a **lab-procedure construct**, not an inherited CFR obligation. Once written into the lab's own procedure it becomes binding via §211.160(a) (and §211.22(d), "such written procedures shall be followed"), but it remains the lab's own text and is rewritable.

---

## 7. §211.180(e) and §211.194(d)/(e) — retention of superseded method versions

> **(e)** Written records required by this part shall be maintained so that data therein can be used for evaluating, at least annually, the quality standards of each drug product to determine the need for **changes in drug product specifications or manufacturing or control procedures**. Written procedures shall be established and followed for such evaluations and shall include provisions for:
> **(1)** A review of a representative number of batches, whether approved or rejected, and, where applicable, records associated with the batch.
> **(2)** A review of complaints, recalls, returned or salvaged drug products, and investigations conducted under § 211.192 for each drug product.

— 21 CFR 211.180(e), <https://www.ecfr.gov/current/title-21/chapter-I/subchapter-A/part-211/subpart-J/section-211.180>

**Bearing on superseded method retention: indirect and weak.** §211.180(e) establishes an **annual review** whose *output* may be a determination that specifications or control procedures need to change. It is a trigger for change, not a rule about retaining what was replaced. It does not require that prior versions be kept, nor that the review reconstruct which method was in force on a given date.

§211.194(d) and (e), quoted in full:

> **(d)** Complete records shall be maintained of the periodic calibration of laboratory instruments, apparatus, gauges, and recording devices required by § 211.160(b)(4).
>
> **(e)** Complete records shall be maintained of all stability testing performed in accordance with § 211.166.

— 21 CFR 211.194(d), (e). **Neither bears on retention of superseded method versions.** (d) is calibration records; (e) is stability testing records. Neither mentions methods, versions, or supersession. The orchestrator should treat these two as **negative findings** for the question asked.

The retention rules that *do* apply are §211.180(a)–(d) — retention periods keyed to batch expiry/distribution, availability for inspection, and permission to retain true copies rather than originals. None of them says anything about retaining a superseded revision of a method document. **Part 211 contains no explicit obligation to retain superseded versions of a laboratory method.** The nearest thing is §211.194(b) (records of any modification of an established method, with reason and comparative data), which obliges a record *about* the change rather than retention of the *prior text*.

---

## 8. 21 CFR Part 11 — draft vs. approved/effective records

Retrieved from the same 2026-09-09 snapshot. <https://www.ecfr.gov/current/title-21/chapter-I/subchapter-A/part-11>

**Term counts in Part 11:** `draft` **0**, `effective date` **0**, `supersede`/`superseded` **0**, `version` **0**, `obsolete` **0**, `status` **0**, `withdrawn` **0**, `change control` 1, `revision` 1, `approv-` 1.

**Part 11 does not contain the concept of a draft record versus an approved or effective one.** The word *draft* does not appear; neither does *status*. §11.3 defines *electronic record* without reference to any lifecycle state:

> **(6)** *Electronic record* means any combination of text, graphics, data, audio, pictorial, or other information representation in digital form that is created, modified, maintained, archived, retrieved, or distributed by a computer system.

— 21 CFR 11.3(b)(6)

**§11.10(e) — audit trail, and the do-not-obscure rule:**

> **(e)** Use of secure, computer-generated, time-stamped audit trails to independently record the date and time of operator entries and actions that create, modify, or delete electronic records. **Record changes shall not obscure previously recorded information.** Such audit trail documentation shall be retained for a period at least as long as that required for the subject electronic records and shall be available for agency review and copying.

— 21 CFR 11.10(e) (emphasis added)

**What it obliges:** where a method document is an electronic record in a closed system, changes to it must be captured in a secure, computer-generated, time-stamped audit trail, and **the prior content must remain legible** — a change may not overwrite what was there before in a way that obscures it. Audit trail retention is at least as long as the record's own retention period. **What it does not oblige:** it does not require version numbers, does not define an approval state, and does not distinguish a draft from an effective record. The "shall not obscure" rule is the only Part 11 provision that constrains how prior method content is treated, and it constrains *legibility*, not *versioning*.

**Other §11.10 paragraphs that bear on the question:**

> **(a)** Validation of systems to ensure accuracy, reliability, consistent intended performance, and the ability to discern invalid or altered records.
>
> **(c)** Protection of records to enable their accurate and ready retrieval throughout the records retention period.
>
> **(d)** Limiting system access to authorized individuals.
>
> **(f)** Use of operational system checks to enforce permitted sequencing of steps and events, as appropriate.
>
> **(g)** Use of authority checks to ensure that only authorized individuals can use the system, electronically sign a record, access the operation or computer system input or output device, alter a record, or perform the operation at hand.

— 21 CFR 11.10(a), (c), (d), (f), (g)

§11.10(f) ("permitted sequencing of steps and events, as appropriate") is the closest Part 11 comes to sanctioning a state machine over a record — but it is qualified by "as appropriate" and names no states. §11.10(g) ("authority checks") is the closest to an approval-permission rule — it requires that only authorized individuals may sign or alter a record, but does not say who is authorized or define an approver role.

**§11.10(k) — the one "change control" hit in Part 11:**

> **(k)** Use of appropriate controls over systems documentation including:
> **(1)** Adequate controls over the distribution of, access to, and use of documentation for system operation and maintenance.
> **(2)** **Revision and change control procedures** to maintain an audit trail that documents time-sequenced development and modification of systems documentation.

— 21 CFR 11.10(k) (emphasis added)

**Scope caution:** §11.10(k) is the only occurrence of "change control" and of "revision" in Part 11, but its subject is **"systems documentation"** — documentation *for system operation and maintenance* — not the GMP content records the system holds. On its face it does not reach a laboratory analytical method stored in the system. Reported here because the orchestrator asked for §11.10(a)–(k); the scope limit is part of the finding.

Finally, the meaning-of-signature requirement, which is where Part 11 comes closest to an approval concept:

> **(3)** The meaning (such as review, **approval**, responsibility, or authorship) associated with the signature.

— 21 CFR 11.50(a)(3), signature manifestations. This requires that a signed electronic record display *what the signature means*, offering "approval" as one example. It creates a labelling obligation for signatures, not an approval workflow.

---

## What I could not establish

- **Whether FDA expects a future effective date in practice.** Part 211's silence is established above with a zero count. Whether FDA *guidance* (as distinct from regulation) or inspectional practice expects effective dating was outside the scope asked and is not settled by the CFR text. Guidance is not binding in the way the CFR is; if the orchestrator needs this, it is a separate question against fda.gov, and the current FDA data-integrity guidance is the December 2018 final document (not the superseded draft).
- **Whether a superseded method version must be retrievable to reconstruct a past batch.** No provision in Part 211 states this directly. It is arguably implied by §211.194(a)(2) (the record must state the method used) combined with §211.180(a) retention periods, but the text does not close the inference, and I am not going to assert an obligation the regulation does not state.
- **Whether "the appropriate organizational unit" in §211.160(a) may be the same unit as the QCU.** The text names two units but does not prohibit overlap; §210.3(b)(15) defines the QCU permissively ("any person or organizational element designated by the firm"). The regulation does not settle whether one person may both draft and approve.
- **Part 11 applicability scope.** Whether a given method document is a Part 11 electronic record at all depends on whether it is a record required by predicate rules and kept electronically. That determination is not made by the text of Part 11 itself.

---

## Negative findings — terms occurring **zero** times

**In 21 CFR Part 211** (full part, 2026-09-09 snapshot, case-insensitive, raw-XML and flattened-text passes agreeing):

- `effective date` — **0**
- `change control` — **0**
- `superseded` — **0**
- `withdrawn` — **0**
- `version` / `versions` (word-boundary) — **0**
- `quality assurance` — **0**
- `revise` — **0**

**In 21 CFR Part 210** (definitions governing Part 211):

- `quality assurance` — **0**
- `effective date` — **0**
- `version` — **0**
- `change control` — **0**

**In 21 CFR Part 11:**

- `draft` — **0**
- `status` — **0**
- `effective date` — **0**
- `supersede` / `superseded` — **0**
- `version` — **0**
- `obsolete` — **0**
- `withdrawn` — **0**

The headline negatives: **Part 211 never says "effective date", never says "change control", never says "version", and never says "quality assurance."** Part 11 never says "draft".

---

## Sources

All retrieved 2026-09-11 from the eCFR snapshot dated **2026-09-09** (Title 21 `up_to_date_as_of` 2026-09-09; `latest_amended_on` 2026-09-08), via the eCFR versioner API endpoint `https://www.ecfr.gov/api/versioner/v1/full/2026-09-09/title-21.xml`.

1. 21 CFR Part 211 — Current Good Manufacturing Practice for Finished Pharmaceuticals. <https://www.ecfr.gov/current/title-21/chapter-I/subchapter-A/part-211>
   - §211.1(b); §211.22(a)–(d) (source: 43 FR 45077, Sept. 29, 1978, as amended); §211.100(a)–(b); §211.122(e) (as amended 77 FR 16163, Mar. 20, 2012); §211.160(a)–(b) (as amended 73 FR 51932, Sept. 8, 2008); §211.165(a)–(f); §211.180(a)–(f) (as amended 60 FR 4091, Jan. 20, 1995); §211.186(a)–(b); §211.194(a)–(e) (as amended 70 FR 67651, Nov. 8, 2005).
2. 21 CFR 210.3(b)(15) — definition of *quality control unit*. <https://www.ecfr.gov/current/title-21/chapter-I/subchapter-A/part-210/section-210.3>
3. 21 CFR Part 11 — Electronic Records; Electronic Signatures. <https://www.ecfr.gov/current/title-21/chapter-I/subchapter-A/part-11>
   - §11.3(b)(4), (6), (7); §11.10(a)–(k); §11.50(a)(3).

No secondary sources were used or relied on. No source returned an error or paywall; the only retrieval failures were two self-corrected API calls (a missing compression header, and a snapshot date one day past the latest issue date), both resolved against the primary source.
