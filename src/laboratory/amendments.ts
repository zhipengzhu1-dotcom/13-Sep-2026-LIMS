import type { CertificateSummary } from './certificate.ts';
import type { AuditEntry, AuditValue, Result, Sample } from './contracts.ts';
import { resultsView, testLabel, type RetestLineage } from './results.ts';

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

/** The Certificate version an Amendment replaces: the Published version it
 * started from, which is the latest Published one, since only a Published
 * Certificate can be amended and nothing is Published during an Amendment.
 * Null when no version was Published. */
export function replacedVersion(
  versions: readonly Pick<CertificateSummary, 'version' | 'publication'>[],
): number | null {
  return versions.filter((c) => c.publication).at(-1)?.version ?? null;
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
  /** Printed in the Result's row on the Certificate, so a lead names its
   * change even when one step made it. */
  row?: true;
}[] = [
  { path: 'value', label: 'Result', unit: 'test', row: true },
  { path: 'qualifier', label: 'qualifier', row: true },
  { path: 'limit.value', label: 'Limit', unit: 'ng/day', row: true },
  { path: 'conformity', label: 'Conformity statement', row: true },
  { path: 'analysedOn', label: 'analysis date', row: true },
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
 * shown. When a field changed in more than one step, the steps follow a lead
 * giving the change reported, e.g. `Result 20 → 21 ng/day: 20 → 22 (reason:
 * "typo"); 22 → 21 (reason: "recalculated")`. Null when no Result was
 * corrected.
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
    // What each step changed, field by field in the summarised order.
    const changed = steps.map(({ entries, retest }) =>
      summarised.flatMap((field) => {
        const own = entries.filter((e) => e.field === `result.${field.path}`);
        if (!own.length) return [];
        // A Retest is a new Result, so its entries have no old values: what
        // it replaced on the report is the Invalidated result it follows.
        const from = retest
          ? valueAt(retest.invalidated, field.path)
          : own[0].oldValue;
        const to = own.at(-1)!.newValue;
        return from === to ? [] : [{ ...field, from, to }];
      }),
    );
    const suffix = (unit?: string) =>
      unit === 'test' ? ` ${test.unit}` : unit ? ` ${unit}` : '';
    // A field changed in more than one step passed through values that were
    // never reported, so the summary leads with the change reported: from
    // the previous issued version to now, for each such field and each
    // field of the Certificate row. The Result always leads, even when it is
    // back where it was; another field only when its value on the report
    // changed, or when no field could lead otherwise.
    const across = (path: string) =>
      changed.flatMap((c) => c.filter((f) => f.path === path));
    const stepwise = summarised.some(({ path }) => across(path).length > 1);
    const lead = summarised.flatMap(({ path, label, unit, row }) => {
      const own = across(path);
      if (!stepwise || own.length < (row ? 1 : 2)) return [];
      const from = own[0].from;
      const to = own.at(-1)!.to;
      return [
        {
          path,
          from,
          to,
          text:
            from === to
              ? unit === 'replaced'
                ? `${label} unchanged`
                : `${label} unchanged at ${shown(from)}${suffix(unit)}`
              : unit === 'replaced'
                ? `${label} replaced`
                : `${label} ${shown(from)} → ${shown(to)}${suffix(unit)}`,
        },
      ];
    });
    const reported = lead.filter((f) => f.path === 'value' || f.from !== f.to);
    const leading = reported.length ? reported : lead;
    // Under a lead naming the Result, each step gives the Result's values
    // bare: its label and unit are in the lead.
    const bare = leading.some((f) => f.path === 'value');
    const step = ({ entries, retest }: (typeof steps)[number], i: number) => {
      const changes = changed[i].map(({ path, label, unit, from, to }) =>
        unit === 'replaced'
          ? `${label} replaced`
          : bare && path === 'value'
            ? `${shown(from)} → ${shown(to)}`
            : `${label} ${shown(from)} → ${shown(to)}${suffix(unit)}`,
      );
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
      `${testLabel(test)}: ${
        leading.length ? `${leading.map((f) => f.text).join(', ')}: ` : ''
      }${steps.map(step).join('; ')}`,
    ];
  });
  return clauses.length ? clauses.join('; ') : null;
}
