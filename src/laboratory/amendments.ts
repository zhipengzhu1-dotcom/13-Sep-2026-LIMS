import type { AuditEntry, AuditValue, Sample } from './contracts.ts';

/**
 * Amendments of published Certificates of Analysis. Pure and browser-safe: the
 * core reads the Amendment's reason and change summary from the audit trail
 * when it issues the next Certificate version, and the workspace uses the
 * same functions to show an Amendment in progress.
 *
 * An Amendment corrects Results the same way as before the first Approval:
 * each correction is a new Result with a reason, and the Result it replaces
 * stays on record. A Result decided by an OOS investigation is not corrected
 * around it in an Amendment either: a Confirmed OOS stands, and an open
 * investigation must be concluded first.
 */

/** The Amendment a Sample is in, or last went through, as started. */
export type AmendmentStart = {
  reason: string;
  startedBy: string;
  startedAt: string;
  /** The audit sequence of the start; later entries belong to the Amendment. */
  sequence: number;
};

/** The latest Amendment started on a Sample, from its audit history (in any
 * order), or null if none was ever started. */
export function amendmentOf(
  history: readonly AuditEntry[],
): AmendmentStart | null {
  let latest: AuditEntry | null = null;
  for (const e of history)
    if (
      e.commandType === 'startAmendment' &&
      e.field === 'status' &&
      (!latest || e.sequence > latest.sequence)
    )
      latest = e;
  return (
    latest && {
      reason: latest.reason ?? '',
      startedBy: latest.actor,
      startedAt: latest.at,
      sequence: latest.sequence,
    }
  );
}

/** Result fields a change summary names, in the order it names them. */
const summarised: readonly { field: string; label: string; unit?: string }[] = [
  { field: 'result.value', label: 'Result', unit: 'test' },
  { field: 'result.qualifier', label: 'qualifier' },
  { field: 'result.limit.value', label: 'Limit', unit: 'ng/day' },
  { field: 'result.conformity', label: 'Conformity statement' },
  {
    field: 'result.instrumentReading',
    label: 'instrument reading',
    unit: 'ng/mL',
  },
  { field: 'result.sequenceId', label: 'sequence ID' },
  // A worksheet is named by an internal ID, so the summary says only that
  // it was replaced; the audit trail keeps both IDs.
  { field: 'result.attachmentId', label: 'worksheet', unit: 'replaced' },
];

const shown = (value: AuditValue) => (value === null ? '—' : String(value));

/**
 * What an Amendment changed, from the Result entries written since it was
 * started: per corrected Test, each field's value before the first correction
 * → after the last, and the reasons given. Null when no Result was corrected.
 */
export function changeSummary(
  sample: Sample,
  history: readonly AuditEntry[],
): string | null {
  const start = amendmentOf(history);
  if (!start) return null;
  const corrections = history
    .filter(
      (e) =>
        e.sequence > start.sequence &&
        e.sampleId === sample.id &&
        e.recordType === 'Test' &&
        e.commandType === 'enterResult',
    )
    .sort((a, b) => a.sequence - b.sequence);
  const clauses = sample.tests.flatMap((test) => {
    const entries = corrections.filter(
      (e) => e.recordId === `${sample.id}/${test.id}`,
    );
    if (!entries.length) return [];
    const changes = summarised.flatMap(({ field, label, unit }) => {
      const own = entries.filter((e) => e.field === field);
      if (!own.length) return [];
      const from = own[0].oldValue;
      const to = own.at(-1)!.newValue;
      if (from === to) return [];
      if (unit === 'replaced') return [`${label} replaced`];
      const suffix = unit === 'test' ? ` ${test.unit}` : unit ? ` ${unit}` : '';
      return [`${label} ${shown(from)} → ${shown(to)}${suffix}`];
    });
    // Each correction's reason once, quoted, as the Analyst gave it.
    const reasons = [
      ...new Set(entries.map((e) => e.reason).filter((r) => r !== null)),
    ].map((r) => `"${r}"`);
    const why = reasons.length
      ? ` (${reasons.length > 1 ? 'reasons' : 'reason'}: ${reasons.join('; ')})`
      : '';
    return [
      `${test.analyteName} (${test.methodCode} v${test.methodVersion}): ${
        changes.length ? changes.join(', ') : 're-entered unchanged'
      }${why}`,
    ];
  });
  return clauses.length ? clauses.join('; ') : null;
}
