import {
  conformity,
  isFinishedProduct,
  qualify,
  type AcceptableIntake,
  type Result,
  type Sample,
  type Test,
} from './contracts.ts';
import type { Attachment } from './attachment-contracts.ts';
import { auditRecord, type Audit } from './audit-writer.ts';
import { WorkflowError } from './workflow-error.ts';

/**
 * The Result & OOS investigation module: a Result's life (first entry,
 * correction, invalidation, Retest) and the OOS investigation that decides a
 * Result over its Limit. Pure and browser-safe: the command handlers call its
 * commands after their role, assignment and lock checks, and the workspace
 * asks its questions, so a screen's reason and the server's refusal are the
 * same text.
 *
 * Questions are asked through `resultsView`, which recomputes on every access.
 * Each command asks its own question first and throws the answer, and checks
 * everything before it writes an audit entry or changes the Sample, so a
 * refused command leaves nothing behind.
 */

export type OosOutcome = 'Invalidated' | 'Confirmed';

/**
 * The recorded inquiry into one `Does not comply` Result, kept on its Sample.
 * Opened and closed by a Manager; the assigned Analyst records the laboratory
 * error check in between. Never deleted.
 */
export type OosInvestigation = {
  /** `OOS{yy}-{nnnn}`, from a per-year sequence; a placeholder format. */
  id: string;
  testId: string;
  /** The `sequence` of the Result under investigation within its Test. */
  resultSequence: number;
  status: 'Open' | 'Closed';
  openedBy: string;
  openedAt: string;
  /** The first-phase assessment, recorded once by the assigned Analyst. */
  labErrorCheck: {
    findings: string;
    /** Whether the Analyst identified a laboratory error. */
    errorIdentified: boolean;
    by: string;
    at: string;
  } | null;
  /** Set when the investigation is concluded and closed. */
  outcome: OosOutcome | null;
  /** Mandatory for `Invalidated`; null for `Confirmed`. */
  assignableCause: string | null;
  /** For `Invalidated`, true: the concluding Manager confirmed that the
   * laboratory error the check identified caused the value (ADR-0006). Null
   * while open and for `Confirmed`. */
  causationConfirmed: boolean | null;
  closedBy: string | null;
  closedAt: string | null;
  /** For a Confirmed OOS: the Coordinator's record that the Client was
   * informed, required before Publishing. Null until recorded. */
  clientNotification: {
    /** The person at the Client who was informed. */
    contact: string;
    /** When the Client was informed; never later than its recording. */
    notifiedAt: string;
    recordedBy: string;
    recordedAt: string;
  } | null;
};

/** What kind of rule refused an act. Screens use it for styling. */
export type RefusalCode =
  | 'investigation open'
  | 'investigation closed'
  | 'check pending'
  | 'OOS uninvestigated'
  | 'confirmed OOS'
  | 'retest required'
  | 'no laboratory error'
  | 'notification pending'
  | 'separation of duties';

/** A rule blocking an act right now. `reason` is exactly the text the
 * matching command refuses with. */
export type Refusal = {
  code: RefusalCode;
  reason: string;
  /** The investigation the refusal concerns, for a screen to link to. */
  investigationId: string | null;
};

/** The closed OOS investigation a Retest follows, and the Invalidated result
 * it decided on the same Test. */
export type RetestLineage = {
  investigation: OosInvestigation;
  invalidated: Result;
};

/** One Result on a Test's history, with the investigation that decided it
 * and, for a Retest, the investigation and Invalidated result it follows. */
export type ResultRecord = {
  result: Result;
  investigation: OosInvestigation | undefined;
  retestOf: RetestLineage | undefined;
};

/** An investigation as a Certificate of Analysis row lists it: its outcome
 * and the Result it decided, copied as reported. Never that Result's
 * Conformity statement, which a row takes from its current Result only. */
export type CertificateInvestigation = {
  id: string;
  outcome: OosOutcome;
  result: Pick<Result, 'value' | 'qualifier' | 'unit'>;
};

/** The questions asked of one Test. */
export type TestResults = {
  readonly test: Test;
  /** The Result the Test currently reports, if any. */
  readonly current: Result | undefined;
  /** Every Result ever entered, oldest first. */
  readonly history: readonly ResultRecord[];
  /** Whether the Test's Result was Invalidated and no Retest is recorded. */
  readonly retestRequired: boolean;
  /** While a Retest is required, the investigation it will follow and the
   * Invalidated result: the last one Invalidated on the Test. */
  readonly retestDue: RetestLineage | undefined;
  /** The closed investigations a Certificate of Analysis row for this Test
   * lists, each with the Result it decided, oldest Result first: an
   * Invalidated result a Retest follows, a Result an Amendment superseded,
   * or the current Result. */
  readonly certificateInvestigations: CertificateInvestigation[];
  /**
   * Why the Test's Result cannot be corrected now, or null (ADR-0006): it does
   * not comply and has no investigation, its investigation is open, it is a
   * confirmed OOS outside an Amendment, or it was Invalidated and the Test
   * calls for a Retest. `hasCertificate` is whether the Sample already has a
   * Certificate of Analysis, as it does in an Amendment. Recording a Result
   * refuses a correction with this reason; the Retest case has no current
   * Result to correct, so the command records a Retest instead.
   */
  correctionBlocker(options: { hasCertificate: boolean }): Refusal | null;
};

/** Where an investigation stands. */
export type InvestigationState = 'open' | 'invalidated' | 'confirmed';

/** The questions asked of one investigation. */
export type InvestigationResults = {
  readonly investigation: OosInvestigation;
  /** The Test and Result the investigation decides. */
  readonly test: Test;
  readonly result: Result;
  readonly state: InvestigationState;
  /** Why the investigation cannot be concluded with `outcome` now, or null.
   * The assignable cause is checked by the command, on its input. */
  concludeBlocker(outcome: OosOutcome): Refusal | null;
};

/** An act that counts as Bench work: the person's own work on a Result, or
 * their Laboratory error check of it (ADR-0005). Opening or concluding an
 * investigation is not Bench work. */
export type BenchWorkEntry =
  | {
      person: string;
      act: 'entered' | 'corrected' | 'retested';
      testId: string;
      resultSequence: number;
    }
  | {
      person: string;
      act: 'Laboratory error check';
      testId: string;
      investigationId: string;
    };

/** One line of the Manager's OOS investigations list. */
export type OosRow = {
  sample: Sample;
  test: Test;
  result: Result;
  /** Absent when the Result still needs an investigation to be opened. */
  investigation: OosInvestigation | undefined;
};

/** The questions asked of one Sample, answered from its state at the time of
 * asking. */
export type SampleResults = {
  readonly tests: readonly TestResults[];
  /** Refuses a Test the Sample does not have. */
  test(testId: string): TestResults;
  /** Refuses an investigation the Sample does not have. */
  investigation(id: string): InvestigationResults;
  /**
   * The first OOS rule blocking Approval, or null, in the order Approval
   * checks them: an open investigation; then, per Test, a Retest still
   * required or a current `Does not comply` Result without a closed
   * investigation.
   */
  readonly approvalBlocker: Refusal | null;
  /** A Confirmed OOS whose Client notification is not yet recorded. */
  readonly publishBlocker: Refusal | null;
  /** The Sample's lines of the OOS investigations list. */
  readonly oosRows: OosRow[];
  /** Every Result entered, corrected or retested on the Sample, of every
   * status, then every Laboratory error check recorded on that Test's
   * investigations; per Test, oldest first. */
  readonly benchWork: BenchWorkEntry[];
};

/** Who acts, when, and the audit writer their command's entries go to. */
export type Act = { actor: string; at: string; audit: Audit };

/** What recording a Result needs: the values entered, and what the handler
 * looked up for it. */
export type RecordResultInput = {
  testId: string;
  value: number;
  instrumentReading: number;
  sequenceId: string;
  /** Required for a correction; kept as given otherwise. */
  reason: string;
  /** The Acceptable intake entry in force now for the Test's Analyte. Used
   * only for a finished product. */
  limit: AcceptableIntake | null;
  /** The stored calculation worksheet, or null when it was not found. */
  worksheet: Pick<Attachment, 'id'> | null;
  /** Whether the Sample already has a Certificate of Analysis. */
  hasCertificate: boolean;
};

export type RecordedKind = 'first entry' | 'correction' | 'retest';

/** Whether a Result is out of specification and so needs an investigation. */
export const outOfSpecification = (result: Result) =>
  result.conformity === 'Does not comply';

/** The investigation linked to a Result, if any. */
export function investigationOf(
  sample: Sample,
  result: Result,
): OosInvestigation | undefined {
  return result.investigationId === null
    ? undefined
    : sample.investigations.find((i) => i.id === result.investigationId);
}

const testLabel = (t: Test) => `${t.analyteName} (${t.methodCode})`;

/** The investigation `id` and the Result it decided. The module writes the
 * link, so a broken one is a programming error rather than a refusal. */
function lineageOf(sample: Sample, id: string): RetestLineage {
  const investigation = sample.investigations.find((i) => i.id === id);
  const invalidated = sample.tests
    .find((t) => t.id === investigation?.testId)
    ?.results.find((r) => r.sequence === investigation?.resultSequence);
  if (!investigation || !invalidated)
    throw new Error(`Retest link ${id} names no Invalidated result.`);
  return { investigation, invalidated };
}

/**
 * A Retest's lineage as the Test sheet shows it, e.g. "Retest after
 * OOS26-0003 · Invalidated result #1, 31.2 ng/day". A `< LOD` or `< LOQ`
 * value is shown with its bound, as the Certificate of Analysis reports it.
 */
export function retestLabel(
  test: Pick<Test, 'lod' | 'loq'>,
  { investigation, invalidated: r }: RetestLineage,
) {
  const value =
    r.qualifier === '< LOD'
      ? `< LOD (${test.lod})`
      : r.qualifier === '< LOQ'
        ? `< LOQ (${test.loq})`
        : String(r.value);
  return `Retest after ${investigation.id} · Invalidated result #${r.sequence}, ${value} ${r.unit}`;
}

export function resultsView(sample: Sample): SampleResults {
  const testResults = (test: Test): TestResults => ({
    test,
    get current() {
      return test.results.find((r) => r.status === 'current');
    },
    get history() {
      return test.results.map((result) => ({
        result,
        investigation: investigationOf(sample, result),
        retestOf: result.retestAfter
          ? lineageOf(sample, result.retestAfter)
          : undefined,
      }));
    },
    get retestRequired() {
      return (
        !this.current && test.results.some((r) => r.status === 'invalidated')
      );
    },
    get retestDue() {
      if (this.current) return undefined;
      const last = test.results.findLast((r) => r.status === 'invalidated');
      return last?.investigationId
        ? lineageOf(sample, last.investigationId)
        : undefined;
    },
    get certificateInvestigations() {
      // Follow each Result's own link, so a label always names the value its
      // investigation decided, whatever the Test reports now.
      return test.results.flatMap((r): CertificateInvestigation[] => {
        const i = investigationOf(sample, r);
        return i?.status === 'Closed' && i.outcome
          ? [
              {
                id: i.id,
                outcome: i.outcome,
                result: {
                  value: r.value,
                  qualifier: r.qualifier,
                  unit: r.unit,
                },
              },
            ]
          : [];
      });
    },
    correctionBlocker({ hasCertificate }) {
      const current = this.current;
      if (!current) {
        // An Invalidated result is never corrected: the Test calls for a
        // Retest, which keeps it on record.
        const due = this.retestDue;
        if (!due) return null;
        const id = due.investigation.id;
        return {
          code: 'retest required',
          reason: `Result #${due.invalidated.sequence} was Invalidated by OOS investigation ${id}, so it cannot be corrected. Enter a Retest instead.`,
          investigationId: id,
        };
      }
      // A Result over its Limit is decided only by its OOS investigation
      // (ADR-0006), so it is never corrected before one is opened.
      const investigation = investigationOf(sample, current);
      if (!investigation)
        return outOfSpecification(current)
          ? {
              code: 'OOS uninvestigated',
              reason:
                'This Result does not comply with its Limit and has no OOS investigation, so it cannot be corrected.',
              investigationId: null,
            }
          : null;
      // An open investigation must be concluded first, and a confirmed OOS
      // stands until an Amendment of its published Certificate corrects it;
      // the corrected value is then judged afresh.
      if (investigation.status === 'Open')
        return {
          code: 'investigation open',
          reason: `OOS investigation ${investigation.id} is open on this Result, so it cannot be corrected.`,
          investigationId: investigation.id,
        };
      if (!hasCertificate)
        return {
          code: 'confirmed OOS',
          reason: `This Result is a confirmed OOS (${investigation.id}) and cannot be corrected.`,
          investigationId: investigation.id,
        };
      return null;
    },
  });

  const investigationResults = (
    investigation: OosInvestigation,
  ): InvestigationResults => {
    // The module writes both halves of the link, so a broken one is a
    // programming error rather than a refusal.
    const test = sample.tests.find((t) => t.id === investigation.testId);
    const result = test?.results.find(
      (r) => r.sequence === investigation.resultSequence,
    );
    if (!test || !result)
      throw new Error(
        `OOS investigation ${investigation.id} has no Result ${investigation.testId} #${investigation.resultSequence}.`,
      );
    return {
      investigation,
      test,
      result,
      get state() {
        if (investigation.status === 'Open') return 'open';
        return investigation.outcome === 'Invalidated'
          ? 'invalidated'
          : 'confirmed';
      },
      concludeBlocker(outcome) {
        if (investigation.status !== 'Open')
          return {
            code: 'investigation closed',
            reason: `OOS investigation ${investigation.id} is already closed.`,
            investigationId: investigation.id,
          };
        if (!investigation.labErrorCheck)
          return {
            code: 'check pending',
            reason:
              'The assigned analyst must record the laboratory error check before the investigation is concluded.',
            investigationId: investigation.id,
          };
        if (
          outcome === 'Invalidated' &&
          !investigation.labErrorCheck.errorIdentified
        )
          return {
            code: 'no laboratory error',
            reason:
              'The laboratory error check identified no laboratory error, so the Result cannot be Invalidated.',
            investigationId: investigation.id,
          };
        return null;
      },
    };
  };

  return {
    get tests() {
      return sample.tests.map(testResults);
    },
    test(testId) {
      const test = sample.tests.find((t) => t.id === testId);
      if (!test) throw new WorkflowError('Test not found.');
      return testResults(test);
    },
    investigation(id) {
      const investigation = sample.investigations.find((i) => i.id === id);
      if (!investigation)
        throw new WorkflowError('OOS investigation not found.');
      return investigationResults(investigation);
    },
    get approvalBlocker(): Refusal | null {
      const open = sample.investigations.find((i) => i.status === 'Open');
      if (open)
        return {
          code: 'investigation open',
          reason: `OOS investigation ${open.id} is open. Approval waits until it is closed.`,
          investigationId: open.id,
        };
      for (const t of this.tests) {
        if (t.retestRequired) {
          const invalidated = t.history.findLast(
            (h) => h.result.status === 'invalidated',
          );
          return {
            code: 'retest required',
            reason: `A retest Result is required on ${testLabel(t.test)} before Approval.`,
            investigationId: invalidated?.investigation?.id ?? null,
          };
        }
        const current = t.current;
        if (
          current &&
          outOfSpecification(current) &&
          investigationOf(sample, current)?.status !== 'Closed'
        )
          return {
            code: 'OOS uninvestigated',
            reason: `The ${testLabel(t.test)} Result does not comply with its Limit. An OOS investigation must be opened and closed before Approval.`,
            investigationId: null,
          };
      }
      return null;
    },
    get publishBlocker(): Refusal | null {
      const pending = sample.investigations.find(
        (i) => i.outcome === 'Confirmed' && !i.clientNotification,
      );
      return pending
        ? {
            code: 'notification pending',
            reason: `OOS investigation ${pending.id} confirmed an OOS. Record that the Client was informed before publishing.`,
            investigationId: pending.id,
          }
        : null;
    },
    get oosRows() {
      return oosRows([sample]);
    },
    get benchWork() {
      return sample.tests.flatMap((test) => [
        ...test.results.map((result, i): BenchWorkEntry => {
          // A Result replaced the one before it: a superseded one by
          // correction, an invalidated one by Retest.
          const before = test.results[i - 1];
          return {
            person: result.enteredBy,
            act: !before
              ? 'entered'
              : before.status === 'invalidated'
                ? 'retested'
                : 'corrected',
            testId: test.id,
            resultSequence: result.sequence,
          };
        }),
        // The check is the Analyst's own review of the bench work (ADR-0005).
        ...sample.investigations.flatMap((i): BenchWorkEntry[] =>
          i.testId === test.id && i.labErrorCheck
            ? [
                {
                  person: i.labErrorCheck.by,
                  act: 'Laboratory error check',
                  testId: test.id,
                  investigationId: i.id,
                },
              ]
            : [],
        ),
      ]);
    },
  };
}

/**
 * Every investigation in the lab, plus every current out-of-specification
 * Result still waiting for one; those needing action (required, then open)
 * first, each group oldest first.
 */
export function oosRows(samples: readonly Sample[]): OosRow[] {
  const rows: OosRow[] = [];
  for (const sample of samples)
    for (const test of sample.tests)
      for (const result of test.results) {
        const investigation = investigationOf(sample, result);
        if (
          investigation ||
          (result.status === 'current' && outOfSpecification(result))
        )
          rows.push({ sample, test, result, investigation });
      }
  const rank = (r: OosRow) =>
    !r.investigation ? 0 : r.investigation.status === 'Open' ? 1 : 2;
  const since = (r: OosRow) => r.investigation?.openedAt ?? r.result.enteredAt;
  return rows.sort(
    (a, b) => rank(a) - rank(b) || since(a).localeCompare(since(b)),
  );
}

/** The Approval blocker's reason, or null. */
export const oosApprovalBlocker = (sample: Sample) =>
  resultsView(sample).approvalBlocker?.reason ?? null;

/** The Publish blocker's reason, or null. */
export const oosPublishBlocker = (sample: Sample) =>
  resultsView(sample).publishBlocker?.reason ?? null;

/**
 * The separation-of-duties refusal of Approval, naming the approver's Bench
 * work `entry` (ADR-0003, ADR-0004, ADR-0005). Approval decides whether the
 * approver did Bench work and refuses with this reason, and the Approve
 * control shows the same text; callers pass the approver's first entry.
 */
export function separationOfDutiesRefusal(
  sample: Sample,
  entry: BenchWorkEntry,
): Refusal {
  const then = 'so another Manager must give Approval.';
  if (entry.act === 'Laboratory error check')
    return {
      code: 'separation of duties',
      reason: `You recorded the Laboratory error check for ${entry.investigationId}, ${then}`,
      investigationId: entry.investigationId,
    };
  const label = testLabel(resultsView(sample).test(entry.testId).test);
  const did =
    entry.act === 'retested'
      ? `retested ${label}`
      : `${entry.act} a Result on ${label}`;
  return {
    code: 'separation of duties',
    reason: `You ${did}, ${then}`,
    investigationId: null,
  };
}

/** Whether a person did Bench work on the Sample. */
export const enteredResultOn = (sample: Sample, person: string) =>
  resultsView(sample).benchWork.some((e) => e.person === person);

/**
 * Records a Result on a Test: a first entry, a correction superseding the
 * current Result, or a Retest after an Invalidated result. Returns which it
 * was. A correction needs a reason; a finished product is judged against the
 * Limit in force, and the corrected Result is judged afresh while any
 * investigation stays on record, linked to the Result it decided.
 */
export function recordResult(
  sample: Sample,
  input: RecordResultInput,
  { actor, at, audit }: Act,
): RecordedKind {
  const view = resultsView(sample).test(input.testId);
  const { test } = view;
  const previous = view.current;
  // Only a correction supersedes a Result; without a current one this is a
  // first entry or a Retest, which the blocker does not stop.
  if (previous) {
    const blocked = view.correctionBlocker(input);
    if (blocked) throw new WorkflowError(blocked.reason);
  }
  if (previous && input.reason.length < 3)
    throw new WorkflowError('Give a reason for changing the Result.');
  // Finished products are judged against the entry in force now; raw
  // materials have no Limit.
  const finished = isFinishedProduct(sample.materialType);
  const limit = finished ? input.limit : null;
  if (finished && !limit)
    throw new WorkflowError(
      `No Acceptable intake is in force for ${test.analyteName}.`,
    );
  // The attachment record holds the filename and SHA-256, so the trail names
  // only its id.
  if (!input.worksheet)
    throw new WorkflowError(
      'The worksheet attachment was not found. Upload the calculation worksheet again.',
    );
  // A Retest follows the investigation that Invalidated the last Result, and
  // needs no reason of its own: that investigation's assignable cause stands.
  const due = previous ? undefined : view.retestDue;
  const kind: RecordedKind = previous
    ? 'correction'
    : due
      ? 'retest'
      : 'first entry';
  // The unit and LOD/LOQ come from the Test, which took them from the
  // Material type at receipt; the qualifier is never entered.
  const qualifier = qualify(input.value, test);
  const next: Result = {
    sequence: test.results.length + 1,
    status: 'current',
    value: input.value,
    unit: test.unit,
    qualifier,
    instrumentReading: input.instrumentReading,
    sequenceId: input.sequenceId,
    attachmentId: input.worksheet.id,
    enteredBy: actor,
    enteredAt: at,
    reason: input.reason,
    limit,
    conformity: conformity({ value: input.value, qualifier }, test, limit),
    investigationId: null,
    retestAfter: due ? due.investigation.id : null,
  };
  // The actor, time and reason are the entry's own columns, and the sequence
  // and status only say which Result is current, so only the Result's content
  // is compared, field by field, with the Result it replaces: the current one
  // for a correction, the Invalidated result for a Retest. The Retest link is
  // compared like any field, so it is on the trail; an Amendment's change
  // summary leaves it out because it names only reported fields. The Limit is a copy
  // of reference data, so the trail names its entry and value rather than
  // every field of the source it was published in.
  const audited = (r: Result) => ({
    result: {
      ...r,
      limit: r.limit && { entry: r.limit.id, value: r.limit.value },
    },
  });
  const record = auditRecord.test(sample, test);
  const reason = input.reason;
  const replaced = previous ?? due?.invalidated;
  const changed = audit.compare(
    record,
    replaced ? audited(replaced) : null,
    audited(next),
    {
      reason,
      omit: [
        'result.sequence',
        'result.status',
        'result.enteredBy',
        'result.enteredAt',
        'result.reason',
        'result.investigationId',
      ],
    },
  );
  // Re-entering an unchanged value is still an act the trail must show.
  if (!changed)
    audit.change(record, 'result.value', replaced!.value, next.value, reason);
  if (previous) previous.status = 'superseded';
  test.results.push(next);
  return kind;
}

/** What opening an investigation needs: the Test, and the next number of the
 * per-year investigation sequence, taken only once every check has passed. */
export type OpenInvestigationInput = {
  testId: string;
  allocate: () => number;
};

/**
 * Opens an OOS investigation on a Test's current `Does not comply` Result,
 * linking the Result to it. Each such Result has exactly one investigation.
 */
export function openInvestigation(
  sample: Sample,
  { testId, allocate }: OpenInvestigationInput,
  { actor, at, audit }: Act,
): OosInvestigation {
  const { test, current: result } = resultsView(sample).test(testId);
  if (!result || !outOfSpecification(result))
    throw new WorkflowError(
      'Only a current Result that does not comply with its Limit needs an OOS investigation.',
    );
  if (result.investigationId)
    throw new WorkflowError(
      `This Result already has OOS investigation ${result.investigationId}.`,
    );
  const investigation: OosInvestigation = {
    id: `OOS${at.slice(2, 4)}-${String(allocate()).padStart(4, '0')}`,
    testId: test.id,
    resultSequence: result.sequence,
    status: 'Open',
    openedBy: actor,
    openedAt: at,
    labErrorCheck: null,
    outcome: null,
    assignableCause: null,
    causationConfirmed: null,
    closedBy: null,
    closedAt: null,
    clientNotification: null,
  };
  audit.compare(
    auditRecord.investigation(sample, investigation),
    null,
    investigation,
    { omit: ['id'] },
  );
  audit.change(
    auditRecord.test(sample, test),
    'result.investigationId',
    null,
    investigation.id,
  );
  result.investigationId = investigation.id;
  sample.investigations.push(investigation);
  return investigation;
}

export type LabErrorCheckInput = {
  investigationId: string;
  findings: string;
  errorIdentified: boolean;
};

/** Records the assigned Analyst's Laboratory error check, once, on an open
 * investigation. */
export function recordLabErrorCheck(
  sample: Sample,
  { investigationId, findings, errorIdentified }: LabErrorCheckInput,
  { actor, at, audit }: Act,
) {
  const view = resultsView(sample).investigation(investigationId);
  const { investigation } = view;
  if (investigation.status !== 'Open')
    throw new WorkflowError(view.concludeBlocker('Confirmed')!.reason);
  if (investigation.labErrorCheck)
    throw new WorkflowError(
      'The laboratory error check is already recorded for this investigation.',
    );
  const check = { findings, errorIdentified, by: actor, at };
  audit.compare(auditRecord.investigation(sample, investigation), null, {
    labErrorCheck: check,
  });
  investigation.labErrorCheck = check;
}

export type ConcludeInput = {
  investigationId: string;
  outcome: OosOutcome;
  /** Required for Invalidated; must be empty for Confirmed. */
  assignableCause: string;
  /** The Manager's confirmation that the laboratory error the check
   * identified caused the value. Required for Invalidated; must be false for
   * Confirmed. */
  causationConfirmed: boolean;
};

/**
 * Concludes and closes an investigation. Invalidated needs the error the
 * Laboratory error check identified, the Manager's confirmation that it caused
 * the value, and the assignable cause; it marks the Result invalidated, so the
 * Test then needs a Retest. Confirmed takes neither and leaves the Result
 * current, whatever the check found. Not signed (ADR-0006): the audit trail
 * attributes the conclusion to the Manager.
 */
export function concludeInvestigation(
  sample: Sample,
  {
    investigationId,
    outcome,
    assignableCause,
    causationConfirmed,
  }: ConcludeInput,
  { actor, at, audit }: Act,
) {
  const view = resultsView(sample).investigation(investigationId);
  const blocked = view.concludeBlocker(outcome);
  if (blocked) throw new WorkflowError(blocked.reason);
  const invalidated = outcome === 'Invalidated';
  if (invalidated && !causationConfirmed)
    throw new WorkflowError(
      'Confirm that the laboratory error the check identified caused the value before invalidating the Result.',
    );
  if (invalidated && assignableCause.length < 3)
    throw new WorkflowError(
      'Give the assignable cause for invalidating the Result.',
    );
  if (!invalidated && assignableCause)
    throw new WorkflowError(
      'A confirmed OOS has no assignable cause. Choose Invalidated to record one.',
    );
  if (!invalidated && causationConfirmed)
    throw new WorkflowError(
      'A confirmed OOS has no laboratory error confirmed as its cause. Choose Invalidated to confirm one.',
    );
  const { investigation, test, result } = view;
  const record = auditRecord.investigation(sample, investigation);
  const cause = invalidated ? assignableCause : null;
  audit.set(record, investigation, 'outcome', outcome);
  audit.set(record, investigation, 'assignableCause', cause);
  audit.set(
    record,
    investigation,
    'causationConfirmed',
    invalidated ? true : null,
  );
  audit.set(record, investigation, 'status', 'Closed');
  audit.set(record, investigation, 'closedBy', actor);
  audit.set(record, investigation, 'closedAt', at);
  if (invalidated) {
    // The Result stays on record, marked by its investigation; the Test now
    // needs a Retest.
    audit.change(
      auditRecord.test(sample, test),
      'result.status',
      result.status,
      'invalidated',
      assignableCause,
    );
    result.status = 'invalidated';
  }
}

export type ClientNotificationInput = {
  investigationId: string;
  contact: string;
  /**
   * When the Client was informed, as an instant. The handler checks it is
   * not later than the time of saving; the module asks for it only once its
   * own rules pass, so the first refusal stays in today's order.
   */
  notifiedAt: () => string;
};

/** Records that the Client was informed of a Confirmed OOS, once, no earlier
 * than the investigation was concluded. */
export function recordClientNotification(
  sample: Sample,
  { investigationId, contact, notifiedAt: instant }: ClientNotificationInput,
  { actor, at, audit }: Act,
) {
  const { investigation } = resultsView(sample).investigation(investigationId);
  if (investigation.outcome !== 'Confirmed')
    throw new WorkflowError(
      'Client notification is recorded only for a confirmed OOS.',
    );
  if (investigation.clientNotification)
    throw new WorkflowError(
      `The Client notification for ${investigation.id} is already recorded.`,
    );
  const notifiedAt = instant();
  if (notifiedAt < investigation.closedAt!)
    throw new WorkflowError(
      'The Client cannot have been informed of a confirmed OOS before the investigation was concluded.',
    );
  const notification = { contact, notifiedAt };
  audit.compare(auditRecord.investigation(sample, investigation), null, {
    clientNotification: notification,
  });
  investigation.clientNotification = {
    ...notification,
    recordedBy: actor,
    recordedAt: at,
  };
}
