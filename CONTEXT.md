# Benchline

An analytical chemistry laboratory's system of record for nitrosamine impurity testing, from receiving samples through analysis, review, approval and publishing results to the customer. It replaces a paper-based operation and must satisfy FDA 21 CFR 211 / Part 11 and ISO/IEC 17025:2017.

## Language

### Receiving

**Submission**:
One receipt event: a single delivery from a Client that contains one or more Samples.
_Avoid_: Shipment, order, request

**Sample**:
A distinct container or set of containers from one batch, received under a Submission and identified by its own lab Sample ID.
_Avoid_: Specimen, item

**Client**:
The party a Submission is tested for, either an external customer or an internal department of the company.
_Avoid_: Customer (in data), requester

**Material type**:
Whether a Sample is a raw material (drug substance or API) or a finished product; it determines the reporting unit (ppm for raw materials, ng/day for finished products).
_Avoid_: Matrix, sample type

**Stability sample**:
A finished product Sample identified by a stability study, a time point (e.g. `Initial`, `1M`) and a storage condition (e.g. `RT`, `ACC`), each shipped by the Client as its own Submission; it is reported like any finished product.
_Avoid_: Stability pull (as a data term)

**Maximum daily dose**:
The highest daily intake of the drug product, supplied by the Client with each Submission.
_Avoid_: MDD (in prose), dose

**Due date**:
The date the Client requested the Certificate of Analysis by, recorded at receipt.
_Avoid_: Turnaround, deadline

**Receipt deviation**:
A problem found when a Sample arrives (damaged package, temperature excursion, insufficient quantity) that puts the Sample on hold until the Client instructs the lab.
_Avoid_: Non-conformance, damage report

### Analysis

**Analyte**:
A nitrosamine impurity a Method measures (currently Impurity A, B or C).
_Avoid_: Impurity (as a data term), compound, parameter

**Method**:
A versioned analytical procedure that measures exactly one Analyte. One Analyte may have several Methods.
_Avoid_: SOP, procedure, assay

**Test**:
One Method applied to one Sample.
_Avoid_: Analysis, job

**Result**:
The reported outcome of a Test in the Material type's reporting unit: a number, or a number qualified as `< LOD` or `< LOQ`. The analyst calculates it from the instrument's ng/mL reading.
_Avoid_: Reading, measurement, raw data

**LOD / LOQ**:
The Method's fixed, validated limit of detection and limit of quantitation; where a Result falls against them decides whether it is reported as `< LOD`, `< LOQ` or a quantified number.

**Acceptable intake**:
The FDA-recommended maximum daily exposure to a specific nitrosamine, in ng/day, as published on CDER's Nitrosamine Impurity Acceptable Intake Limits list.
_Avoid_: AI (in prose), FDA limit

**Limit**:
The maximum acceptable level of an Analyte in a finished product: the Acceptable intake in ng/day in force when the Result was judged. Raw materials currently have no Limit and are reported as is.
_Avoid_: Spec, threshold

**Out-of-specification (OOS) investigation**:
The recorded inquiry opened when a Result exceeds its Limit, opened and closed by the Manager after the assigned Analyst's Laboratory error check; it concludes either that the Result is Invalidated or that the OOS is confirmed, meaning no assignable laboratory cause was found and the Client's full-scale investigation follows, and Approval waits until it is closed. A Result that exceeds its Limit is never corrected except through its investigation, and a confirmed OOS is communicated to the Client before Publishing.
_Avoid_: Exception, investigate, deviation

**Laboratory error check**:
The assigned Analyst's recorded review of their own work on a Result under OOS investigation, stating the findings and whether a laboratory error was identified.
_Avoid_: Lab check, Phase I, self-review

**Invalidated result**:
A Result an OOS investigation found to have an assignable laboratory cause: a laboratory error the Laboratory error check identified and the Manager confirmed caused the value; it stays on record, marked with that cause, and is followed by a Retest.
_Avoid_: Deleted result, void, superseded result

**Retest**:
A new Result on a Test whose Result was Invalidated, recording the Invalidated result and the OOS investigation it follows.
_Avoid_: Re-analysis, repeat, correction

**Bench work**:
A person's own work on a Sample's Results: entering, correcting or retesting a Result, or recording a Laboratory error check. Whoever did bench work on a Sample never gives it Approval.
_Avoid_: Own work, involvement, contribution

**Conformity statement**:
The per-Result verdict on a Certificate of Analysis: `Complies` or `Does not comply` for finished products, decided by rounding the Result to the Limit's decimal places and comparing (a `< LOD` or `< LOQ` Result complies when that value is below the Limit), and `Report` for raw materials. Each Result is judged on its own; no combined nitrosamine assessment is made.
_Avoid_: Pass/fail, verdict

### Outcome

**Coordinator**:
The person who receives Submissions, assigns each whole Sample to one Analyst, and Publishes Certificates of Analysis.
_Avoid_: Receiver, sample custodian

**Manager**:
The person who gives Approval or returns a Sample to its Analyst with a comment; never for Results they entered themselves.
_Avoid_: Reviewer, approver, QA

**Admin**:
The person who may act in every role — as Coordinator, Analyst (when a Sample is assigned to them) and Manager — for a lab too small to staff each role separately; every act is still their own, signed with their own password, and they never give Approval to a Sample on which they entered, corrected or retested a Result or recorded a Laboratory error check.
_Avoid_: Super admin, superuser, root

**Approval**:
Management's single electronically signed sign-off that a Sample's Results are correct and may be published; there is no separate peer review step.
_Avoid_: Review, release, sign-off

**Electronic signature**:
A password-confirmed act that records the signer's name, the date and time, and its meaning (performed by, approved by, amended by).
_Avoid_: E-sign, initials

**Certificate of Analysis**:
The locked, signed report of a Sample's approved Results that is issued to the Client.
_Avoid_: CoA (in prose), report, results sheet

**Publish**:
Issuing an approved Sample's Certificate of Analysis to the Client.
_Avoid_: Release, send out

**Amendment**:
A new version of a published Certificate of Analysis, corrected by the Analyst with a reason, re-approved by a Manager and published by the Coordinator; it is marked Amended and the superseded version stays on file.
_Avoid_: Correction, reissue, revision
