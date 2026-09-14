import { useId, useState } from 'react';
import { type Certificate } from '../laboratory/certificate';
import {
  invalidSignatureRefusal,
  issueChannels,
  type Snapshot,
  type Sample,
} from '../laboratory/contracts';
import { resultsView } from '../laboratory/results';
import { localDateTime } from './receiving';
import { type Execute } from './shared';

/** Recipients as a Coordinator types them: one per line, or separated by
 * commas or semicolons. */
export const recipientList = (value: string) =>
  value
    .split(/[\n,;]/)
    .map((r) => r.trim())
    .filter(Boolean);

/** Records how and when the approved Certificate was issued to the Client.
 * The system does not send the document. */
export function PublishForm({
  sample: s,
  data,
  busy,
  execute,
}: {
  sample: Sample;
  data: Snapshot;
  busy: boolean;
  execute: Execute;
}) {
  const [channel, setChannel] =
    useState<(typeof issueChannels)[number]>('email');
  // An invalid signature, then the OOS gate, as the core enforces them.
  const blocker =
    invalidSignatureRefusal(data.signatures, s.id) ??
    resultsView(s).publishBlocker?.reason ??
    null;
  const blockerId = useId();
  const version = data.certificates
    .filter((c) => c.sampleId === s.id)
    .at(-1)?.version;
  return (
    <form
      className="publish-form"
      aria-label="Publish the Certificate of Analysis"
      onSubmit={(e) => {
        e.preventDefault();
        if (blocker) return;
        const f = new FormData(e.currentTarget);
        const when = String(f.get('publishedAt') ?? '');
        void execute({
          type: 'publish',
          sampleId: s.id,
          revision: s.revision,
          recipients: recipientList(String(f.get('recipients') ?? '')),
          channel,
          channelDetail: String(f.get('channelDetail') ?? '').trim(),
          publishedAt: when ? new Date(when).toISOString() : '',
        });
      }}
    >
      {blocker && (
        <p id={blockerId} className="flash warn inline" role="status">
          {blocker}
        </p>
      )}
      <label className="wide">
        Recipients
        <textarea
          name="recipients"
          required
          rows={2}
          maxLength={4000}
          placeholder="One per line: name and email or department"
        />
      </label>
      <label>
        Issued by
        <select
          name="channel"
          value={channel}
          onChange={(e) =>
            setChannel(e.target.value as (typeof issueChannels)[number])
          }
        >
          {issueChannels.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>
      <label>
        {channel === 'other' ? 'How' : 'Details (optional)'}
        <input
          name="channelDetail"
          maxLength={200}
          required={channel === 'other'}
          placeholder={
            channel === 'other' ? 'Required: how it was issued' : undefined
          }
        />
      </label>
      <label>
        When
        <input
          type="datetime-local"
          name="publishedAt"
          required
          max={localDateTime(new Date())}
          defaultValue={localDateTime(new Date())}
        />
      </label>
      <button
        className="btn primary"
        disabled={busy}
        // Blocked but focusable, its reason the visible note.
        aria-disabled={blocker ? true : undefined}
        aria-describedby={blocker ? blockerId : undefined}
      >
        Publish{version ? ` version ${version}` : ''}
      </button>
    </form>
  );
}
