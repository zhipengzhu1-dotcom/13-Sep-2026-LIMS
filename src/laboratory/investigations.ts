import type { Result, Sample, Test } from './contracts.ts';

/**
 * Out-of-specification (OOS) investigations. Pure and browser-safe: the core
 * enforces the Approval gate with these functions, and the workspace uses the
 * same ones to explain a blocked Approval and to list investigations.
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

/**
 * Why Approval is blocked by the OOS gate, or null when it is not: an open
 * investigation; a current `Does not comply` Result without a closed
 * investigation; or a Test whose Result was invalidated and has no retest yet.
 */
export function oosApprovalBlocker(sample: Sample): string | null {
  const open = sample.investigations.find((i) => i.status === 'Open');
  if (open)
    return `OOS investigation ${open.id} is open. Approval waits until it is closed.`;
  for (const test of sample.tests) {
    const current = test.results.find((r) => r.status === 'current');
    if (!current) {
      if (test.results.some((r) => r.status === 'invalidated'))
        return `A retest Result is required on ${testLabel(test)} before Approval.`;
      continue;
    }
    if (
      outOfSpecification(current) &&
      investigationOf(sample, current)?.status !== 'Closed'
    )
      return `The ${testLabel(test)} Result does not comply with its Limit. An OOS investigation must be opened and closed before Approval.`;
  }
  return null;
}

/** Whether an investigation confirmed the OOS and the Client has still to be
 * told of it. */
export const awaitingClientNotification = (i: OosInvestigation) =>
  i.outcome === 'Confirmed' && !i.clientNotification;

/**
 * Why Publishing is blocked by the OOS gate, or null when it is not: a
 * Confirmed OOS whose Client notification is not yet recorded.
 */
export function oosPublishBlocker(sample: Sample): string | null {
  const pending = sample.investigations.find(awaitingClientNotification);
  return pending
    ? `OOS investigation ${pending.id} confirmed an OOS. Record that the Client was informed before publishing.`
    : null;
}

/** One line of the Manager's OOS investigations list. */
export type OosRow = {
  sample: Sample;
  test: Test;
  result: Result;
  /** Absent when the Result still needs an investigation to be opened. */
  investigation: OosInvestigation | undefined;
};

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
