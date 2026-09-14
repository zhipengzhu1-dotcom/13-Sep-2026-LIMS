import {
  conformity,
  investigationOf,
  isFinishedProduct,
  qualify,
  type AcceptableIntake,
  type OosInvestigation,
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

/** What kind of rule refused an act. Screens use it for styling. */
export type RefusalCode =
  | 'investigation open'
  | 'OOS uninvestigated'
  | 'confirmed OOS'
  | 'retest required'
  | 'no laboratory error'
  | 'notification pending';

/** A rule blocking an act right now. `reason` is exactly the text the
 * matching command refuses with. */
export type Refusal = {
  code: RefusalCode;
  reason: string;
  /** The investigation the refusal concerns, for a screen to link to. */
  investigationId: string | null;
};

/** One Result on a Test's history, with the investigation that decided it. */
export type ResultRecord = {
  result: Result;
  investigation: OosInvestigation | undefined;
};

/** The questions asked of one Test. */
export type TestResults = {
  readonly test: Test;
  /** The Result the Test currently reports, if any. */
  readonly current: Result | undefined;
  /** Every Result ever entered, oldest first. */
  readonly history: readonly ResultRecord[];
  /**
   * Why the current Result cannot be corrected now, or null. `hasCertificate`
   * is whether the Sample already has a Certificate of Analysis, as it does
   * in an Amendment.
   */
  correctionBlocker(options: { hasCertificate: boolean }): Refusal | null;
};

/** The questions asked of one Sample, answered from its state at the time of
 * asking. */
export type SampleResults = {
  readonly tests: readonly TestResults[];
  /** Refuses a Test the Sample does not have. */
  test(testId: string): TestResults;
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
      }));
    },
    correctionBlocker({ hasCertificate }) {
      const current = this.current;
      const investigation = current && investigationOf(sample, current);
      if (!investigation) return null;
      // An investigated Result is decided by its investigation, never
      // corrected around it: an open one must be concluded first, and a
      // confirmed OOS stands until an Amendment of its published Certificate
      // corrects it (see amendments.ts).
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
  return {
    get tests() {
      return sample.tests.map(testResults);
    },
    test(testId) {
      const test = sample.tests.find((t) => t.id === testId);
      if (!test) throw new WorkflowError('Test not found.');
      return testResults(test);
    },
  };
}

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
  const blocked = view.correctionBlocker(input);
  if (blocked) throw new WorkflowError(blocked.reason);
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
  const kind: RecordedKind = previous
    ? 'correction'
    : test.results.some((r) => r.status === 'invalidated')
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
  };
  // The actor, time and reason are the entry's own columns, and the sequence
  // and status only say which Result is current, so only the Result's content
  // is compared, field by field, with the current Result. The Limit is a copy
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
  const changed = audit.compare(
    record,
    previous ? audited(previous) : null,
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
    audit.change(record, 'result.value', previous!.value, next.value, reason);
  if (previous) previous.status = 'superseded';
  test.results.push(next);
  return kind;
}
