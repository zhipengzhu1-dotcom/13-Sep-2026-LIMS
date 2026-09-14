import React, { useRef, useState } from 'react';
import {
  containerTypes,
  expiryKinds,
  isFinishedProduct,
  materialTypes,
  packageConditions,
  priorities,
  quantityUnits,
  receiptDeviationKinds,
  reportingUnit,
  shippingConditions,
  stabilityConditionLabels,
  stabilityConditions,
  stabilityTimePoints,
  type MaterialType,
  type Snapshot,
  type Sample,
} from '../laboratory/contracts';
import {
  type Draft,
  Due,
  type Execute,
  fullStamp,
  longDate,
  personName,
} from './shared';
import { contactLine } from '../laboratory/certificate-renderer';

export type ReceiptDraft = Extract<Draft, { type: 'receiveSubmission' }>;

export type SampleDraft = ReceiptDraft['samples'][number];

/** A `datetime-local` value (local wall-clock time) for an instant. */
export function localDateTime(date: Date) {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

/** One delivery: the Submission's receipt record and each of its Samples. The
 * core validates everything again; the form only catches what it can early. */
export function Intake({
  data,
  disabled,
  error,
  onSubmit,
}: {
  data: Snapshot;
  disabled: boolean;
  error: string;
  onSubmit: (command: Draft) => Promise<void>;
}) {
  // Each Sample row keeps a stable key, so removing one never shifts the
  // values typed into the others.
  const nextKey = useRef(1);
  const [rows, setRows] = useState([0]);
  const [types, setTypes] = useState<Record<number, MaterialType>>({});
  const [stability, setStability] = useState<Record<number, boolean>>({});
  const [correcting, setCorrecting] = useState(false);
  const [missing, setMissing] = useState('');
  const typeOf = (key: number) => types[key] ?? 'finished product';
  return (
    <form
      className="form"
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const text = (name: string) => String(f.get(name) ?? '').trim();
        const numberOrNull = (name: string) =>
          text(name) === '' ? null : Number(text(name));
        const dateOrNull = (name: string) => text(name) || null;
        const samples = rows.map((key): SampleDraft => {
          const materialType = typeOf(key);
          const finished = isFinishedProduct(materialType);
          return {
            clientSampleId: text(`clientSampleId-${key}`),
            materialType,
            product: text(`product-${key}`),
            strength: text(`strength-${key}`),
            batch: text(`batch-${key}`),
            manufacturer: text(`manufacturer-${key}`),
            manufactureDate: dateOrNull(`manufactureDate-${key}`),
            expiryDate: dateOrNull(`expiryDate-${key}`),
            expiryKind: text(`expiryKind-${key}`) as Sample['expiryKind'],
            quantity: {
              value: Number(text(`quantity-${key}`)),
              unit: text(`quantityUnit-${key}`) as Sample['quantity']['unit'],
            },
            containers: {
              count: Number(text(`containerCount-${key}`)),
              type: text(
                `containerType-${key}`,
              ) as Sample['containers']['type'],
            },
            conditionOnReceipt: text(`conditionOnReceipt-${key}`),
            storageCondition: text(`storageCondition-${key}`),
            storageLocation: text(`storageLocation-${key}`),
            methodIds: f.getAll(`methods-${key}`).map(String),
            dueDate: text(`dueDate-${key}`),
            priority: text(`priority-${key}`) as Sample['priority'],
            remarks: text(`remarks-${key}`),
            retentionInstruction: text(`retention-${key}`),
            // Any deviation found on arrival holds the Sample from receipt.
            deviations: text(`deviationKind-${key}`)
              ? [
                  {
                    kind: text(
                      `deviationKind-${key}`,
                    ) as (typeof receiptDeviationKinds)[number],
                    description: text(`deviationDescription-${key}`),
                  },
                ]
              : [],
            maximumDailyDose: finished
              ? numberOrNull(`maximumDailyDose-${key}`)
              : null,
            stability:
              finished && stability[key]
                ? {
                    studyId: text(`studyId-${key}`),
                    timePoint: text(
                      `timePoint-${key}`,
                    ) as (typeof stabilityTimePoints)[number],
                    condition: text(
                      `condition-${key}`,
                    ) as (typeof stabilityConditions)[number],
                  }
                : null,
          };
        });
        const empty = samples.findIndex((s) => !s.methodIds.length);
        if (empty !== -1) {
          setMissing(`Sample ${empty + 1}: request at least one Method.`);
          return;
        }
        setMissing('');
        void onSubmit({
          type: 'receiveSubmission',
          clientId: text('clientId'),
          clientReference: text('clientReference'),
          clientContact: {
            name: text('clientContactName'),
            role: text('clientContactRole'),
            email: text('clientContactEmail'),
            phone: text('clientContactPhone'),
          },
          receivedAt: correcting
            ? {
                at: new Date(text('receivedAt')).toISOString(),
                reason: text('receivedAtReason'),
              }
            : null,
          courier: text('courier'),
          trackingNumber: text('trackingNumber'),
          shippingCondition: text(
            'shippingCondition',
          ) as ReceiptDraft['shippingCondition'],
          temperatureOnArrival: numberOrNull('temperatureOnArrival'),
          packageCondition: text(
            'packageCondition',
          ) as ReceiptDraft['packageCondition'],
          chainOfCustodyReference: text('chainOfCustodyReference'),
          samples,
        });
      }}
    >
      <fieldset className="intake-section">
        <legend>Submission</legend>
        <div className="fields">
          <label>
            Client
            <select name="clientId" required defaultValue="" autoFocus>
              <option value="" disabled>
                Choose a Client
              </option>
              {(['external', 'internal'] as const).map((kind) => (
                <optgroup
                  key={kind}
                  label={
                    kind === 'external' ? 'External' : 'Internal departments'
                  }
                >
                  {data.clients
                    .filter((c) => c.kind === kind)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                </optgroup>
              ))}
            </select>
          </label>
          <label>
            Client contact name
            <input
              name="clientContactName"
              required
              maxLength={200}
              autoComplete="off"
            />
          </label>
          <label>
            Client contact role
            <input
              name="clientContactRole"
              required
              maxLength={200}
              autoComplete="off"
            />
          </label>
          <label>
            Client contact email
            <input
              name="clientContactEmail"
              type="email"
              required
              maxLength={200}
              autoComplete="off"
            />
          </label>
          <label>
            Client contact phone
            <input
              name="clientContactPhone"
              type="tel"
              required
              maxLength={200}
              autoComplete="off"
            />
          </label>
          <label>
            Client reference or PO
            <input name="clientReference" maxLength={200} />
          </label>
          <div className="span-2 received-at">
            <span className="label">Received at</span>
            {correcting ? (
              <div className="fields">
                <label>
                  Actual date and time of arrival
                  <input
                    name="receivedAt"
                    type="datetime-local"
                    required
                    max={localDateTime(new Date())}
                  />
                </label>
                <label>
                  Reason for the correction
                  <input
                    name="receivedAtReason"
                    required
                    minLength={3}
                    maxLength={1000}
                    placeholder="Delivered before the morning run; logged once unpacked"
                  />
                </label>
              </div>
            ) : (
              <span className="dim">
                Recorded automatically as the time you save.
              </span>
            )}
            <label className="check">
              <input
                type="checkbox"
                checked={correcting}
                onChange={(e) => setCorrecting(e.target.checked)}
              />
              Correct the received date and time (a reason is required and
              recorded)
            </label>
          </div>
          <label>
            Courier
            <input name="courier" maxLength={200} />
          </label>
          <label>
            Tracking number
            <input name="trackingNumber" maxLength={200} />
          </label>
          <label>
            Shipping condition
            <select name="shippingCondition" defaultValue="ambient">
              {shippingConditions.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label>
            Temperature on arrival (°C)
            <input
              name="temperatureOnArrival"
              type="number"
              step="0.1"
              min={-100}
              max={100}
              placeholder="Optional"
            />
          </label>
          <label>
            Package condition
            <select name="packageCondition" defaultValue="intact">
              {packageConditions.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label>
            Chain-of-custody reference
            <input name="chainOfCustodyReference" maxLength={200} />
          </label>
        </div>
      </fieldset>
      {rows.map((key, i) => {
        const materialType = typeOf(key);
        const finished = isFinishedProduct(materialType);
        const unit = reportingUnit(materialType);
        return (
          <fieldset key={key} className="intake-sample">
            <legend>
              Sample {i + 1}
              {rows.length > 1 && (
                <button
                  type="button"
                  className="link"
                  onClick={() => setRows(rows.filter((k) => k !== key))}
                >
                  Remove
                </button>
              )}
            </legend>
            <div className="fields">
              <label>
                Material type
                <select
                  name={`materialType-${key}`}
                  value={materialType}
                  onChange={(e) =>
                    setTypes({
                      ...types,
                      [key]: e.target.value as MaterialType,
                    })
                  }
                >
                  {materialTypes.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Client sample ID
                <input name={`clientSampleId-${key}`} maxLength={200} />
              </label>
              <label>
                Product name
                <input
                  name={`product-${key}`}
                  required
                  maxLength={200}
                  placeholder="Losartan potassium tablets"
                />
              </label>
              <label>
                Strength
                <input
                  name={`strength-${key}`}
                  maxLength={200}
                  placeholder="50 mg"
                />
              </label>
              <label>
                Batch or lot
                <input name={`batch-${key}`} required maxLength={200} />
              </label>
              <label>
                Manufacturer
                <input name={`manufacturer-${key}`} maxLength={200} />
              </label>
              <label>
                Manufacture date
                <input name={`manufactureDate-${key}`} type="date" />
              </label>
              <fieldset className="pair">
                <legend>Expiry or retest date</legend>
                <select
                  name={`expiryKind-${key}`}
                  aria-label="Expiry or retest"
                  defaultValue="expiry"
                >
                  {expiryKinds.map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </select>
                <input
                  name={`expiryDate-${key}`}
                  type="date"
                  aria-label="Expiry or retest date"
                />
              </fieldset>
              <fieldset className="pair">
                <legend>Quantity received</legend>
                <input
                  name={`quantity-${key}`}
                  type="number"
                  step="any"
                  min={0}
                  required
                  aria-label="Quantity received"
                />
                <select
                  name={`quantityUnit-${key}`}
                  aria-label="Quantity unit"
                  defaultValue="g"
                >
                  {quantityUnits.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </fieldset>
              <fieldset className="pair">
                <legend>Containers</legend>
                <input
                  name={`containerCount-${key}`}
                  type="number"
                  step={1}
                  min={1}
                  defaultValue={1}
                  required
                  aria-label="Number of containers"
                />
                <select
                  name={`containerType-${key}`}
                  aria-label="Container type"
                  defaultValue={containerTypes[0]}
                >
                  {containerTypes.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </fieldset>
              <label className="span-2">
                Condition on receipt
                <input
                  name={`conditionOnReceipt-${key}`}
                  required
                  maxLength={200}
                  placeholder="Intact, seals unbroken"
                />
              </label>
              <label>
                Storage condition
                <input
                  name={`storageCondition-${key}`}
                  maxLength={200}
                  placeholder="Room temperature, 15–25 °C"
                />
              </label>
              <label>
                Storage location
                <input name={`storageLocation-${key}`} maxLength={200} />
              </label>
              {finished && (
                <label>
                  Maximum daily dose (mg/day)
                  <input
                    name={`maximumDailyDose-${key}`}
                    type="number"
                    step="any"
                    min={0}
                    required
                    placeholder="Supplied by the Client"
                  />
                </label>
              )}
              <label>
                Due date
                <input name={`dueDate-${key}`} type="date" required />
              </label>
              <fieldset className="priority">
                <legend>Priority</legend>
                {priorities.map((p) => (
                  <label key={p}>
                    <input
                      type="radio"
                      name={`priority-${key}`}
                      value={p}
                      defaultChecked={p === 'Routine'}
                    />
                    {p}
                  </label>
                ))}
              </fieldset>
            </div>
            {finished && (
              <div className="stability">
                <label className="check">
                  <input
                    type="checkbox"
                    checked={!!stability[key]}
                    onChange={(e) =>
                      setStability({ ...stability, [key]: e.target.checked })
                    }
                  />
                  Stability sample
                </label>
                {stability[key] && (
                  <div className="fields three">
                    <label>
                      Study ID
                      <input name={`studyId-${key}`} required maxLength={200} />
                    </label>
                    <label>
                      Time point
                      <select name={`timePoint-${key}`} defaultValue="Initial">
                        {stabilityTimePoints.map((p) => (
                          <option key={p} value={p}>
                            {p}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Storage condition
                      <select name={`condition-${key}`} defaultValue="RT">
                        {stabilityConditions.map((c) => (
                          <option key={c} value={c}>
                            {c} · {stabilityConditionLabels[c]}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                )}
              </div>
            )}
            <fieldset className="tests">
              <legend>Requested Methods · reported in {unit}</legend>
              {data.methods
                .filter((m) => m.materialTypes.includes(materialType))
                .map((m) => (
                  <label key={m.id}>
                    <input
                      type="checkbox"
                      name={`methods-${key}`}
                      value={m.id}
                    />
                    <span className="strong num">
                      {m.code} v{m.version}
                    </span>
                    <span className="dim">
                      {data.analytes.find((a) => a.id === m.analyteId)?.name}
                    </span>
                    <span className="num r">
                      {m.technique}
                      {finished &&
                        ` · Maximum-dose ceiling ${m.maximumDoseCeiling} mg/day`}
                    </span>
                  </label>
                ))}
            </fieldset>
            <div className="fields">
              <label className="span-2">
                Remarks
                <textarea name={`remarks-${key}`} rows={2} maxLength={2000} />
              </label>
              <label className="span-2">
                Retention or disposal instruction
                <input
                  name={`retention-${key}`}
                  maxLength={200}
                  placeholder="Retain 12 months after publishing, then destroy"
                />
              </label>
              <label>
                Receipt deviation
                <select name={`deviationKind-${key}`} defaultValue="">
                  <option value="">None</option>
                  {receiptDeviationKinds.map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Deviation details
                <input
                  name={`deviationDescription-${key}`}
                  maxLength={1000}
                  placeholder="Puts the Sample on hold until the Client instructs"
                />
              </label>
            </div>
          </fieldset>
        );
      })}
      <div>
        <button
          type="button"
          className="btn sm"
          onClick={() => setRows([...rows, nextKey.current++])}
        >
          Add another Sample
        </button>
      </div>
      {(missing || error) && (
        <div role="alert" className="flash error inline">
          {missing || error}
        </div>
      )}
      <div className="form-foot">
        <span className="dim">
          Submission and Sample IDs are assigned on save.
        </span>
        <button className="btn primary" disabled={disabled}>
          Receive submission
        </button>
      </div>
    </form>
  );
}

/** The receipt record of a Sample and its Submission, as received. */
export function ReceiptRecord({
  sample: s,
  data,
}: {
  sample: Sample;
  data: Snapshot;
}) {
  const submission = data.submissions.find((x) => x.id === s.submissionId);
  const rows = (entries: [string, React.ReactNode][]) =>
    entries.map(([term, value]) => (
      <div key={term}>
        <dt>{term}</dt>
        <dd>
          {value === '' || value === null ? (
            <span className="dim">—</span>
          ) : (
            value
          )}
        </dd>
      </div>
    ));
  return (
    <div className="receipt">
      {submission && (
        <section aria-label={`Submission ${submission.id}`}>
          <h3>Submission {submission.id}</h3>
          <dl>
            {rows([
              [
                'Client',
                `${submission.client} (${submission.clientKind === 'internal' ? 'internal department' : 'external'})`,
              ],
              // Absent on a Submission received before it was recorded.
              [
                'Client contact',
                submission.clientContact ? (
                  contactLine(submission.clientContact)
                ) : (
                  <span className="not-recorded">Not recorded</span>
                ),
              ],
              ['Client reference or PO', submission.clientReference],
              [
                'Received at',
                <>
                  {fullStamp(submission.receivedAt)}
                  {submission.receivedAtCorrection && (
                    <span className="correction">
                      Corrected from{' '}
                      {fullStamp(submission.receivedAtCorrection.recordedAt)}:{' '}
                      {submission.receivedAtCorrection.reason}
                    </span>
                  )}
                </>,
              ],
              [
                'Received by',
                personName(data, submission.receivedBy) ??
                  submission.receivedBy,
              ],
              ['Courier', submission.courier],
              ['Tracking number', submission.trackingNumber],
              ['Shipping condition', submission.shippingCondition],
              [
                'Temperature on arrival',
                submission.temperatureOnArrival === null
                  ? ''
                  : `${submission.temperatureOnArrival} °C`,
              ],
              ['Package condition', submission.packageCondition],
              [
                'Chain-of-custody reference',
                submission.chainOfCustodyReference,
              ],
            ])}
          </dl>
        </section>
      )}
      <section aria-label={`Sample ${s.id}`}>
        <h3>Sample {s.id}</h3>
        <dl>
          {rows([
            ['Client sample ID', s.clientSampleId],
            ['Material type', s.materialType],
            ['Product name', s.product],
            ['Strength', s.strength],
            ['Batch or lot', s.batch],
            ['Manufacturer', s.manufacturer],
            [
              'Manufacture date',
              s.manufactureDate && longDate(s.manufactureDate),
            ],
            [
              s.expiryKind === 'retest' ? 'Retest date' : 'Expiry date',
              s.expiryDate && longDate(s.expiryDate),
            ],
            ['Quantity received', `${s.quantity.value} ${s.quantity.unit}`],
            ['Containers', `${s.containers.count} × ${s.containers.type}`],
            ['Condition on receipt', s.conditionOnReceipt],
            ['Storage condition', s.storageCondition],
            ['Storage location', s.storageLocation],
            ...(isFinishedProduct(s.materialType)
              ? ([
                  [
                    'Maximum daily dose',
                    s.maximumDailyDose === null
                      ? ''
                      : `${s.maximumDailyDose} mg/day`,
                  ],
                  [
                    'Stability sample',
                    s.stability
                      ? `${s.stability.studyId} · ${s.stability.timePoint} · ${s.stability.condition} (${stabilityConditionLabels[s.stability.condition]})`
                      : 'No',
                  ],
                ] as [string, React.ReactNode][])
              : []),
            ['Due date', longDate(s.dueDate)],
            ['Priority', s.priority],
            ['Remarks', s.remarks],
            ['Retention or disposal', s.retentionInstruction],
          ])}
        </dl>
      </section>
    </div>
  );
}

/**
 * A Sample's Receipt deviations, each with the Client's instruction that
 * answered it. A Coordinator records further deviations before work starts
 * and records the instruction that releases or withdraws a held Sample.
 */
export function ReceiptDeviations({
  sample: s,
  data,
  canAct,
  busy,
  execute,
}: {
  sample: Sample;
  data: Snapshot;
  canAct: boolean;
  busy: boolean;
  execute?: Execute;
}) {
  const canRecord =
    canAct && !!execute && ['Received', 'On hold'].includes(s.status);
  const canInstruct = canAct && !!execute && s.status === 'On hold';
  if (!s.deviations.length && !canRecord) return null;
  const submit =
    (draft: (f: FormData) => Draft) =>
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const form = e.currentTarget;
      if (await execute!(draft(new FormData(form)))) form.reset();
    };
  const text = (f: FormData, name: string) => String(f.get(name) ?? '').trim();
  return (
    <section
      className={'deviations' + (s.status === 'On hold' ? ' held' : '')}
      aria-label="Receipt deviations"
    >
      <h3>Receipt deviations</h3>
      {s.deviations.length > 0 && (
        <ol>
          {s.deviations.map((d) => (
            <li key={d.sequence}>
              <div>
                <b>{d.kind}</b> {d.description}
              </div>
              <div className="dim">
                Recorded by {personName(data, d.recordedBy) ?? d.recordedBy},{' '}
                {fullStamp(d.recordedAt)}
              </div>
              {d.instruction ? (
                <div className="instruction">
                  Client instructed{' '}
                  <b>
                    {d.instruction.decision === 'proceed'
                      ? 'proceed'
                      : 'withdraw'}
                  </b>
                  : {d.instruction.contact},{' '}
                  {fullStamp(d.instruction.instructedAt)}
                  <span className="dim">
                    {' '}
                    · recorded by{' '}
                    {personName(data, d.instruction.recordedBy) ??
                      d.instruction.recordedBy}
                    , {fullStamp(d.instruction.recordedAt)}
                  </span>
                </div>
              ) : (
                <div className="instruction pending">
                  Awaiting the Client's instruction.
                </div>
              )}
            </li>
          ))}
        </ol>
      )}
      {canInstruct && (
        <form
          className="deviation-form"
          aria-label="Record the Client's instruction"
          onSubmit={submit((f) => ({
            type: 'recordClientInstruction',
            sampleId: s.id,
            revision: s.revision,
            decision: text(f, 'decision') as 'proceed' | 'withdraw',
            contact: text(f, 'contact'),
            instructedAt: text(f, 'instructedAt')
              ? new Date(text(f, 'instructedAt')).toISOString()
              : '',
          }))}
        >
          <label>
            Client instruction
            <select name="decision" defaultValue="proceed">
              <option value="proceed">Proceed with testing</option>
              <option value="withdraw">Withdraw the Sample</option>
            </select>
          </label>
          <label>
            Given by
            <input
              name="contact"
              required
              maxLength={200}
              placeholder="Name and role at the Client"
            />
          </label>
          <label>
            When
            <input
              type="datetime-local"
              name="instructedAt"
              required
              max={localDateTime(new Date())}
              defaultValue={localDateTime(new Date())}
            />
          </label>
          <button className="btn primary sm" disabled={busy}>
            Record instruction
          </button>
        </form>
      )}
      {canRecord && (
        <details>
          <summary>Record a Receipt deviation</summary>
          <form
            className="deviation-form"
            onSubmit={submit((f) => ({
              type: 'recordReceiptDeviation',
              sampleId: s.id,
              revision: s.revision,
              kind: text(f, 'kind') as (typeof receiptDeviationKinds)[number],
              description: text(f, 'description'),
            }))}
          >
            <label>
              Kind
              <select name="kind" defaultValue="damaged package">
                {receiptDeviationKinds.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </label>
            <label className="wide">
              What was found
              <input
                name="description"
                required
                minLength={3}
                maxLength={1000}
              />
            </label>
            <button className="btn sm" disabled={busy}>
              Record and hold
            </button>
          </form>
        </details>
      )}
    </section>
  );
}
