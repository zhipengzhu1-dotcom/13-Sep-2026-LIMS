import { useState } from 'react';
import { type Certificate } from '../laboratory/certificate';
import {
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
  // The OOS gate, as the core enforces it.
  const blocker = resultsView(s).publishBlocker?.reason ?? null;
  const version = data.certificates
    .filter((c) => c.sampleId === s.id)
    .at(-1)?.version;
  return (
    <form
      className="publish-form"
      aria-label="Publish the Certificate of Analysis"
      onSubmit={(e) => {
        e.preventDefault();
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
        <p className="flash warn inline" role="status">
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
      <button className="btn primary" disabled={busy || !!blocker}>
        Publish{version ? ` version ${version}` : ''}
      </button>
    </form>
  );
}
