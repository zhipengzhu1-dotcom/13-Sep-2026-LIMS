# SOP-001 — Sample receipt and login

> **Provenance: `archetype-assumed`** — synthetic document, no real laboratory content.
> **Resolution:** build-ready · **References:** 21 CFR 211.160(b), 211.194(a)(1); USP General Notices 5.20

## Purpose

To record the arrival of material into the laboratory, establish its identity and
custody, and fix the acceptance criteria against which it will be judged.

## Scope

All material received for analytical testing: in-process, finished product,
stability pull, raw material, and returned or reserve material presented for retest.

## Roles

| Role | Responsibility |
| --- | --- |
| Sample receipt coordinator | Performs receipt, assigns the laboratory number, records condition |
| Laboratory supervisor | Resolves discrepant or damaged receipts |
| Quality Assurance | Approves acceptance of material received outside specification-bearing conditions |

## Procedure

1. Confirm the delivery against the submission paperwork: material identity,
   batch identifier, number of containers, requested tests, and the submitter.
2. Inspect each container. Record condition, seal integrity, temperature indicator
   status where the material is temperature-controlled, and any damage.
3. Where the submission is incomplete, illegible, or the material is damaged,
   **stop**. Raise a receipt discrepancy and refer to the laboratory supervisor.
   Do not assign a laboratory number to material that has not been accepted.
4. Assign the next **laboratory number** from the controlled sequence. The number
   is never reused, never reassigned, and never issued out of order.
5. Label each container with the laboratory number. Where the submission comprises
   multiple containers, each container receives the same laboratory number and a
   distinct container index.
6. Record the requested tests. For each test, record the **method version** that is
   current and effective at the moment of receipt, and copy the **specification**
   associated with that method version onto the receipt record.
7. Record the storage condition required and transfer the material to storage per
   SOP-009. Record the transfer in the chain of custody.
8. Sign the receipt record and route it to the laboratory supervisor.
9. The laboratory supervisor verifies the laboratory number, the requested tests,
   and the specification copied at step 6, then signs.

## Records produced

| Record | Form | Held by |
| --- | --- | --- |
| Sample receipt record | Pre-printed receipt form, one per submission | Laboratory records file, by laboratory number |
| Laboratory number register | Bound sequential logbook | Sample receipt bench, retained permanently |
| Chain of custody record | Continuation form attached to the receipt record | Filed with the receipt record |
| Receipt discrepancy record | Raised only on exception; numbered separately | Quality Assurance |

## Signatures and what they mean

| Step | Signed by | Meaning of the signature |
| --- | --- | --- |
| 8 | Sample receipt coordinator | *I performed this receipt.* The material described is the material that arrived, the condition recorded is the condition observed, and the laboratory number was assigned from the controlled sequence. |
| 9 | Laboratory supervisor | *I verified this receipt.* The tests requested match the submission, and the specification recorded is the one in force for the method version named. This is a verification of the record, **not** a second inspection of the material. |
| 3 (exception) | Quality Assurance | *I accept this material for testing despite the discrepancy recorded.* |

## Storage

Receipt records are filed by laboratory number in the laboratory records file and
retained per the record-retention schedule. The laboratory number register is a
bound book and never leaves the receipt bench.

## Where a spreadsheet appears today

The laboratory number register is duplicated into a workbook so that sample status
can be filtered and reported. The workbook is the practical working copy; the bound
register is the record. **The two diverge.**

## Data contract with the result spine

Receipt emits, and the result spine consumes: `laboratory number`, `batch
identifier`, `container index`, `requested tests`, and — critically — **the
specification snapshot taken at step 6**. The snapshot is immutable for the life of
the sample. A later revision of the method version does not alter the criteria this
sample is judged against.
