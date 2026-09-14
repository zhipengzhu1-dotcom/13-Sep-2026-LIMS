# FDA OOS investigations and nitrosamine impurity control: what they mean for Benchline

Researched 2026-09-13. Terms follow `CONTEXT.md`. All FDA documents here are nonbinding guidance ("should" means recommended). The 21 CFR sections they cite are binding but were not fetched. *(from reading code, not verified)* marks judgments from reading `src/laboratory/`.

## 1. Sources

| ID | Title | Revision / date | Status |
|---|---|---|---|
| [OOS][oos] | Investigating Out-of-Specification (OOS) Test Results for Pharmaceutical Production ([landing page][oos-page], which calls it a "Level 2 revision") | Revision 1, May 2022 | Nonbinding ("Contains Nonbinding Recommendations"). Cites binding 21 CFR 211.192, 211.160, 211.165, 211.180, 211.194 and 314.81 |
| [NIT][nit] | Control of Nitrosamine Impurities in Human Drugs | Revision 2, September 2024 | Nonbinding |
| [RAIL][rail] | Recommended Acceptable Intake Limits for Nitrosamine Drug Substance-Related Impurities (NDSRIs) | August 2023 (no later revision on the [landing page][rail-page]) | Nonbinding, issued for immediate implementation |
| [CDER][cder] | CDER Nitrosamine Impurity Acceptable Intake Limits (web page) | "Updated 8/6/2026" at fetch time | Nonbinding; FDA updates it periodically |
| [Q2][q2] | ICH Q2(R2) Validation of Analytical Procedures | Final, adopted 1 November 2023 | Harmonised guideline; FDA issues it as guidance |

Fetch notes: quotes were checked against text extracted from the PDFs. An automated summary of the OOS PDF invented text (for example a "30 days" deadline), which was discarded. The CDER page was read only through a summary. USP `<1225>`/`<1226>` and USP General Notices (rounding) were not fetched.

## 2. Requirements by concern

### 2.1 OOS Phase I: laboratory investigation

**R1. Every OOS result gets an investigation, even if the batch is rejected.** "FDA regulations require that an investigation be conducted whenever an OOS test result is obtained (§ 211.192)… Batch rejection does not negate the need to perform the investigation." A written record is required, "including the conclusions and follow-up." ([OOS §III][oos])
**For Benchline:** Satisfied. A `Does not comply` Result blocks Approval until an OOS investigation is opened and closed (`oosApprovalBlocker`), and ADR-0006 plus spec #17 stage 2.1 close the gap where a Result could be corrected before an investigation was opened. *(from reading code, not verified)*

**R2. The analyst retains preparations and tells the supervisor.** "When unexpected results are obtained and no obvious explanation exists, test preparations should be retained, if stable, and the analyst should inform the supervisor." Obvious errors should be documented immediately. ([OOS §III.A][oos])
**For Benchline:** Not modelled. Nothing records whether solutions or preparations were retained, or when the Manager was told. The Laboratory error check has only free-text findings.

**R3. The supervisor's assessment is objective, timely and covers seven steps:** discuss the method with the analyst; examine raw data and chromatograms; verify the calculations; confirm instrument performance; check standards and reagents; evaluate method performance; and "Fully document and preserve records of this laboratory assessment." Retained solutions "should be examined," for example by re-injection. ([OOS §III.B][oos])
**For Benchline:** Partly. The Laboratory error check is the Analyst's self-review. The Manager, who plays the supervisor's part, records only an outcome and an assignable cause. Under ADR-0002, calculations are checked only at Approval.

**R4. Laboratory error must be clearly established.** "OOS test results should not be attributed to analytical error without completing an investigation that clearly establishes a laboratory root cause." When errors are found, the firm "should determine the source of that error and take corrective action." ([OOS §III.B][oos])
**For Benchline:** Partly. ADR-0006 requires an identified error before a Result can be Invalidated. Benchline records no corrective action and has no trend view of laboratory errors ("Laboratory management should be especially alert to developing trends").

### 2.2 Invalidation

**R5. Invalidation needs a documented test event that caused the OOS.** "Invalidation of a discrete test result may be done only upon the observation and documentation of a test event that can reasonably be determined to have caused the OOS result." An invalidated result "should not be used to evaluate the quality of the batch." ([OOS §V.A][oos]) "When clear evidence of laboratory error exists, laboratory testing results should be invalidated." ([OOS §III.B][oos])
**For Benchline:** Partly. The stage 2.2 rule (Invalidated only if `errorIdentified`) is necessary but not sufficient. The guidance requires that the error *caused* the value. Benchline records a yes/no "error identified" and a free-text assignable cause, not a finding that the error explains the Result.

**R6. Outlier tests and averaging cannot invalidate a result.**
- For validated chemical tests, an outlier test "will not identify the cause of an extreme observation and, therefore, should not be used to invalidate the suspect result." ([OOS §IV.C.2][oos])
- Averaging the OOS result with retest results "is not appropriate because it hides variability." ([OOS §IV.C.1.b][oos])

**For Benchline:** Unknown. Benchline has no statistical invalidation path. Under ADR-0002 averaging happens in the Analyst's worksheet, which only the Manager's review of the attachment can catch.

### 2.3 Phase II: full-scale investigation

**R7. If no lab error is found, the investigation goes full-scale.** "If this initial assessment indicates that no causative errors were made… a full-scale OOS investigation should be conducted." Phase II covers production and sampling review, is led by the manufacturer's quality unit (QU), and follows "a predefined procedure." ([OOS §III][oos], [§IV, IV.A][oos])
**For Benchline:** Consistent for an external Client if "Confirmed" is read as a hand-off: "For contract laboratories, the laboratory should convey its data, findings, and supporting documentation to the manufacturing firm's quality unit (QU)," which then starts Phase II ([OOS §III][oos]). The Client notification records only a contact and a time. See 3(a).

### 2.4 Retest and resample

**R8. Retests are predefined and capped.** "The maximum number of retests to be performed on a sample should be specified in advance in a written standard operating procedure (SOP)… The number of retests should not be adjusted depending on the results obtained." The procedure should include "a point at which the additional testing ends." Repeated testing until a pass is "testing into compliance," which is "unscientific and objectionable under CGMP." ([OOS §IV.B.1][oos])
**For Benchline:** Not satisfied. Benchline has no retest limit and no SOP reference. Any number of invalidate-then-Retest cycles is possible, each needing its own investigation.

**R9. Who retests.** "It is often important for the predefined retesting plan to include retests performed by an analyst other than the one who performed the original test. A second analyst… should be at least as experienced and qualified." Material is "taken from the same homogeneous material." ([OOS §IV.B.1][oos])
**For Benchline:** Not satisfied. Only the assigned Analyst can enter a Retest (`requireAssignedAnalyst`) *(from reading code, not verified)*. Benchline does not record which preparation or portion a Retest used.

**R10. A retest after a clear lab error replaces the original, and the original data stays.** "In the case of a clearly identified laboratory error, the retest results would substitute for the original test result. However, all original data must be retained (§ 211.180) and an explanation should be recorded… initialed and dated by the involved persons and include a discussion of the error and supervisory comments." Without an identified error, "there is no scientific basis for invalidating initial OOS results in favor of passing retest results." ([OOS §IV.B.1][oos])
**For Benchline:** Satisfied in principle. An Invalidated result stays on record with its cause, and spec #17 stage 2.4 links the Retest to the investigation. Nothing labelled "supervisory comments" is recorded apart from the assignable cause.

**R11. Resampling follows predetermined procedures.** Resampling must follow "predetermined procedures and sampling strategies (§ 211.165(c))" using the same validated methods. ([OOS §IV.B.2][oos])
**For Benchline:** Not modelled. A resample would arrive as a new Submission, with no link to the earlier OOS investigation on the same batch.

### 2.5 Reporting and records

**R12. Report all results to the customer.** "All test results, both passing and suspect, should be reported" (footnote 10: "in… Certificates of Analysis"). "When investigation by a contract laboratory does not determine an assignable cause, all test results should be reported to the customer on the certificate of analysis." Footnote 16: "The Agency also recommends that OOS investigation reports be provided to the customer." ([OOS §IV.B.1, IV.C.2][oos])
**For Benchline:** Partly. The Certificate lists investigation IDs and outcomes, and stage 2.5 adds the decided value *(from reading code, not verified)*. Investigation reports are not issued to the Client, and Client notification is recorded only for Confirmed outcomes.

**R13. Records and timeliness.** "All records pertaining to the OOS test result should be retained" ([OOS §V.B.3][oos]). Investigations should be "thorough, timely, unbiased, well-documented" ([OOS §III][oos]), with no day limit given. Applicants must file a field alert report "within 3 working days" for a distributed batch unless the OOS "is found to be invalid within 3 days" ([OOS §V.C][oos]). That duty is the Client's.
**For Benchline:** Records: satisfied. Timeliness: not modelled. Nothing times open investigations or Client notification, and the Client's 3-day clock depends on hearing promptly.

### 2.6 Nitrosamine limits and choosing the AI

**R14. AI values come from FDA's list, which changes.** Manufacturers "should refer to the nitrosamine guidance web page for FDA's recommended AI limits". That page "will be updated periodically. For the most recent version, check the web page." AI limits may also be "communicated directly to an applicant," and a "scientifically justified rationale" can support a different limit. If no AI can be determined, "26.5 ng/day be used." ([NIT §IV.A and fn 32, 34][nit]) The CDER page also lists interim AI limits. ([CDER][cder]; [RAIL §V.B][rail])
**For Benchline:** Mostly satisfied. Acceptable intake entries are append-only, with source title, URL, revision date and effective date, and each Result copies the entry it was judged against *(from reading code, not verified)*. Gaps:
- Client-specific or interim limits cannot be recorded.
- The seeded values are `illustrative: true` and must be replaced before validation.

**R15. CPCA assigns one of five potency categories.** The Carcinogenic Potency Categorization Approach assigns categories 1–5 with recommended AIs of 26.5, 100, 400, 1500 and 1500 ng/day. ([RAIL §IV.B Table 1][rail]) The CDER table gives nitrosamine name, source API, potency category and recommended AI in ng/day. ([CDER][cder])
**For Benchline:** Partly. Benchline stores only the value. It does not store the potency category or whether the AI is CPCA-predicted, compound-specific or interim, which an auditor comparing against the current CDER page would need.

### 2.7 Method sensitivity

**R16. LOQ must fit the limit.** "Sensitive analytical methods with appropriate limits of quantitation (LOQs) are needed… the detection and quantitation limit should be commensurate with the level at which the impurities must be controlled. The LOQ should be scientifically justified." ([NIT §IV.A][nit], citing Q2(R1)) Q2(R2) gives estimation approaches, including signal-to-noise "at least 10:1" for QL, and "The QL and the approach used for its determination should also be presented." ([Q2 §3.2.3][q2]) The 10 percent of AI level decides whether a specification is needed. ([NIT §V.A][nit]) No specific numeric LOQ appears in the fetched guidance text.
**For Benchline:** Partly. LOD and LOQ are fixed per Method and a `< LOQ` Result complies only if the LOQ is below the Limit. However, under ADR-0002 the ng/day LOQ is a fixed number, while the true ng/day LOQ scales with the Maximum daily dose. No check compares LOQ with the AI or with 10 percent of the AI.

### 2.8 Multiple nitrosamines

**R17. AIs apply to a single nitrosamine; totals should be controlled.** FDA AIs "are applicable only if a drug product contains a single nitrosamine. FDA recommends that when more than one nitrosamine is identified, the total limit of nitrosamines should not exceed the recommended AI limit for the most potent nitrosamine." A "flexible" alternative sums each nitrosamine as a percentage of its AI to "not exceed 100 percent" (n ≤ 3). With more than three, contact FDA. ([NIT §IV.A, Appendix C][nit]; [RAIL §IV.D][rail])
**For Benchline:** Not satisfied. See 3(d).

### 2.9 Units and conversion using the Maximum daily dose

**R18. Convert ng/day to ppm with the labelled MDD.** "Parts per million = AI (ng/day)/MDD (mg). MDD for purposes of calculating a control limit for nitrosamines is typically the MDD reflected in the drug product labeling." ([NIT §IV.A][nit]; same formula in [RAIL fn 15][rail] and [CDER][cder]) Appendix C example: MDD 80 mg/day, 26.5 ng/day gives "NMT 0.33" ppm.
**For Benchline:** Consistent. A finished product Result in ng/day equals the measured ng/mg (ppm) × Maximum daily dose (mg/day), so comparing it with the AI is the FDA comparison. Under ADR-0002 the conversion is done by hand. Benchline does not record whether the Client's Maximum daily dose is the labelled one.

## 3. Tensions and gaps

**(a) Phase I only, with Confirmed or Invalidated as outcomes.** For an external Client this matches what the guidance expects of a contract lab: find a clear lab error, or hand data and findings to the Client's QU for Phase II ([OOS §III][oos]). The guidance, though, uses "confirmed" for a cause "affecting the batch quality" and "inconclusive" for neither ([OOS §V.A][oos]). A Phase I lab cannot tell those apart. Benchline's *Confirmed* really means "no laboratory cause found; OOS stands, handed to the Client". Define it that way in CONTEXT.md, have the Client notification record what was conveyed, and for internal-department Clients record who owns Phase II.

**(b) ADR-0006: Invalidated requires an identified laboratory error.**
- Consistent with the guidance, and required by it ([OOS §III.B, V.A][oos]).
- It is too weak in two ways. The flag records that an error was found, not that it *caused* the OOS. And the flag is set by the Analyst whose work is under review, where the guidance expects an objective supervisor assessment.
- Consider requiring the concluding Manager to affirm that the cause explains the value.

**(c) Retest.** The guidance expects all three of these, and Benchline has none (see R8–R9): a predefined SOP with a maximum retest count, often a second analyst, and a stated end point. Benchline lets only the assigned Analyst retest, with no count or SOP. Repeated invalidate-then-Retest cycles are exactly the testing-into-compliance pattern ([OOS §IV.B.1][oos]).

**(d) "No combined nitrosamine assessment is made."**
- This conflicts with FDA's statement that individual AIs apply only when one nitrosamine is present ([NIT §IV.A][nit]).
- Two Analytes each marked `Complies` can together fail both the most-potent-AI total and the Appendix C sum.
- The Client sets its own specification, so the lab need not decide this. It should, however, either state on the Certificate that the Conformity statement does not assess total nitrosamines, or report percent of AI per Result and the total.

**(e) Rounding to the Limit's decimal places.**
- None of the fetched FDA or ICH sources defines a rounding convention. They say batches "above the recommended AI limit" should not be released ([NIT §IV.D.2.b][nit]).
- Benchline's rule (26.54 rounds to 26.5 and complies with 26.5) therefore rests on USP General Notices practice, which was not verified here, or on the Client's specification.
- Record the source of the decision rule. Also watch the guidance's caution on borderline results ([OOS §V.B.3][oos]).

**(f) Raw materials "have no Limit and are reported as is."** The OOS guidance covers APIs and specifications "established… by the manufacturer" ([OOS §I][oos]). API batches above the AI "should not be released", and drug product makers "must test… lots of at-risk API" ([NIT §IV.C.2, IV.D.2.a][nit]), against a ppm limit of AI/MDD. Because raw material Results are always `Report`, a Client's ppm specification can never trigger an OOS investigation. The Certificate's `maximumDailyDose` is also null for raw materials *(from reading code, not verified)*.

**(g) Extra: fixed ng/day LOQ.** Under ADR-0002 the fixed ng/day LOQ decides `< LOQ` conformity, even though the real ng/day LOQ depends on the Maximum daily dose (R16). A high-dose product could be marked `Complies` on an LOQ that does not meet "commensurate" sensitivity.

## 4. Developer checklist

1. Never let a `Does not comply` Result leave its state except through its OOS investigation. Test correction, supersession and deletion paths. ([OOS §III][oos])
2. Refuse `Invalidated` unless the Laboratory error check identified an error and the assignable cause is recorded. ([OOS §V.A][oos])
3. Never delete, overwrite or hide an Invalidated result or any earlier Result value. Assert they are still returned after a Retest or Amendment. ([OOS §IV.B.1][oos], § 211.180)
4. Never offer outlier statistics or averaging with retest values as a reason to invalidate. ([OOS §IV.C.1–2][oos])
5. Refuse a Retest unless the Test's Result was Invalidated by a closed investigation. Link the Retest to it, and refuse Retests beyond a maximum fixed before testing. ([OOS §IV.B.1][oos])
6. Treat a Retest over its Limit as a new OOS needing its own investigation. Never average it with the original. ([OOS §IV.C.1.b][oos])
7. Block Approval while any investigation on the Sample is open or a `Does not comply` Result has no closed investigation. ([OOS §III][oos])
8. List every investigation, with outcome and the value it decided, on the Certificate row. Copy it into locked content at issue. ([OOS fn 10, §IV.C.2][oos])
9. Block Publishing until notification of a Confirmed OOS is recorded, and store what was conveyed as well as who and when. ([OOS §III, fn 16][oos])
10. Judge each finished product Result against the Acceptable intake entry in force at judgment. Copy the entry id, value, source URL and revision date into the Result and the Certificate. ([NIT §IV.A fn 32][nit])
11. Never edit or delete an Acceptable intake entry. A changed AI is a new entry with a later effective date. ([CDER][cder])
12. Refuse to enter a finished product Result when no Acceptable intake is in force. Do not silently use a default. ([NIT §IV.A][nit])
13. Compute any ppm limit as AI (ng/day) ÷ Maximum daily dose (mg), and test it against the Appendix C example (26.5 ÷ 80 = 0.33 at 2 decimal places). ([NIT §IV.A, App. C][nit])
14. Do not change `< LOD`/`< LOQ` conformity without checking that LOQ is commensurate with the Limit for that Sample's Maximum daily dose. ([NIT §IV.A][nit]; [Q2 §3.2.3][q2])
15. Do not describe a Conformity statement as covering total nitrosamines. Any total must follow most-potent-AI or sum of percent of AI ≤ 100 percent. ([NIT §IV.A, App. C][nit])
16. Write every investigation, Retest and Limit change to the audit trail in the same command, and write nothing when the command is refused. ([OOS §III.B][oos], § 211.194)

[oos]: https://www.fda.gov/media/158416/download
[oos-page]: https://www.fda.gov/regulatory-information/search-fda-guidance-documents/investigating-out-specification-oos-test-results-pharmaceutical-production-level-2-revision
[nit]: https://www.fda.gov/media/141720/download
[rail]: https://www.fda.gov/media/170794/download
[rail-page]: https://www.fda.gov/regulatory-information/search-fda-guidance-documents/recommended-acceptable-intake-limits-nitrosamine-drug-substance-related-impurities
[cder]: https://www.fda.gov/regulatory-information/search-fda-guidance-documents/cder-nitrosamine-impurity-acceptable-intake-limits
[q2]: https://database.ich.org/sites/default/files/ICH_Q2%28R2%29_Guideline_2023_1130.pdf
