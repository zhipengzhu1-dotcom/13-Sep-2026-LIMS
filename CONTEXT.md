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

**Client contact**:
The person at the Client a Submission's Certificates of Analysis are for — their name, role, email address and phone number — recorded by the Coordinator at receipt as the Client gives them.
_Avoid_: Requester, customer contact

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
A versioned analytical procedure that measures exactly one Analyte. One Analyte may have several Methods. Its code and version (e.g. `NIT-001 v1`) are the number and version of its controlled document, so a new document version is a new Method; every Result names the Method it was run under through its Test.
_Avoid_: SOP, procedure, assay

**Test**:
One Method applied to one Sample.
_Avoid_: Analysis, job

**Result**:
The reported outcome of a Test in the Material type's reporting unit: a number, or a number qualified as `< LOD` or `< LOQ`. The analyst calculates it from the instrument's ng/mL reading.
_Avoid_: Reading, measurement, raw data

**Analysis date**:
The calendar date, in the laboratory's time zone (US Eastern), the Analyst ran a Result's analysis, entered with the Result and printed in its row of the Certificate of Analysis; never later than the day it is recorded or earlier than the day the Sample was received. Correcting it is a correction of the Result.
_Avoid_: Test date, run date

**LOD / LOQ**:
The Method's fixed, validated limit of detection and limit of quantitation; where a Result falls against them decides whether it is reported as `< LOD`, `< LOQ` or a quantified number. They are held in ppm, and in ng/day they are the ppm values at the Method's Maximum-dose ceiling.

**Maximum-dose ceiling**:
The highest Maximum daily dose, in mg/day, a Method may be requested for; receipt refuses a finished product above it, so the Method's ng/day LOD and LOQ, set at the ceiling, are conservative for every Sample it tests.
_Avoid_: Dose limit, maximum dose

**Acceptable intake**:
The FDA-recommended maximum daily exposure to a specific nitrosamine, in ng/day, as published on CDER's Nitrosamine Impurity Acceptable Intake Limits list. Each entry records its Potency category and Limit type; a changed value, category or type is a new entry.
_Avoid_: AI (in prose), FDA limit

**Potency category**:
The nitrosamine's category, 1 to 5, under FDA's Carcinogenic Potency Categorization Approach (CPCA), or "not categorised". Benchline allows "not categorised" only for a compound-specific or interim limit (a lab decision, not an FDA rule). Entries appended before categories were recorded show it as not recorded.

**Limit type**:
How an Acceptable intake was set: CPCA-predicted (the value FDA predicts for the Potency category: 26.5, 100, 400, 1500 or 1500 ng/day for categories 1 to 5), compound-specific, or interim.
_Avoid_: Provisional limit

**Limit**:
The maximum acceptable level of an Analyte in a finished product: the Acceptable intake in ng/day in force when the Result was judged. Raw materials currently have no Limit and are reported as is.
_Avoid_: Spec, threshold

**Out-of-specification (OOS) investigation**:
The recorded inquiry opened when a Result exceeds its Limit, opened and closed by the Manager after the assigned Analyst's Laboratory error check; it concludes either that the Result is Invalidated or that the OOS is confirmed, meaning no assignable laboratory cause was found and the Client's full-scale investigation follows, and Approval waits until it is closed. A Result that exceeds its Limit is never corrected except through its investigation, and a confirmed OOS is communicated to the Client before Publishing, recording what data and Laboratory error check findings were sent for the Client's investigation.
_Avoid_: Exception, investigate, deviation

**Laboratory error check**:
The assigned Analyst's recorded review of their own work on a Result under OOS investigation, stating the findings and whether a laboratory error was identified.
_Avoid_: Lab check, Phase I, self-review

**Invalidated result**:
A Result an OOS investigation found to have an assignable laboratory cause: a laboratory error the Laboratory error check identified and the Manager confirmed caused the value; it stays on record, marked with that cause, and is followed by a Retest.
_Avoid_: Deleted result, void, superseded result

**Retest**:
A new Result on a Test whose Result was Invalidated, recording the Invalidated result and the OOS investigation it follows. It is calculated again, on its own calculation worksheet, and a correction of it is still that Retest.
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
The person who may act in every lab role — as Coordinator, Analyst (when a Sample is assigned to them) and Manager, but never as Quality lead — as a stand-in; every act is still their own, signed with their own password, and they never give Approval to a Sample on which they entered, corrected or retested a Result or recorded a Laboratory error check. Before Go-live Benchline's developer holds it; after Go-live it is the lab's one backup person, the most senior Analyst, with no account or configuration rights.
_Avoid_: Super admin, superuser, root

**Approval**:
Management's single electronically signed sign-off that a Sample's Results are correct and may be published; there is no separate peer review step. Its signature attests that the Results, their calculation worksheets, the original instrument data and the Sample's audit trail were reviewed, and an Amendment's Approval attests the same for the corrected Results.
_Avoid_: Review, release, sign-off

**Electronic signature**:
A password-confirmed act that records the signer's name, the date and time, and its meaning (performed by, approved by, amended by).
_Avoid_: E-sign, initials

**Signed content**:
Exactly what an Electronic signature attests to, kept unchanged as it stood at the moment of signing: the Sample with its Results and OOS investigations and, for Approval, the Certificate of Analysis issued. A signature is valid only while it still matches its Signed content, so later changes to the Sample, such as an Amendment, never invalidate an earlier signature.
_Avoid_: Signed record, signature payload, snapshot

**Certificate of Analysis**:
The locked, signed report of a Sample's approved Results for the Client. It is issued at the Approval that locks it, which is its date of issue, and marks the information the Client supplied.
_Avoid_: CoA (in prose), report, results sheet

**Publish**:
Delivering an approved Sample's Certificate of Analysis to the Client and recording how and when; it never changes the Certificate's date of issue.
_Avoid_: Release, send out

**Amendment**:
A new version of a published Certificate of Analysis, corrected by the Analyst with a reason, re-approved by a Manager and published by the Coordinator; it is marked Amended and the superseded version stays on file.
_Avoid_: Correction, reissue, revision

### The lab and its system

**Go-live**:
The moment the Quality lead signs off Benchline's validation, from which the electronic record, not paper, is the official record.
_Avoid_: Production, launch, cut-over

**Quality lead**:
The person responsible for the lab's quality system, who approves its controlled documents, signs off Benchline's validation for Go-live, and approves every account change and release of Benchline. In Benchline they can see every Sample, the lab-wide audit trail and exports, but never act on a record.
_Avoid_: Quality manager, QA lead

**System administrator**:
Benchline's developer acting as an external provider with no laboratory role after Go-live, who develops and deploys Benchline and administers its accounts and configuration, each account change and release approved by the Quality lead.
_Avoid_: Admin, super admin, IT

**Failed attempt**:
A sign-in or an Electronic signature refused because the password was wrong, recorded in the audit trail with the username that was typed, whether or not that account exists.
_Avoid_: Bad login, invalid attempt

**Locked account**:
An account refused both sign-in and Electronic signatures after the lab's set number of consecutive Failed attempts, counted across sign-in and signing together; it stays locked until the System administrator unlocks it and issues a One-time password, and the lockout is notified at once to the System administrator and the Quality lead.
_Avoid_: Disabled account, suspended account, blocked user

**One-time password**:
A password the System administrator sets for an account, given to its user in person after checking who they are, which the user must replace with their own at their next sign-in; it is how every new or unlocked account starts.
_Avoid_: Temporary password, default password, reset password

**Access event**:
An audit trail entry about an account rather than a record: a sign-in, sign-out, session expiry, Failed attempt, lockout, lockout notice, unlock or password change, and, before Go-live, an account the Admin added or changed (a printed name, role, or deactivation) (ADR-0011).
_Avoid_: Login event, security log entry
