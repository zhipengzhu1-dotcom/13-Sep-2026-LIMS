import { useRef, useState } from 'react';
import {
  conformity,
  currentResult,
  decisionRule,
  investigationOf,
  isFinishedProduct,
  limitInForce,
  qualify,
  type AcceptableIntake,
  type Qualifier,
  type Result,
  type Snapshot,
  type Sample,
  type Test,
} from '../laboratory/contracts';
import {
  MAX_ATTACHMENT_BYTES,
  attachmentAccept,
  attachmentContentType,
} from '../laboratory/attachment-contracts';
import { investigationLabel, OosNote } from './oos';
import {
  ConformityTag,
  type Draft,
  type Execute,
  initials,
  personName,
  stamp,
} from './shared';

/** The one place an `enterResult` command is built, so every entry row sends
 * a Result the same way. The unit and qualifier are never sent: the unit
 * follows the Material type and the core assigns the qualifier. */
export function resultDraft(
  s: Sample,
  t: Test,
  f: FormData,
  attachmentId: string,
): Draft {
  return {
    type: 'enterResult',
    sampleId: s.id,
    revision: s.revision,
    testId: t.id,
    value: Number(f.get('value')),
    instrumentReading: Number(f.get('instrumentReading')),
    sequenceId: String(f.get('sequenceId') ?? ''),
    attachmentId,
    reason: String(f.get('reason') ?? ''),
  };
}

/** Every Acceptable intake entry, newest first within each Analyte, marked
 * in force, historical or not yet effective as of today. */
export function AcceptableIntakeTable({ data }: { data: Snapshot }) {
  const now = new Date().toISOString();
  const rows = data.analytes.flatMap((a) =>
    data.acceptableIntakes
      .filter((e) => e.analyteId === a.id)
      .sort(
        (x, y) => y.effectiveFrom.localeCompare(x.effectiveFrom) || y.id - x.id,
      )
      .map((e) => ({ analyte: a, entry: e })),
  );
  const standing = (e: AcceptableIntake) =>
    limitInForce(data.acceptableIntakes, e.analyteId, now)?.id === e.id
      ? 'In force'
      : e.effectiveFrom > now.slice(0, 10)
        ? 'Not yet effective'
        : 'Historical';
  return (
    <>
      <h2 className="page-heading">Acceptable intake · Limits</h2>
      <table className="grid">
        <thead>
          <tr>
            <th>Analyte</th>
            <th className="r">Limit, ng/day</th>
            <th>Effective from</th>
            <th>Standing</th>
            <th>Source</th>
            <th>Revision date</th>
            <th>Entry</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ analyte, entry: e }) => {
            const s = standing(e);
            return (
              <tr
                key={e.id}
                className={s === 'In force' ? undefined : 'historical'}
              >
                <td className="strong">{analyte.name}</td>
                <td className="r num strong">{e.value}</td>
                <td className="num">{e.effectiveFrom}</td>
                <td>
                  <span
                    className={
                      'standing ' + s.toLowerCase().replace(/\s+/g, '-')
                    }
                  >
                    {s}
                  </span>
                  {e.illustrative && (
                    <span className="illustrative">Illustrative</span>
                  )}
                </td>
                <td>
                  <a href={e.sourceUrl} target="_blank" rel="noreferrer">
                    {e.sourceTitle}
                  </a>
                </td>
                <td className="num">{e.sourceRevisionDate}</td>
                <td className="num dim">#{e.id}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="footnote">
        Entries are only ever added. A finished product Result is judged against
        the entry in force when it is entered and keeps that Limit; raw
        materials have no Limit and are reported as is. {decisionRule}{' '}
        Illustrative values only, to be checked against the CDER list.
      </p>
    </>
  );
}

export function LimitCell({ result: r }: { result: Result }) {
  return (
    <>
      <ConformityTag statement={r.conformity} />
      <span className="sub num">
        {r.limit
          ? `Limit ${r.limit.value} ng/day · from ${r.limit.effectiveFrom}`
          : 'No Limit'}
      </span>
    </>
  );
}

export function QualifierTag({ qualifier }: { qualifier: Qualifier }) {
  return qualifier === 'quantified' ? null : (
    <span className="qualifier">{qualifier}</span>
  );
}

export function ResultValue({ result: r }: { result: Result }) {
  return (
    <span className={'value' + (r.qualifier === 'quantified' ? '' : ' below')}>
      <QualifierTag qualifier={r.qualifier} />
      {r.value}
      <small>{r.unit}</small>
    </span>
  );
}

/** The entry fields for one Test, with the applicable LOD/LOQ and a preview of
 * the qualifier the core will assign to the value as typed. */
export function ResultEntry({
  sample: s,
  test: t,
  current,
  data,
  busy,
  execute,
  onSaved,
}: {
  sample: Sample;
  test: Test;
  current: Result | undefined;
  data: Snapshot;
  busy: boolean;
  execute: Execute;
  onSaved: () => void;
}) {
  const [typed, setTyped] = useState(current ? String(current.value) : '');
  const value = typed.trim() === '' ? NaN : Number(typed);
  const preview =
    Number.isFinite(value) && value >= 0 ? qualify(value, t) : null;
  // A preview only: the core judges against the entry in force when it saves.
  const limit = isFinishedProduct(s.materialType)
    ? limitInForce(
        data.acceptableIntakes,
        t.analyteId,
        new Date().toISOString(),
      )
    : null;
  const conformityPreview =
    preview === null
      ? null
      : conformity({ value, qualifier: preview }, t, limit);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  // A file already stored is not sent twice, so resubmitting after a failed
  // save repeats the same command rather than referencing a new copy.
  const uploaded = useRef(new WeakMap<File, string>());
  async function uploadWorksheet(file: File): Promise<string | null> {
    const known = uploaded.current.get(file);
    if (known) return known;
    const contentType = attachmentContentType(file.name);
    if (!contentType) {
      setUploadError('Attach a PDF, XLSX, XLS, CSV, PNG or JPEG file.');
      return null;
    }
    if (file.size > MAX_ATTACHMENT_BYTES) {
      setUploadError('Attachments are limited to 10 MB.');
      return null;
    }
    setUploading(true);
    try {
      const response = await fetch(
        `/api/attachments?filename=${encodeURIComponent(file.name)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': contentType },
          body: file,
        },
      );
      const body = await response.json();
      if (!response.ok) {
        setUploadError(body.error);
        return null;
      }
      uploaded.current.set(file, body.attachment.id);
      return body.attachment.id;
    } catch {
      setUploadError('The worksheet could not be uploaded. Try again.');
      return null;
    } finally {
      setUploading(false);
    }
  }
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setUploadError('');
        const form = new FormData(e.currentTarget);
        const attachmentId = await uploadWorksheet(
          form.get('worksheet') as File,
        );
        if (
          attachmentId &&
          (await execute(resultDraft(s, t, form, attachmentId)))
        )
          onSaved();
      }}
    >
      <label>
        <span>Result, {t.unit}</span>
        <input
          name="value"
          type="number"
          step="any"
          min={0}
          required
          inputMode="decimal"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
        />
      </label>
      <output className="preview" aria-live="polite">
        <span className="dim">
          LOD {t.lod} · LOQ {t.loq} {t.unit}
        </span>
        <b>
          {preview === null
            ? '—'
            : preview === 'quantified'
              ? 'Quantified'
              : preview}
        </b>
      </output>
      <output className="preview" aria-live="polite">
        <span className="dim">
          {limit ? `Limit ${limit.value} ng/day` : 'No Limit'}
        </span>
        <b>
          {conformityPreview === null ? (
            '—'
          ) : (
            <ConformityTag statement={conformityPreview} />
          )}
        </b>
      </output>
      <label>
        <span>Instrument reading, ng/mL</span>
        <input
          name="instrumentReading"
          type="number"
          step="any"
          min={0}
          required
          inputMode="decimal"
        />
      </label>
      <label>
        <span>Injection / sequence ID</span>
        <input name="sequenceId" required maxLength={200} />
      </label>
      <label className="worksheet">
        <span>Calculation worksheet</span>
        <input
          name="worksheet"
          type="file"
          required
          accept={attachmentAccept}
          onChange={() => setUploadError('')}
        />
      </label>
      {current && (
        <label className="grow">
          <span>Reason for correction</span>
          <input name="reason" required minLength={3} maxLength={1000} />
        </label>
      )}
      <button className="btn sm primary" disabled={busy || uploading}>
        {uploading ? 'Uploading…' : 'Save'}
      </button>
      {uploadError && (
        <p className="upload-error" role="alert">
          {uploadError}
        </p>
      )}
    </form>
  );
}

/** Opens the stored worksheet a Result was calculated on. */
export function WorksheetLink({ data, id }: { data: Snapshot; id: string }) {
  const attachment = data.attachments.find((a) => a.id === id);
  return (
    <a
      className="link worksheet-link"
      href={`/api/attachments/${encodeURIComponent(id)}`}
      title={
        attachment
          ? `${attachment.filename} · ${Math.ceil(attachment.size / 1024)} KB · SHA-256 ${attachment.sha256}`
          : undefined
      }
    >
      {attachment?.filename ?? 'Worksheet'}
    </a>
  );
}

/** Every requested test as one row. Unrecorded tests show their entry fields
 * inline for the assigned analyst, so a whole sample can be keyed in one pass
 * with Tab and Enter; a current Result opens for correction on request. */
export function TestSheet({
  sample: s,
  canRecord,
  busy,
  execute,
  data,
}: {
  sample: Sample;
  canRecord: boolean;
  busy: boolean;
  execute: Execute;
  data: Snapshot;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [openHistory, setOpenHistory] = useState<string | null>(null);
  return (
    <table className="grid sheet">
      <thead>
        <tr>
          <th>Test</th>
          <th className="r">Result</th>
          <th>Conformity</th>
          <th>Entered</th>
        </tr>
      </thead>
      {s.tests.map((t) => {
        const current = currentResult(t);
        const editing = canRecord && (!current || editingId === t.id);
        const history = openHistory === t.id;
        // Earlier Results besides the current one, such as an Invalidated
        // result awaiting its retest.
        const earlier = t.results.length - (current ? 1 : 0);
        const retest =
          !current && t.results.some((r) => r.status === 'invalidated');
        return (
          <tbody key={t.id} className={editing ? 'editing' : undefined}>
            <tr>
              <td>
                <span className="strong">{t.analyteName}</span>
                <span className="sub num">
                  {t.methodCode} v{t.methodVersion} · {t.technique} · LOD{' '}
                  {t.lod} / LOQ {t.loq} {t.unit}
                </span>
              </td>
              <td className="r">
                {current ? (
                  <>
                    <ResultValue result={current} />
                    <span className="sub num">
                      {current.instrumentReading} ng/mL · {current.sequenceId}
                      {' · '}
                      <WorksheetLink data={data} id={current.attachmentId} />
                    </span>
                  </>
                ) : (
                  <span className="dim">— {t.unit}</span>
                )}
                {!current && earlier > 0 && (
                  <button
                    className="link sub"
                    aria-expanded={history}
                    onClick={() => setOpenHistory(history ? null : t.id)}
                  >
                    History ({t.results.length})
                  </button>
                )}
              </td>
              <td>
                {current ? (
                  <>
                    <LimitCell result={current} />
                    <OosNote sample={s} result={current} />
                  </>
                ) : retest ? (
                  <span className="oos-note">Retest required</span>
                ) : (
                  <span className="dim">—</span>
                )}
              </td>
              <td>
                {current ? (
                  <span className="rec">
                    <span>
                      {initials(personName(data, current.enteredBy))}{' '}
                      <time className="num" dateTime={current.enteredAt}>
                        {stamp(current.enteredAt)}
                      </time>
                    </span>
                    <span className="rec-actions">
                      {t.results.length > 1 && (
                        <button
                          className="link"
                          aria-expanded={history}
                          onClick={() => setOpenHistory(history ? null : t.id)}
                        >
                          History ({t.results.length})
                        </button>
                      )}
                      {canRecord && (
                        <button
                          className="link"
                          onClick={() =>
                            setEditingId(editingId === t.id ? null : t.id)
                          }
                        >
                          {editingId === t.id ? 'Cancel' : 'Correct'}
                        </button>
                      )}
                    </span>
                  </span>
                ) : (
                  <span className="dim">Not entered</span>
                )}
              </td>
            </tr>
            {editing && (
              <tr className="entry">
                <td colSpan={4}>
                  <ResultEntry
                    key={current?.sequence ?? 0}
                    sample={s}
                    test={t}
                    current={current}
                    data={data}
                    busy={busy}
                    execute={execute}
                    onSaved={() => setEditingId(null)}
                  />
                </td>
              </tr>
            )}
            {history && (
              <tr className="revisions">
                <td colSpan={4}>
                  <ol>
                    {[...t.results].reverse().map((r) => (
                      <li key={r.sequence} className={r.status}>
                        <span className="num">#{r.sequence}</span>
                        <span className={'result-status ' + r.status}>
                          {r.status[0].toUpperCase() + r.status.slice(1)}
                        </span>
                        <ResultValue result={r} />
                        <ConformityTag statement={r.conformity} />
                        <span className="dim num">
                          {r.limit ? `Limit ${r.limit.value} ng/day · ` : ''}
                          {r.instrumentReading} ng/mL · {r.sequenceId}
                        </span>
                        <WorksheetLink data={data} id={r.attachmentId} />
                        <span>{personName(data, r.enteredBy)}</span>
                        <time className="dim" dateTime={r.enteredAt}>
                          {stamp(r.enteredAt)}
                        </time>
                        {r.reason && (
                          <span className="reason">Reason: {r.reason}</span>
                        )}
                        {r.investigationId && (
                          <span className="reason">
                            {r.investigationId} ·{' '}
                            {investigationLabel(investigationOf(s, r))}
                            {investigationOf(s, r)?.assignableCause &&
                              ` · Assignable cause: ${investigationOf(s, r)!.assignableCause}`}
                          </span>
                        )}
                      </li>
                    ))}
                  </ol>
                </td>
              </tr>
            )}
          </tbody>
        );
      })}
    </table>
  );
}
