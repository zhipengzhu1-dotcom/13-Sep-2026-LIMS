import type { AuditEntry, AuditValue, Result, Sample } from './contracts.ts';
import { resultsView, type RetestLineage } from './results.ts';

/**
 * Amendments of published Certificates of Analysis. Pure and browser-safe: the
 * core reads the Amendment's reason and change summary from the audit trail
 * when it issues the next Certificate version, and the workspace uses the
 * same functions to show an Amendment in progress.
 *
 * An Amendment corrects Results the same way as before the first Approval:
 * each correction is a new Result with a reason, and the Result it replaces
 * stays on record. An Amendment may also correct a Result an OOS
 * investigation confirmed: the investigation stays on record, linked to the
 * Result it decided, and the correction is judged afresh, so one that still
 * does not comply needs its own investigation before re-approval. An open
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

/** Result fields a change summary names, in the order it names them. Only
 * reported content is named: a Retest's link to the OOS investigation it
 * follows (`result.retestAfter`) is on the audit trail but is no change to
 * the report, while the Retest's value is. */
const summarised: readonly {
  /** The Result field's path, as the audit trail names it after `result.`. */
  path: string;
  label: string;
  unit?: string;
}[] = [
  { path: 'value', label: 'Result', unit: 'test' },
  { path: 'qualifier', label: 'qualifier' },
  { path: 'limit.value', label: 'Limit', unit: 'ng/day' },
  { path: 'conformity', label: 'Conformity statement' },
  { path: 'instrumentReading', label: 'instrument reading', unit: 'ng/mL' },
  { path: 'sequenceId', label: 'sequence ID' },
  // A worksheet is named by an internal ID, so the summary says only that
  // it was replaced; the audit trail keeps both IDs.
  { path: 'attachmentId', label: 'worksheet', unit: 'replaced' },
];

/** A Result's value at `path`, as the audit trail writes it. */
const valueAt = (result: Result, path: string): AuditValue => {
  let value: unknown = result;
  for (const key of path.split('.'))
    value = (value as Record<string, unknown> | null)?.[key] ?? null;
  return value as AuditValue;
};

const shown = (value: AuditValue) => (value === null ? '—' : String(value));

/**
 * What an Amendment changed, from the Result entries written since it was
 * started: per corrected Test, each step in order. Every correction and every
 * Retest is a step of its own, never netted with the steps around it, so each
 * change shows its own reason and the Invalidated result's value is always
 * shown. Null when no Result was corrected.
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
    // Steps, one per command in the order they were recorded.
    const view = resultsView(sample);
    const steps: { entries: AuditEntry[]; retest?: RetestLineage }[] = [
      ...new Set(entries.map((e) => e.commandId)),
    ].map((commandId) => {
      const command = entries.filter((e) => e.commandId === commandId);
      return { entries: command, retest: view.retestRecordedBy(command) };
    });
    const step = ({ entries, retest }: (typeof steps)[number]) => {
      const changes = summarised.flatMap(({ path, label, unit }) => {
        const own = entries.filter((e) => e.field === `result.${path}`);
        if (!own.length) return [];
        // A Retest is a new Result, so its entries have no old values: what
        // it replaced on the report is the Invalidated result it follows.
        const from = retest
          ? valueAt(retest.invalidated, path)
          : own[0].oldValue;
        const to = own.at(-1)!.newValue;
        if (from === to) return [];
        if (unit === 'replaced') return [`${label} replaced`];
        const suffix =
          unit === 'test' ? ` ${test.unit}` : unit ? ` ${unit}` : '';
        return [`${label} ${shown(from)} → ${shown(to)}${suffix}`];
      });
      // A Retest cites the investigation it follows; then the reason typed
      // with the step, quoted, as the Analyst gave it.
      const typed = entries.find((e) => e.reason !== null)?.reason;
      const why = [
        ...(retest
          ? [
              `Retest after ${retest.investigation.id}, Invalidated: ${retest.investigation.assignableCause}`,
            ]
          : []),
        ...(typed === undefined || typed === null
          ? []
          : [`reason: "${typed}"`]),
      ];
      const reasons = why.length ? ` (${why.join('; ')})` : '';
      return `${changes.length ? changes.join(', ') : 're-entered unchanged'}${reasons}`;
    };
    return [
      `${test.analyteName} (${test.methodCode} v${test.methodVersion}): ${steps
        .map(step)
        .join('; ')}`,
    ];
  });
  return clauses.length ? clauses.join('; ') : null;
}
