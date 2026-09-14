import { useEffect, useId, useRef, useState } from 'react';
import { type Certificate } from '../laboratory/certificate';
import { amendmentOf, changeSummary } from '../laboratory/amendments';
import {
  actsAs,
  auditsSample,
  currentResult,
  heldStatuses,
  invalidSignatureRefusal,
  signatureMeaning,
  type Result,
  type Snapshot,
  type Sample,
  type Signature,
  type SigningCommandType,
} from '../laboratory/contracts';
import { resultsView } from '../laboratory/results';
import { AuditTable } from './audit-trail';
import { CertificateVersions } from './certificate-view';
import { Investigations, RefusalNote } from './oos';
import { PublishForm } from './publish';
import { ReceiptDeviations, ReceiptRecord } from './receiving';
import { TestSheet } from './results';
import {
  Due,
  type Execute,
  longDate,
  Modal,
  personName,
  InvalidSignatureTag,
  signatureStamp,
  stamp,
  Status,
} from './shared';

export const SAMPLE_TABS = ['Results', 'Receipt', 'History'] as const;

export function SamplePanel({
  sample: s,
  data,
  actor,
  busy,
  execute,
  onClose,
}: {
  sample: Sample;
  data: Snapshot;
  actor: string;
  busy: boolean;
  execute: Execute;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<(typeof SAMPLE_TABS)[number]>('Results');
  const [signing, setSigning] = useState<SigningCommandType | null>(null);
  useEffect(() => setSigning(null), [s.id]);
  const tabIds = useId();
  const approvalNoteId = useId();
  const signatureNoteId = useId();
  const person = data.people.find((p) => p.id === actor)!;
  const canRecord =
    s.assignee === actor &&
    ['In progress', 'Returned', 'Amendment in progress'].includes(s.status);
  const canDecide =
    actsAs(person, 'manager') && s.status === 'Awaiting approval';
  const results = resultsView(s);
  // The first rule refusing this Approval, asked as the core asks it.
  const approvalRefusal = results.approvalRefusal(actor);
  // An invalid Electronic signature refuses submission, Approval, Publishing
  // and Amendment, before any other rule, as the core refuses them.
  const signatureRefusal = invalidSignatureRefusal(data.signatures, s.id);
  const signatureNote = signatureRefusal && (
    <span id={signatureNoteId} className="flash warn inline refusal">
      {signatureRefusal}
    </span>
  );
  const canAssign =
    actsAs(person, 'coordinator') &&
    !['Approved', 'Published', 'Awaiting approval', ...heldStatuses].includes(
      s.status,
    );
  const canPublish = actsAs(person, 'coordinator') && s.status === 'Approved';
  const canAmend =
    (actsAs(person, 'coordinator') || actsAs(person, 'manager')) &&
    s.status === 'Published';
  const history = data.audit.filter((e) => auditsSample(e, s));
  const recorded = s.tests.filter((t) => currentResult(t)).length;
  // A Sample with a Certificate that is back at the bench or awaiting
  // Approval is in an Amendment, as the core decides it.
  const versions = data.certificates.filter((c) => c.sampleId === s.id);
  const amendment =
    versions.length && !['Approved', 'Published'].includes(s.status)
      ? amendmentOf(history)
      : null;
  const amendmentChanges = amendment && changeSummary(s, history);
  return (
    <div className="sample">
      <header className="sample-head">
        <button className="back" onClick={onClose}>
          Back to list
        </button>
        <div className="sample-title">
          <span className="sample-id">{s.id}</span>
          <Status sample={s} />
          {s.priority === 'Urgent' && <span className="urgent">Urgent</span>}
          <button
            className="icon-btn close-panel"
            aria-label="Close sample"
            onClick={onClose}
          >
            ×
          </button>
        </div>
        <h2>
          {s.product}
          {s.strength && ` ${s.strength}`}
        </h2>
        <dl className="meta">
          <div>
            <dt>Client</dt>
            <dd>{s.client}</dd>
          </div>
          <div>
            <dt>Submission</dt>
            <dd className="num">{s.submissionId}</dd>
          </div>
          <div>
            <dt>Material type</dt>
            <dd>{s.materialType}</dd>
          </div>
          <div>
            <dt>Batch</dt>
            <dd className="num">{s.batch}</dd>
          </div>
          <div>
            <dt>Received</dt>
            <dd>{longDate(s.receivedAt)}</dd>
          </div>
          <div>
            <dt>Due</dt>
            <dd>
              <Due sample={s} />
            </dd>
          </div>
          <div className="meta-analyst">
            <dt>Analyst</dt>
            <dd>
              {canAssign ? (
                <form
                  className="assign"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const f = new FormData(e.currentTarget);
                    void execute({
                      type: 'assign',
                      sampleId: s.id,
                      revision: s.revision,
                      assignee: String(f.get('assignee')),
                    });
                  }}
                >
                  <select
                    key={s.assignee}
                    name="assignee"
                    aria-label="Assigned analyst"
                    defaultValue={s.assignee ?? ''}
                    required
                  >
                    <option value="" disabled>
                      Unassigned
                    </option>
                    {data.people
                      .filter(
                        (p) =>
                          actsAs(p, 'analyst') &&
                          (p.active || p.id === s.assignee),
                      )
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                  </select>
                  <button className="btn sm" disabled={busy}>
                    Assign
                  </button>
                </form>
              ) : (
                (personName(data, s.assignee) ?? 'Unassigned')
              )}
            </dd>
          </div>
        </dl>
      </header>
      <div
        className="tabs"
        role="tablist"
        aria-label="Sample details"
        onKeyDown={(e) => {
          // Roving focus between the tabs, per the ARIA tabs pattern.
          if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
          e.preventDefault();
          const step = e.key === 'ArrowRight' ? 1 : SAMPLE_TABS.length - 1;
          const next =
            SAMPLE_TABS[(SAMPLE_TABS.indexOf(tab) + step) % SAMPLE_TABS.length];
          setTab(next);
          document.getElementById(`${tabIds}-tab-${next}`)?.focus();
        }}
      >
        {SAMPLE_TABS.map((t) => (
          <button
            key={t}
            id={`${tabIds}-tab-${t}`}
            role="tab"
            aria-selected={tab === t}
            aria-controls={`${tabIds}-panel`}
            tabIndex={tab === t ? 0 : -1}
            onClick={() => setTab(t)}
          >
            {t}
            {t !== 'Receipt' && (
              <span className="tab-n">
                {t === 'Results'
                  ? `${recorded}/${s.tests.length}`
                  : history.length}
              </span>
            )}
          </button>
        ))}
      </div>
      <div
        className="sample-body"
        role="tabpanel"
        id={`${tabIds}-panel`}
        aria-labelledby={`${tabIds}-tab-${tab}`}
      >
        {tab === 'History' ? (
          <AuditTable entries={history} data={data} />
        ) : tab === 'Receipt' ? (
          <>
            <ReceiptDeviations
              sample={s}
              data={data}
              canAct={false}
              busy={busy}
            />
            <ReceiptRecord sample={s} data={data} />
          </>
        ) : (
          <>
            <ReceiptDeviations
              sample={s}
              data={data}
              canAct={actsAs(person, 'coordinator')}
              busy={busy}
              execute={execute}
            />
            {s.status === 'Returned' && s.lastReturn && (
              <div className="flash returned inline">
                <strong>
                  Returned by {personName(data, s.lastReturn.by)},{' '}
                  {stamp(s.lastReturn.at)}:
                </strong>{' '}
                {s.lastReturn.comment}
              </div>
            )}
            {amendment && (
              <div className="flash amendment inline" role="status">
                <strong>
                  Amendment of Certificate version {versions.at(-1)!.version},
                  started by {personName(data, amendment.startedBy)},{' '}
                  {stamp(amendment.startedAt)}:
                </strong>{' '}
                {amendment.reason}
                <p className="amendment-changes">
                  {amendmentChanges
                    ? `Changes so far: ${amendmentChanges}`
                    : 'No Result corrected yet. Correct each affected Result with a reason.'}
                </p>
              </div>
            )}
            <TestSheet
              sample={s}
              canRecord={canRecord}
              hasCertificate={versions.length > 0}
              busy={busy}
              execute={execute}
              data={data}
            />
            <Investigations
              sample={s}
              data={data}
              actor={actor}
              busy={busy}
              execute={execute}
            />
            <Signatures
              signatures={data.signatures.filter((x) => x.sampleId === s.id)}
            />
            <CertificateVersions sample={s} data={data} />
          </>
        )}
      </div>
      {tab === 'Results' && (
        <footer className="sample-foot">
          {canRecord ? (
            <>
              {signatureNote}
              <span className="dim">
                {recorded} of {s.tests.length} results recorded
              </span>
              <button
                className="btn primary"
                // Blocked but focusable, its reason the visible note.
                aria-disabled={signatureRefusal ? true : undefined}
                aria-describedby={
                  signatureRefusal ? signatureNoteId : undefined
                }
                disabled={
                  busy ||
                  recorded < s.tests.length ||
                  (!!amendment && !amendmentChanges)
                }
                title={
                  amendment && !amendmentChanges
                    ? 'Correct at least one Result before submitting the Amendment.'
                    : undefined
                }
                onClick={() =>
                  signatureRefusal || setSigning('submitForApproval')
                }
              >
                {amendment
                  ? 'Submit Amendment for approval…'
                  : 'Submit for approval…'}
              </button>
            </>
          ) : canDecide ? (
            <form
              className="decision"
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                const choice = (
                  e.nativeEvent as SubmitEvent
                ).submitter?.getAttribute('value');
                // Returning is unsigned; Approval is an Electronic signature.
                if (choice !== 'return') return setSigning('approve');
                void execute({
                  type: 'return',
                  sampleId: s.id,
                  revision: s.revision,
                  comment: String(f.get('comment')),
                });
              }}
            >
              {signatureNote ? (
                <div>{signatureNote}</div>
              ) : (
                approvalRefusal && (
                  <div>
                    <RefusalNote
                      id={approvalNoteId}
                      refusal={approvalRefusal}
                    />
                  </div>
                )
              )}
              <textarea
                name="comment"
                aria-label="Comment for the analyst"
                maxLength={2000}
                rows={2}
                placeholder="Required to return: the correction the analyst should make"
              />
              <div className="decision-actions">
                <button
                  className="btn"
                  name="choice"
                  value="return"
                  disabled={busy}
                >
                  Return to analyst
                </button>
                <button
                  className="btn primary"
                  name="choice"
                  value="approve"
                  disabled={busy}
                  // Blocked but focusable, its reason the visible note.
                  aria-disabled={
                    signatureRefusal || approvalRefusal ? true : undefined
                  }
                  aria-describedby={
                    signatureRefusal
                      ? signatureNoteId
                      : approvalRefusal
                        ? approvalNoteId
                        : undefined
                  }
                  onClick={(e) => {
                    if (signatureRefusal || approvalRefusal) e.preventDefault();
                  }}
                >
                  Approve…
                </button>
              </div>
            </form>
          ) : canPublish ? (
            <PublishForm sample={s} data={data} busy={busy} execute={execute} />
          ) : canAmend ? (
            <AmendmentForm
              sample={s}
              refusal={signatureRefusal}
              busy={busy}
              execute={execute}
            />
          ) : (
            <span className="dim">
              {s.status === 'Published'
                ? 'Published. This Sample is locked; its publication is recorded on the Certificate of Analysis.'
                : s.status === 'Approved'
                  ? 'Approved. This Sample is locked and its Certificate of Analysis is waiting to be Published by a Coordinator.'
                  : s.status === 'On hold'
                    ? "On hold for a Receipt deviation until the Client's instruction is recorded."
                    : s.status === 'Withdrawn'
                      ? 'Withdrawn on the Client’s instruction. No testing will be done.'
                      : s.status === 'Awaiting approval'
                        ? 'Awaiting Manager approval.'
                        : s.assignee
                          ? `Results are entered by ${personName(data, s.assignee)}.`
                          : 'Assign an analyst before Results can be entered.'}
            </span>
          )}
        </footer>
      )}
      {signing && (
        <SignDialog
          type={signing}
          sample={s}
          signerName={person.name}
          inAmendment={versions.length > 0}
          busy={busy}
          execute={execute}
          onClose={() => setSigning(null)}
        />
      )}
    </div>
  );
}

/** Starts an Amendment of a Published Certificate. The assigned Analyst then
 * corrects the affected Results, and the next version is approved and
 * Published as before. */
export function AmendmentForm({
  sample: s,
  refusal,
  busy,
  execute,
}: {
  sample: Sample;
  /** The core's refusal to start an Amendment, shown as the reason. */
  refusal: string | null;
  busy: boolean;
  execute: Execute;
}) {
  const refusalId = useId();
  return (
    <form
      className="publish-form"
      aria-label="Start an Amendment"
      onSubmit={(e) => {
        e.preventDefault();
        if (refusal) return;
        const f = new FormData(e.currentTarget);
        void execute({
          type: 'startAmendment',
          sampleId: s.id,
          revision: s.revision,
          reason: String(f.get('reason') ?? ''),
        });
      }}
    >
      <span className="dim wide">
        Published. This Sample is locked; a correction to its Certificate of
        Analysis is made by an Amendment.
      </span>
      {refusal && (
        <p id={refusalId} className="flash warn inline wide" role="status">
          {refusal}
        </p>
      )}
      <label className="wide">
        Reason for the Amendment
        <textarea
          name="reason"
          required
          minLength={3}
          maxLength={2000}
          rows={2}
          placeholder="Required: the error found and how it came to light"
        />
      </label>
      <button
        className="btn primary"
        disabled={busy}
        // Blocked but focusable, its reason the visible note.
        aria-disabled={refusal ? true : undefined}
        aria-describedby={refusal ? refusalId : undefined}
      >
        Start amendment
      </button>
    </form>
  );
}

/** Signature manifestations: who signed, when, and what the signature means. */
export function Signatures({ signatures }: { signatures: Signature[] }) {
  if (!signatures.length) return null;
  return (
    <section className="signatures" aria-label="Electronic signatures">
      <h3>Electronic signatures</h3>
      <ul>
        {signatures.map((x) => (
          <li key={x.command.commandId}>
            <span className="sig-meaning">
              {x.meaning[0].toUpperCase() + x.meaning.slice(1)}
            </span>
            <span>
              <strong>{x.printedName}</strong>
              {!x.valid && <InvalidSignatureTag />}
            </span>
            <time dateTime={x.signedAt}>{signatureStamp(x.signedAt)}</time>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Re-entering the password is the act of signing. A wrong password keeps the
 * dialog open with the server's message; nothing was applied. */
export function SignDialog({
  type,
  sample: s,
  signerName,
  inAmendment,
  busy,
  execute,
  onClose,
}: {
  type: SigningCommandType;
  sample: Sample;
  signerName: string;
  /** The Sample already has a Certificate, so a submission signs its
   * Amendment. */
  inAmendment: boolean;
  busy: boolean;
  execute: Execute;
  onClose: () => void;
}) {
  const [error, setError] = useState('');
  const password = useRef<HTMLInputElement>(null);
  useEffect(() => {
    // After the dialog opens, which otherwise focuses its close button.
    const frame = requestAnimationFrame(() => password.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, []);
  const approving = type === 'approve';
  return (
    <Modal
      title={approving ? 'Sign Approval' : 'Sign submission for approval'}
      onClose={onClose}
    >
      <form
        className="form"
        onSubmit={async (e) => {
          e.preventDefault();
          const target = { sampleId: s.id, revision: s.revision };
          const entered = String(new FormData(e.currentTarget).get('password'));
          setError('');
          const saved = await execute(
            approving
              ? { type: 'approve', ...target, password: entered }
              : { type: 'submitForApproval', ...target, password: entered },
            { onError: setError },
          );
          if (saved) onClose();
          else password.current?.select();
        }}
      >
        <p className="sign-statement">
          {approving
            ? `I give Approval to the Results of Sample ${s.id}.`
            : inAmendment
              ? `I corrected the Results of Sample ${s.id} in its Amendment and submit them for approval.`
              : `I performed the Tests on Sample ${s.id} and submit their Results for approval.`}{' '}
          This Electronic signature records{' '}
          <strong>
            {signatureMeaning(type, inAmendment)} {signerName}
          </strong>{' '}
          with the date and time.
        </p>
        {error && (
          <p role="alert" className="flash inline error">
            {error}
          </p>
        )}
        <label>
          Password for {signerName}
          <input
            ref={password}
            name="password"
            type="password"
            autoComplete="current-password"
            required
            maxLength={200}
          />
        </label>
        <div className="form-foot">
          <span className="dim">Your password is verified, never stored.</span>
          <div className="sign-actions">
            <button type="button" className="btn" onClick={onClose}>
              Cancel
            </button>
            <button className="btn primary" disabled={busy}>
              {busy
                ? 'Signing…'
                : approving
                  ? 'Sign and approve'
                  : 'Sign and submit'}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
