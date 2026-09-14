import { useState } from 'react';
import {
  actsAs,
  type Result,
  type Snapshot,
  type Sample,
} from '../laboratory/contracts';
import {
  investigationOf,
  oosRows,
  outOfSpecification,
  resultsView,
  type OosInvestigation,
  type OosRow,
} from '../laboratory/results';
import { localDateTime } from './receiving';
import { ResultValue } from './results';
import { closed, type Execute, personName, stamp, Status } from './shared';

/** Where an out-of-specification Result stands in its investigation. */
export function investigationLabel(
  investigation: OosInvestigation | undefined,
) {
  if (!investigation) return 'Investigation required';
  if (investigation.status === 'Open') return 'Investigation open';
  return investigation.outcome === 'Invalidated'
    ? 'Invalidated'
    : 'Confirmed OOS';
}

export const investigationClass = (
  investigation: OosInvestigation | undefined,
) =>
  'oos-status ' +
  (!investigation
    ? 'required'
    : investigation.status === 'Open'
      ? 'open'
      : (investigation.outcome ?? '').toLowerCase());

/** Flags a current Result that is out of specification, with its
 * investigation reference once one is opened. */
export function OosNote({
  sample,
  result,
}: {
  sample: Sample;
  result: Result;
}) {
  if (!outOfSpecification(result) && !result.investigationId) return null;
  const investigation = investigationOf(sample, result);
  return (
    <span className="sub">
      <span className={investigationClass(investigation)}>
        {investigationLabel(investigation)}
      </span>{' '}
      {investigation && <span className="num">{investigation.id}</span>}
    </span>
  );
}

/** The Sample's OOS investigations: each out-of-specification Result with its
 * investigation, and the step the signed-in user can take next. */
export function Investigations({
  sample: s,
  data,
  actor,
  busy,
  execute,
}: {
  sample: Sample;
  data: Snapshot;
  actor: string;
  busy: boolean;
  execute: Execute;
}) {
  const results = resultsView(s);
  const rows = results.oosRows;
  if (!rows.length) return null;
  const person = data.people.find((p) => p.id === actor)!;
  const manager =
    actsAs(person, 'manager') && !['Approved', 'Published'].includes(s.status);
  // Recording that the Client was informed stays open until Publishing.
  const coordinator =
    actsAs(person, 'coordinator') &&
    !['Published', 'Withdrawn'].includes(s.status);
  const target = { sampleId: s.id, revision: s.revision };
  return (
    <section className="investigations" aria-label="OOS investigations">
      <h3>OOS investigations</h3>
      <ul>
        {rows.map(({ test: t, result: r, investigation: inv }) => (
          <li key={`${t.id}-${r.sequence}`}>
            <div className="inv-head">
              <strong className="num">{inv?.id ?? 'Not opened'}</strong>
              <span className={investigationClass(inv)}>
                {investigationLabel(inv)}
              </span>
              <span>
                {t.analyteName} · {t.methodCode} v{t.methodVersion} · Result #
                {r.sequence}
              </span>
              <ResultValue result={r} />
              {r.limit && (
                <span className="dim num">Limit {r.limit.value} ng/day</span>
              )}
            </div>
            {!inv ? (
              manager ? (
                <div className="inv-step">
                  <span className="dim">
                    This Result does not comply with its Limit. Approval waits
                    for a closed investigation.
                  </span>
                  <button
                    className="btn sm primary"
                    disabled={busy}
                    onClick={() =>
                      void execute({
                        type: 'openOosInvestigation',
                        ...target,
                        testId: t.id,
                      })
                    }
                  >
                    Open investigation
                  </button>
                </div>
              ) : (
                <p className="inv-step dim">
                  A Manager opens the OOS investigation.
                </p>
              )
            ) : (
              <dl className="inv-detail">
                <div>
                  <dt>Opened</dt>
                  <dd>
                    {personName(data, inv.openedBy)}, {stamp(inv.openedAt)}
                  </dd>
                </div>
                <div>
                  <dt>Laboratory error check</dt>
                  <dd>
                    {inv.labErrorCheck ? (
                      <>
                        <strong>
                          {inv.labErrorCheck.errorIdentified
                            ? 'Laboratory error identified.'
                            : 'No laboratory error identified.'}
                        </strong>{' '}
                        {inv.labErrorCheck.findings}{' '}
                        <span className="dim">
                          {personName(data, inv.labErrorCheck.by)},{' '}
                          {stamp(inv.labErrorCheck.at)}
                        </span>
                      </>
                    ) : inv.status === 'Open' && s.assignee === actor ? (
                      <form
                        className="inv-form"
                        onSubmit={(e) => {
                          e.preventDefault();
                          const f = new FormData(e.currentTarget);
                          void execute({
                            type: 'recordLabErrorCheck',
                            ...target,
                            investigationId: inv.id,
                            findings: String(f.get('findings')),
                            errorIdentified: f.get('errorIdentified') === 'on',
                          });
                        }}
                      >
                        <textarea
                          name="findings"
                          aria-label="Laboratory error check findings"
                          required
                          minLength={3}
                          maxLength={2000}
                          rows={2}
                          placeholder="Calculations, standards, instrument, sample preparation checked"
                        />
                        <label className="check">
                          <input type="checkbox" name="errorIdentified" />A
                          laboratory error was identified
                        </label>
                        <button className="btn sm primary" disabled={busy}>
                          Record check
                        </button>
                      </form>
                    ) : (
                      <span className="dim">
                        Awaiting {personName(data, s.assignee) ?? 'the analyst'}
                        .
                      </span>
                    )}
                  </dd>
                </div>
                <div>
                  <dt>Conclusion</dt>
                  <dd>
                    {inv.status === 'Closed' ? (
                      <>
                        <strong>{inv.outcome}</strong>
                        {inv.assignableCause &&
                          `. Assignable cause: ${inv.assignableCause}`}{' '}
                        <span className="dim">
                          Closed by {personName(data, inv.closedBy)},{' '}
                          {stamp(inv.closedAt!)}
                        </span>
                        {inv.outcome === 'Invalidated' &&
                          results.test(t.id).retestRequired && (
                            <span className="oos-note">
                              {' '}
                              A retest Result is required on this Test.
                            </span>
                          )}
                      </>
                    ) : manager && inv.labErrorCheck ? (
                      <ConcludeForm
                        investigation={inv}
                        busy={busy}
                        onConclude={(outcome, assignableCause) =>
                          void execute({
                            type: 'concludeOosInvestigation',
                            ...target,
                            investigationId: inv.id,
                            outcome,
                            assignableCause,
                          })
                        }
                      />
                    ) : (
                      <span className="dim">
                        {inv.labErrorCheck
                          ? 'A Manager concludes and closes the investigation.'
                          : 'Concluded by a Manager after the laboratory error check.'}
                      </span>
                    )}
                  </dd>
                </div>
                {inv.outcome === 'Confirmed' && (
                  <div>
                    <dt>Client informed</dt>
                    <dd>
                      {inv.clientNotification ? (
                        <>
                          {inv.clientNotification.contact},{' '}
                          {stamp(inv.clientNotification.notifiedAt)}{' '}
                          <span className="dim">
                            recorded by{' '}
                            {personName(
                              data,
                              inv.clientNotification.recordedBy,
                            )}
                            , {stamp(inv.clientNotification.recordedAt)}
                          </span>
                        </>
                      ) : coordinator ? (
                        <form
                          className="inv-form"
                          aria-label="Record that the Client was informed"
                          onSubmit={(e) => {
                            e.preventDefault();
                            const f = new FormData(e.currentTarget);
                            const when = String(f.get('notifiedAt') ?? '');
                            void execute({
                              type: 'recordClientOosNotification',
                              ...target,
                              investigationId: inv.id,
                              contact: String(f.get('contact') ?? '').trim(),
                              notifiedAt: when
                                ? new Date(when).toISOString()
                                : '',
                            });
                          }}
                        >
                          <input
                            name="contact"
                            aria-label="Client contact who was informed"
                            required
                            maxLength={200}
                            placeholder="Name and role at the Client"
                          />
                          <input
                            type="datetime-local"
                            name="notifiedAt"
                            aria-label="When the Client was informed"
                            required
                            max={localDateTime(new Date())}
                            defaultValue={localDateTime(new Date())}
                          />
                          <button className="btn sm primary" disabled={busy}>
                            Record Client informed
                          </button>
                        </form>
                      ) : (
                        <span className="oos-note">
                          Not yet recorded. The Coordinator records it before
                          publishing.
                        </span>
                      )}
                    </dd>
                  </div>
                )}
              </dl>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function ConcludeForm({
  investigation,
  busy,
  onConclude,
}: {
  investigation: OosInvestigation;
  busy: boolean;
  onConclude: (
    outcome: 'Invalidated' | 'Confirmed',
    assignableCause: string,
  ) => void;
}) {
  const [outcome, setOutcome] = useState<'Invalidated' | 'Confirmed'>(
    investigation.labErrorCheck?.errorIdentified ? 'Invalidated' : 'Confirmed',
  );
  return (
    <form
      className="inv-form"
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        onConclude(
          outcome,
          outcome === 'Invalidated' ? String(f.get('assignableCause')) : '',
        );
      }}
    >
      <fieldset className="priority">
        <legend>Outcome</legend>
        {(['Invalidated', 'Confirmed'] as const).map((o) => (
          <label key={o}>
            <input
              type="radio"
              name="outcome"
              value={o}
              checked={outcome === o}
              onChange={() => setOutcome(o)}
            />
            {o}
          </label>
        ))}
      </fieldset>
      {outcome === 'Invalidated' && (
        <textarea
          name="assignableCause"
          aria-label="Assignable cause"
          required
          minLength={3}
          maxLength={2000}
          rows={2}
          placeholder="Required: the assignable laboratory cause"
        />
      )}
      <button className="btn sm primary" disabled={busy}>
        Conclude and close
      </button>
    </form>
  );
}

/** The Manager's OOS investigations list: Results still needing an
 * investigation, then open ones, then closed ones. */
export function OosTable({
  data,
  selected,
  onSelect,
}: {
  data: Snapshot;
  selected: string | null;
  onSelect: (sampleId: string) => void;
}) {
  const rows: OosRow[] = oosRows(data.samples);
  if (!rows.length)
    return (
      <p className="blank">No Result is out of specification. Nothing to do.</p>
    );
  return (
    <table className="grid" aria-label="OOS investigations">
      <thead>
        <tr>
          <th>Investigation</th>
          <th>Status</th>
          <th>Sample</th>
          <th>Test</th>
          <th className="r">Result</th>
          <th>Opened</th>
          <th>Lab error check</th>
          <th>Outcome · cause</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(({ sample: s, test: t, result: r, investigation: inv }) => (
          <tr
            key={`${s.id}-${t.id}-${r.sequence}`}
            className="row"
            aria-selected={s.id === selected}
            onClick={() => onSelect(s.id)}
          >
            <td className="c-id">
              <button
                className="id-link"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect(s.id);
                }}
              >
                {inv?.id ?? 'Not opened'}
              </button>
            </td>
            <td>
              <span className={investigationClass(inv)}>
                {investigationLabel(inv)}
              </span>
            </td>
            <td className="num">
              {s.id}
              <span className="batch">{s.status}</span>
            </td>
            <td>
              {t.analyteName}
              <span className="batch">
                {t.methodCode} v{t.methodVersion} · #{r.sequence}
              </span>
            </td>
            <td className="r">
              <ResultValue result={r} />
              {r.limit && (
                <span className="sub num">Limit {r.limit.value}</span>
              )}
            </td>
            <td>
              {inv ? (
                <span className="num">{stamp(inv.openedAt)}</span>
              ) : (
                <span className="dim">—</span>
              )}
            </td>
            <td>
              {inv?.labErrorCheck ? (
                inv.labErrorCheck.errorIdentified ? (
                  'Error identified'
                ) : (
                  'No error identified'
                )
              ) : (
                <span className="dim">{inv ? 'Awaiting analyst' : '—'}</span>
              )}
            </td>
            <td className="wrap">
              {inv?.outcome ? (
                <>
                  {inv.outcome}
                  {inv.assignableCause && (
                    <span className="batch">{inv.assignableCause}</span>
                  )}
                </>
              ) : (
                <span className="dim">—</span>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
