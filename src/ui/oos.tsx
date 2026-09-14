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
  type Refusal,
} from '../laboratory/results';
import { localDateTime } from './receiving';
import { ResultValue } from './results';
import {
  closed,
  type Execute,
  personName,
  RequiredMark,
  stamp,
  Status,
} from './shared';

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

/** The element id of an investigation in the Sample's OOS investigations. */
export const investigationAnchor = (id: string) => `investigation-${id}`;

/** A rule's refusal as visible text, word for word the core's, with the
 * investigation it names linking to that investigation. Separation of duties
 * reads neutral ("someone else approves"); every other rule is a warning.
 * Give the blocked control `aria-describedby={id}`. */
export function RefusalNote({ id, refusal }: { id: string; refusal: Refusal }) {
  const { reason, investigationId: inv } = refusal;
  const at = inv ? reason.indexOf(inv) : -1;
  const tone = refusal.code === 'separation of duties' ? 'neutral' : 'warn';
  return (
    // A block-level span, so it can sit beneath inline actions.
    <span id={id} className={`flash ${tone} inline refusal`}>
      {at < 0 ? (
        reason
      ) : (
        <>
          {reason.slice(0, at)}
          <a className="link num" href={`#${investigationAnchor(inv!)}`}>
            {inv}
          </a>
          {reason.slice(at + inv!.length)}
        </>
      )}
    </span>
  );
}

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
          <li
            key={`${t.id}-${r.sequence}`}
            id={inv ? investigationAnchor(inv.id) : undefined}
          >
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
                        {inv.causationConfirmed &&
                          '. The Manager confirmed the identified laboratory error caused the value'}
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
                        invalidatedBlocker={results
                          .investigation(inv.id)
                          .concludeBlocker('Invalidated')}
                        busy={busy}
                        onConclude={(
                          outcome,
                          assignableCause,
                          causationConfirmed,
                        ) =>
                          void execute({
                            type: 'concludeOosInvestigation',
                            ...target,
                            investigationId: inv.id,
                            outcome,
                            assignableCause,
                            causationConfirmed,
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
                          <span className="sent-to-client">
                            <strong>Sent to the Client:</strong>{' '}
                            {inv.clientNotification.sent}
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
                              sent: String(f.get('sent') ?? ''),
                              notifiedAt: when
                                ? new Date(when).toISOString()
                                : '',
                            });
                          }}
                        >
                          <label className="field">
                            <span>
                              Client contact who was informed <RequiredMark />
                            </span>
                            <input
                              name="contact"
                              required
                              maxLength={200}
                              placeholder="Name and role at the Client"
                            />
                          </label>
                          <label className="field">
                            <span>
                              What data and Laboratory error check findings were
                              sent to the Client <RequiredMark />
                            </span>
                            <textarea
                              name="sent"
                              required
                              minLength={3}
                              maxLength={2000}
                              rows={3}
                              defaultValue={
                                results.investigation(inv.id).findingsForClient
                              }
                            />
                          </label>
                          <label className="field">
                            <span>
                              When the Client was informed <RequiredMark />
                            </span>
                            <input
                              type="datetime-local"
                              name="notifiedAt"
                              required
                              max={localDateTime(new Date())}
                              defaultValue={localDateTime(new Date())}
                            />
                          </label>
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

/**
 * The Manager's conclusion of an investigation. No outcome is pre-selected.
 * Invalidated stays focusable but blocked, with the core's reason as visible
 * text, when the Laboratory error check identified no error; choosing it asks
 * the Manager to confirm that the identified error caused the value and to
 * give the assignable cause (ADR-0006).
 */
export function ConcludeForm({
  investigation,
  invalidatedBlocker,
  busy,
  onConclude,
}: {
  investigation: OosInvestigation;
  /** Why Invalidated cannot be concluded now, from the core, or null. */
  invalidatedBlocker: Refusal | null;
  busy: boolean;
  onConclude: (
    outcome: 'Invalidated' | 'Confirmed',
    assignableCause: string,
    causationConfirmed: boolean,
  ) => void;
}) {
  const [outcome, setOutcome] = useState<'Invalidated' | 'Confirmed' | null>(
    null,
  );
  // Set when a blocked outcome is chosen: the refusal is announced then, and
  // the choice is not taken.
  const [refused, setRefused] = useState(false);
  const reasonId = `conclude-invalidated-${investigation.id}`;
  return (
    <form
      className="inv-form"
      aria-label={`Conclude OOS investigation ${investigation.id}`}
      onSubmit={(e) => {
        e.preventDefault();
        if (!outcome) return;
        const f = new FormData(e.currentTarget);
        const invalidated = outcome === 'Invalidated';
        onConclude(
          outcome,
          invalidated ? String(f.get('assignableCause')) : '',
          invalidated && f.get('causationConfirmed') === 'on',
        );
      }}
    >
      <fieldset className="priority">
        <legend>
          Outcome <RequiredMark />
        </legend>
        {(['Invalidated', 'Confirmed'] as const).map((o) => {
          const blocked = o === 'Invalidated' && !!invalidatedBlocker;
          return (
            <label key={o} className={blocked ? 'blocked' : undefined}>
              <input
                type="radio"
                name="outcome"
                value={o}
                required
                checked={outcome === o}
                // Blocked but focusable: its reason is its description, and
                // choosing it is refused with that reason announced.
                aria-describedby={blocked ? reasonId : undefined}
                onChange={() => {
                  setRefused(blocked);
                  if (!blocked) setOutcome(o);
                }}
              />
              {o}
            </label>
          );
        })}
        {invalidatedBlocker && (
          <RefusalNote id={reasonId} refusal={invalidatedBlocker} />
        )}
        <span className="visually-hidden" role="status">
          {refused && invalidatedBlocker
            ? `Invalidated cannot be chosen. ${invalidatedBlocker.reason}`
            : ''}
        </span>
      </fieldset>
      {outcome === 'Invalidated' && (
        <>
          <label className="check">
            <input type="checkbox" name="causationConfirmed" required />I
            confirm the laboratory error the check identified caused this value{' '}
            <RequiredMark />
          </label>
          <label className="field">
            <span>
              Assignable cause <RequiredMark />
            </span>
            <textarea
              name="assignableCause"
              required
              minLength={3}
              maxLength={2000}
              rows={2}
              placeholder="The laboratory error that caused the value"
            />
          </label>
        </>
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
