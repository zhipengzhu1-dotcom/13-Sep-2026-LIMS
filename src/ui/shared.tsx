import React, { useEffect, useRef } from 'react';
import { utcStamp } from '../laboratory/certificate-renderer';
import {
  conformity,
  type Command,
  type ConformityStatement,
  type Snapshot,
  type Sample,
} from '../laboratory/contracts';

/** The server's mode, from `GET /api/instance`; null until it is known, when
 * nothing demo-only is shown. */
export type InstanceMode = 'demo' | 'production' | null;

export type View =
  | 'Receiving'
  | 'Holds'
  | 'Publish queue'
  | 'Samples'
  | 'My work'
  | 'Approval queue'
  | 'OOS investigations'
  | 'Methods'
  | 'Audit trail'
  | 'Accounts';

export const QUEUES: View[] = [
  'Receiving',
  'Holds',
  'Publish queue',
  'Samples',
  'My work',
  'Approval queue',
];

/** A command as a screen writes it. The key is minted by `execute`, not by the
 * caller, so no screen can reuse one across two separate laboratory acts. */
export type Draft<C = Command> = C extends unknown
  ? Omit<C, 'commandId'>
  : never;

/** Resolves true once the command is saved. A screen that shows its own
 * errors (a signing dialog) passes `onError` instead of the page flash. */
export type Execute = (
  command: Draft,
  options?: { onError?: (message: string) => void },
) => Promise<boolean>;

/** No further work: published, or withdrawn by the Client. An approved Sample
 * is still waiting to be Published. */
export const closed = (s: Sample) =>
  s.status === 'Published' || s.status === 'Withdrawn';

export const shortDate = (value: string) =>
  new Date(
    value.length === 10 ? value + 'T12:00:00' : value,
  ).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

export const longDate = (value: string) =>
  new Date(
    value.length === 10 ? value + 'T12:00:00' : value,
  ).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

export const stamp = (value: string) =>
  new Date(value).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

/** Whole calendar days from today to a YYYY-MM-DD due date, in local time. */
export function daysUntil(dueDate: string) {
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const due = new Date(dueDate + 'T12:00:00');
  return Math.round((due.getTime() - today.getTime()) / 86400000);
}

export const initials = (name: string | undefined) =>
  name
    ?.split(' ')
    .map((n) => n[0])
    .join('') ?? '—';

export const statusClass = (s: Sample) =>
  s.status.toLowerCase().replaceAll(' ', '-');

export const personName = (data: Snapshot, id: string | null) =>
  data.people.find((p) => p.id === id)?.name;

export function Icon({ name }: { name: string }) {
  const paths: Record<string, React.ReactNode> = {
    Receiving: (
      <>
        <path d="M3 13h5l1.5 3h5L16 13h5" />
        <path d="M5 13 7 5h10l2 8v6H5v-6Z" />
      </>
    ),
    Holds: (
      <>
        <rect x="4" y="4" width="16" height="16" rx="2" />
        <path d="M10 9v6m4-6v6" />
      </>
    ),
    'Publish queue': (
      <>
        <path d="M14 3H6v18h12V7l-4-4Z" />
        <path d="M14 3v4h4M9 14l3-3 3 3m-3-3v6" />
      </>
    ),
    Samples: (
      <>
        <rect x="3" y="4" width="18" height="17" rx="2" />
        <path d="M8 2v4m8-4v4M3 10h18m-13 5h3m3 0h3" />
      </>
    ),
    'My work': (
      <>
        <path d="M9 4h6l1 3h4v14H4V7h4l1-3Z" />
        <path d="m8 14 3 3 5-6" />
      </>
    ),
    'Approval queue': (
      <>
        <path d="m12 2 8 4v6c0 5-8 10-8 10S4 17 4 12V6l8-4Z" />
        <path d="m8 12 3 3 5-6" />
      </>
    ),
    'OOS investigations': (
      <>
        <path d="M12 3 2 20h20L12 3Z" />
        <path d="M12 10v4m0 3v.01" />
      </>
    ),
    Methods: (
      <>
        <path d="M4 4h7l1 2 1-2h7v16h-7l-1 2-1-2H4Z" />
        <path d="M12 6v13M7 9h2m6 0h2M7 13h2m6 0h2" />
      </>
    ),
    'Audit trail': (
      <>
        <path d="M3 12a9 9 0 1 0 3-7L3 8m0-5v5h5" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    Accounts: (
      <>
        <circle cx="9" cy="8" r="3.5" />
        <path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7m2.5 8.5a6.5 6.5 0 0 0-3-5.5" />
      </>
    ),
  };
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name] ?? paths.Samples}
    </svg>
  );
}

/** The element id of an investigation in the Sample's OOS investigations. */
export const investigationAnchor = (id: string) => `investigation-${id}`;

/** An investigation reference that links to it in the Sample's OOS
 * investigations. */
export const InvestigationLink = ({ id }: { id: string }) => (
  <a className="link num" href={`#${investigationAnchor(id)}`}>
    {id}
  </a>
);

/** The core's text word for word, with the investigation it names, if any,
 * linked to that investigation. */
export function InvestigationLinkedText({
  text,
  id,
}: {
  text: string;
  id: string | null;
}) {
  const at = id ? text.indexOf(id) : -1;
  if (at < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, at)}
      <InvestigationLink id={id!} />
      {text.slice(at + id!.length)}
    </>
  );
}

/** The visible mark of a required field, beside its label text. The control
 * itself carries `required`, so assistive technology is told once. */
export const RequiredMark = () => (
  <span className="required-mark" aria-hidden="true">
    required
  </span>
);

export function Status({ sample }: { sample: Sample }) {
  return (
    <span className={'status ' + statusClass(sample)}>{sample.status}</span>
  );
}

export function Due({ sample }: { sample: Sample }) {
  const days = daysUntil(sample.dueDate);
  const open = !closed(sample);
  const tone = !open ? '' : days < 0 ? 'late' : days === 0 ? 'today' : '';
  const label = !open
    ? ''
    : days < 0
      ? `${-days}d late`
      : days === 0
        ? 'Today'
        : `${days}d`;
  return (
    <span className={'due ' + tone} title={longDate(sample.dueDate)}>
      <span className="due-date">{shortDate(sample.dueDate)}</span>
      {label && <span className="due-left">{label}</span>}
    </span>
  );
}

export function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      className="modal"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      aria-label={title}
    >
      <div className="modal-head">
        <h2>{title}</h2>
        <button
          className="icon-btn"
          aria-label="Close dialog"
          onClick={onClose}
        >
          ×
        </button>
      </div>
      {children}
    </dialog>
  );
}

export const fullStamp = (value: string) =>
  new Date(value).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZoneName: 'short',
  });

/** A date and time as a signature manifestation shows it: in UTC with the
 * zone named, exactly as the Certificate of Analysis prints it, so every
 * viewer reads the same stamp wherever they are. */
export const signatureStamp = utcStamp;

/** Marks a signature that no longer matches its Signed content. */
export function InvalidSignatureTag() {
  // The space keeps the words apart for assistive technology.
  return (
    <>
      {' '}
      <span className="cert-tag invalid">Signature invalid</span>
    </>
  );
}

export function ConformityTag({
  statement,
}: {
  statement: ConformityStatement;
}) {
  return (
    <span
      className={'conformity ' + statement.toLowerCase().replace(/\s+/g, '-')}
    >
      {statement}
    </span>
  );
}
