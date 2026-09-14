import { useState } from 'react';
import {
  auditEntriesWithin,
  type AuditEntry,
  type AuditValue,
  type Result,
  type Snapshot,
  type Test,
} from '../laboratory/contracts';
import { type Filter } from './register';
import { personName, stamp } from './shared';

export const COMMAND_LABELS: Record<string, string> = {
  receiveSubmission: 'Received',
  assign: 'Assigned',
  enterResult: 'Result entered',
  submitForApproval: 'Submitted',
  approve: 'Approved',
  return: 'Returned',
  openOosInvestigation: 'OOS investigation opened',
  recordLabErrorCheck: 'Lab error check recorded',
  concludeOosInvestigation: 'OOS investigation concluded',
  recordReceiptDeviation: 'Receipt deviation recorded',
  recordClientInstruction: 'Client instruction recorded',
  recordClientOosNotification: 'Client informed of confirmed OOS',
  publish: 'Published',
  startAmendment: 'Amendment started',
  appendAcceptableIntake: 'Acceptable intake entry added',
  storeAttachment: 'Worksheet uploaded',
};

/** The lab-wide audit trail, narrowed to a period of UTC calendar days. */
export function LabAuditTrail({ data }: { data: Snapshot }) {
  const [period, setPeriod] = useState({ from: '', to: '' });
  const entries = auditEntriesWithin(data.audit, period);
  return (
    <>
      <div
        className="refine"
        role="group"
        aria-label="Filter the audit trail by period"
      >
        <label>
          From (UTC)
          <input
            type="date"
            value={period.from}
            max={period.to || undefined}
            onChange={(e) => setPeriod({ ...period, from: e.target.value })}
          />
        </label>
        <label>
          To (UTC)
          <input
            type="date"
            value={period.to}
            min={period.from || undefined}
            onChange={(e) => setPeriod({ ...period, to: e.target.value })}
          />
        </label>
        {(period.from || period.to) && (
          <>
            <span className="dim">
              {entries.length} of {data.audit.length} entries
            </span>
            <button
              className="btn sm"
              onClick={() => setPeriod({ from: '', to: '' })}
            >
              Clear period
            </button>
          </>
        )}
      </div>
      <div className="scroll page">
        <AuditTable entries={entries} data={data} showSample />
      </div>
    </>
  );
}

export const auditValue = (value: AuditValue) =>
  value === null ? <span className="none">empty</span> : String(value);

/** A Test's record ID repeats its Sample, which the History tab already shows. */
export const recordLabel = (e: AuditEntry, showSample: boolean) =>
  e.recordType === 'Test' && !showSample
    ? `Test ${e.recordId.slice(e.recordId.indexOf('/') + 1)}`
    : `${e.recordType} ${e.recordId}`;

/** The audit trail, newest first, one group per command: who acted, when and
 * through which command, then each field it changed with the reason. */
export function AuditTable({
  entries,
  data,
  showSample = false,
}: {
  entries: AuditEntry[];
  data: Snapshot;
  showSample?: boolean;
}) {
  if (!entries.length) return <p className="blank">No audit entries yet.</p>;
  // Entries of one command are contiguous, because a command writes all of its
  // entries inside its own transaction.
  const commands: AuditEntry[][] = [];
  for (const e of entries) {
    const last = commands.at(-1);
    if (last && last[0].commandId === e.commandId) last.push(e);
    else commands.push([e]);
  }
  return (
    <table className="grid audit">
      <thead>
        <tr>
          <th>Record</th>
          <th>Field</th>
          <th>Old value</th>
          <th>New value</th>
          <th>Reason</th>
        </tr>
      </thead>
      {commands.map((group) => {
        const [first] = group;
        // Written in field order, so show them that way under the newest-first
        // command headings.
        const fields = [...group].reverse();
        return (
          <tbody key={first.commandId}>
            <tr className="audit-command">
              <th colSpan={5} scope="rowgroup">
                <time dateTime={first.at}>{stamp(first.at)}</time>
                <span className={'action a-' + first.commandType}>
                  {COMMAND_LABELS[first.commandType] ?? first.commandType}
                </span>
                <span>{personName(data, first.actor) ?? first.actor}</span>
                {showSample && (
                  <span className="num">
                    {[...new Set(group.map((e) => e.sampleId ?? e.recordId))]
                      .sort()
                      .join(', ')}
                  </span>
                )}
              </th>
            </tr>
            {fields.map((e) => (
              <tr key={e.sequence}>
                <td className="num nowrap">{recordLabel(e, showSample)}</td>
                <td className="num nowrap">{e.field}</td>
                <td className="wrap">{auditValue(e.oldValue)}</td>
                <td className="wrap">{auditValue(e.newValue)}</td>
                <td className="wrap">{e.reason}</td>
              </tr>
            ))}
          </tbody>
        );
      })}
    </table>
  );
}
