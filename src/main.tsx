import React, {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createRoot } from 'react-dom/client';
import {
  auditsSample,
  conformity,
  currentResult,
  decisionRule,
  enteredResultOn,
  limitInForce,
  materialTypes,
  newCommandId,
  qualify,
  reportingUnit,
  signatureMeanings,
  type AcceptableIntake,
  type AuditEntry,
  type AuditValue,
  type Command,
  type ConformityStatement,
  type MaterialType,
  type Qualifier,
  type Result,
  type Snapshot,
  type Sample,
  type SampleReceipt,
  type Signature,
  type SigningCommandType,
  type Test,
} from './laboratory/contracts';
import './styles.css';

type View =
  | 'Receiving'
  | 'Samples'
  | 'My work'
  | 'Approval queue'
  | 'Methods'
  | 'Audit trail';
const QUEUES: View[] = ['Receiving', 'Samples', 'My work', 'Approval queue'];

/** A command as a screen writes it. The key is minted by `execute`, not by the
 * caller, so no screen can reuse one across two separate laboratory acts. */
type Draft<C = Command> = C extends unknown ? Omit<C, 'commandId'> : never;
/** Resolves true once the command is saved. A screen that shows its own
 * errors (a signing dialog) passes `onError` instead of the page flash. */
type Execute = (
  command: Draft,
  options?: { onError?: (message: string) => void },
) => Promise<boolean>;

/** Each role's own queue is a permission, not a preference: a Coordinator
 * receives Submissions, assigns them from Receiving and oversees the whole
 * register; an Analyst only ever acts on Samples assigned to them; a Manager
 * only ever acts on Samples awaiting approval. No one can act outside their
 * queue (the server enforces this — see `requireRole` and
 * `requireAssignedAnalyst` in laboratory.ts), so there is no reason to show
 * them a queue they cannot use. */
function viewsForRole(role: string | undefined): View[] {
  if (role === 'analyst') return ['My work', 'Methods', 'Audit trail'];
  if (role === 'manager') return ['Approval queue', 'Methods', 'Audit trail'];
  return ['Receiving', 'Samples', 'Methods', 'Audit trail'];
}
function defaultViewForRole(role: string | undefined): View {
  return viewsForRole(role)[0];
}

/** The rows a queue view starts from, before any filter or search. Counts in
 * the filter bar are taken from this set, so a role never sees totals for
 * samples outside its own queue. */
function baseSet(view: View, samples: Sample[], actor: string) {
  if (view === 'Receiving')
    return samples.filter((s) => s.status === 'Received');
  if (view === 'My work')
    return samples.filter(
      (s) =>
        s.assignee === actor &&
        (s.status === 'In progress' || s.status === 'Returned'),
    );
  if (view === 'Approval queue')
    return samples.filter((s) => s.status === 'Awaiting approval');
  return samples;
}

const FILTERS = [
  'Active',
  'Received',
  'In progress',
  'Returned',
  'Awaiting approval',
  'Approved',
  'All',
] as const;
type Filter = (typeof FILTERS)[number];
function matches(s: Sample, f: Filter) {
  if (f === 'All') return true;
  if (f === 'Active') return s.status !== 'Approved';
  // A returned sample is back at the analytical bench, so it is still work in
  // progress; "Returned" narrows to just those.
  if (f === 'In progress')
    return s.status === 'In progress' || s.status === 'Returned';
  return s.status === f;
}

const STATUS_ORDER: Sample['status'][] = [
  'Received',
  'In progress',
  'Returned',
  'Awaiting approval',
  'Approved',
];
type SortKey = 'due' | 'id' | 'status';

const shortDate = (value: string) =>
  new Date(
    value.length === 10 ? value + 'T12:00:00' : value,
  ).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
const longDate = (value: string) =>
  new Date(
    value.length === 10 ? value + 'T12:00:00' : value,
  ).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
const stamp = (value: string) =>
  new Date(value).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
/** Whole calendar days from today to a YYYY-MM-DD due date, in local time. */
function daysUntil(dueDate: string) {
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const due = new Date(dueDate + 'T12:00:00');
  return Math.round((due.getTime() - today.getTime()) / 86400000);
}
const initials = (name: string | undefined) =>
  name
    ?.split(' ')
    .map((n) => n[0])
    .join('') ?? '—';
const statusClass = (s: Sample) => s.status.toLowerCase().replaceAll(' ', '-');
const personName = (data: Snapshot, id: string | null) =>
  data.people.find((p) => p.id === id)?.name;

function Icon({ name }: { name: string }) {
  const paths: Record<string, React.ReactNode> = {
    Receiving: (
      <>
        <path d="M3 13h5l1.5 3h5L16 13h5" />
        <path d="M5 13 7 5h10l2 8v6H5v-6Z" />
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

function Status({ sample }: { sample: Sample }) {
  return (
    <span className={'status ' + statusClass(sample)}>{sample.status}</span>
  );
}

function Due({ sample }: { sample: Sample }) {
  const days = daysUntil(sample.dueDate);
  const open = sample.status !== 'Approved';
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

const PANEL_WIDTH_KEY = 'benchline:panel-width';
const PANEL_DEFAULT = 560;
/** Neither pane may be dragged narrower than this, so the divider can never
 * hide the register or the open sample. CSS enforces the same floor when the
 * window itself shrinks. */
const PANE_MIN = 360;
/** Width of the divider's grid track; must match `.workspace.has-sample`. */
const SPLITTER_WIDTH = 7;

/** The widest the sample panel may be in a workspace of the given width, so
 * the register keeps its floor. */
function panelMax(workspaceWidth: number) {
  return Math.max(PANE_MIN, workspaceWidth - SPLITTER_WIDTH - PANE_MIN);
}
function clampPanel(width: number, workspaceWidth: number) {
  return Math.round(
    Math.max(PANE_MIN, Math.min(panelMax(workspaceWidth), width)),
  );
}

/** The divider between the register and the open sample. Drag it, or focus it
 * and use the arrow keys (Shift for bigger steps); double-click restores the
 * default width. Esc cancels a drag and restores the width it started from.
 * `width` is the width actually displayed, already clamped to `max`. */
function Splitter({
  width,
  max,
  onChange,
}: {
  width: number;
  max: number;
  onChange: (width: number) => void;
}) {
  const clamp = (w: number) => Math.round(Math.max(PANE_MIN, Math.min(max, w)));
  // Ends the drag in progress, if any. Kept in a ref so the drag also ends when
  // the divider unmounts mid-drag (for example the sample is closed), and the
  // page is never left with a resize cursor or disabled text selection.
  const endDrag = useRef<(() => void) | null>(null);
  useEffect(() => () => endDrag.current?.(), []);
  return (
    <div
      className="splitter"
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize sample panel"
      aria-valuenow={width}
      aria-valuemin={PANE_MIN}
      aria-valuemax={max}
      tabIndex={0}
      title="Drag to resize. Double-click to reset."
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        e.preventDefault();
        endDrag.current?.();
        const el = e.currentTarget;
        el.setPointerCapture(e.pointerId);
        el.focus();
        const startX = e.clientX;
        const startWidth = width;
        const move = (m: PointerEvent) =>
          onChange(clamp(startWidth + startX - m.clientX));
        const end = () => {
          el.removeEventListener('pointermove', move);
          el.removeEventListener('pointerup', end);
          el.removeEventListener('pointercancel', end);
          el.removeEventListener('lostpointercapture', end);
          window.removeEventListener('keydown', cancel, true);
          if (el.hasPointerCapture(e.pointerId))
            el.releasePointerCapture(e.pointerId);
          document.body.classList.remove('resizing');
          endDrag.current = null;
        };
        // Captured on window so it runs before the app's own Esc handling,
        // which would otherwise close the sample underneath the drag.
        const cancel = (k: KeyboardEvent) => {
          if (k.key !== 'Escape') return;
          k.preventDefault();
          k.stopImmediatePropagation();
          end();
          onChange(startWidth);
        };
        el.addEventListener('pointermove', move);
        el.addEventListener('pointerup', end);
        el.addEventListener('pointercancel', end);
        el.addEventListener('lostpointercapture', end);
        window.addEventListener('keydown', cancel, true);
        document.body.classList.add('resizing');
        endDrag.current = end;
      }}
      onDoubleClick={() => onChange(clamp(PANEL_DEFAULT))}
      onKeyDown={(e) => {
        const step = e.shiftKey ? 80 : 20;
        if (e.key === 'ArrowLeft') onChange(clamp(width + step));
        else if (e.key === 'ArrowRight') onChange(clamp(width - step));
        else if (e.key === 'Home') onChange(clamp(PANEL_DEFAULT));
        else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
          // Vertical arrows mean nothing to a vertical divider; they must not
          // fall through to the register's row navigation.
        } else return;
        e.preventDefault();
      }}
    />
  );
}

function App() {
  const [data, setData] = useState<Snapshot | null>(null);
  // undefined while the session is being checked; null when signed out.
  const [user, setUser] = useState<SessionUser | null | undefined>(undefined);
  const [signInMessage, setSignInMessage] = useState('');
  const actor = user?.id ?? '';
  const [view, setView] = useState<View>('Receiving');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('Active');
  const [sort, setSort] = useState<{ key: SortKey; asc: boolean }>({
    key: 'due',
    asc: true,
  });
  const [selected, setSelected] = useState<string | null>(null);
  const [intake, setIntake] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loadedAt, setLoadedAt] = useState<Date | null>(null);
  const pending = useRef<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [workspaceEl, setWorkspaceEl] = useState<HTMLDivElement | null>(null);
  // Until the workspace is laid out, the window is the best estimate of it.
  const [workspaceWidth, setWorkspaceWidth] = useState(() => window.innerWidth);
  useEffect(() => {
    if (!workspaceEl) return;
    const measure = () => setWorkspaceWidth(workspaceEl.clientWidth);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(workspaceEl);
    return () => observer.disconnect();
  }, [workspaceEl]);
  const [panelWidth, setPanelWidth] = useState(() => {
    try {
      const stored = Number(localStorage.getItem(PANEL_WIDTH_KEY));
      // A width stored on a wider screen is clamped to this window, so the
      // first drag moves the divider at once instead of eating the excess.
      return stored >= PANE_MIN
        ? clampPanel(stored, window.innerWidth)
        : PANEL_DEFAULT;
    } catch {
      return PANEL_DEFAULT;
    }
  });
  // The width actually shown: the chosen width, narrowed to fit the workspace.
  const shownPanelWidth = clampPanel(panelWidth, workspaceWidth);
  useEffect(() => {
    try {
      localStorage.setItem(PANEL_WIDTH_KEY, String(panelWidth));
    } catch {
      // Per-viewer convenience only; blocked storage just means the divider
      // starts at its default width next visit.
    }
  }, [panelWidth]);
  /** The server ended the session (sign-out elsewhere, inactivity, restart). */
  function sessionEnded(message: string) {
    pending.current = null;
    setUser(null);
    setData(null);
    setSelected(null);
    setIntake(false);
    setError('');
    setNotice('');
    setSignInMessage(message);
  }
  async function reload() {
    const response = await fetch('/api/workspace');
    if (response.status === 401) {
      sessionEnded('Your session has ended. Sign in to continue.');
      return;
    }
    if (!response.ok)
      throw new Error('The workspace is unavailable. Use Refresh to retry.');
    setData(await response.json());
    setLoadedAt(new Date());
  }
  function refresh() {
    setError('');
    reload().catch((e) => setError(e.message));
  }
  function signedIn(next: SessionUser) {
    setUser(next);
    setSignInMessage('');
    navigate(defaultViewForRole(next.role));
    refresh();
  }
  async function signOut() {
    try {
      await fetch('/api/sign-out', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });
    } finally {
      sessionEnded('You have signed out.');
    }
  }
  useEffect(() => {
    fetch('/api/session')
      .then(async (response) => {
        if (!response.ok) return setUser(null);
        signedIn((await response.json()).user);
      })
      .catch(() => {
        setUser(null);
        setSignInMessage('The server is unavailable. Try again shortly.');
      });
  }, []);
  async function execute(
    draft: Draft,
    { onError = setError }: { onError?: (message: string) => void } = {},
  ) {
    setBusy(true);
    setError('');
    setNotice('');
    // One key per act of submission. It is minted when the user commits to the
    // act and kept until the server answers definitively, so every retry of the
    // same attempt carries it and deduplicates. `busy` gates the interface, so
    // at most one submission is ever in flight.
    pending.current ??= newCommandId();
    const command = { ...draft, commandId: pending.current } as Command;
    try {
      const response = await fetch('/api/commands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(command),
      });
      if (response.status === 401) {
        sessionEnded(
          'Your session has ended, so this change was not saved. Sign in to continue.',
        );
        return false;
      }
      const result = await response.json();
      // A rejected command rolled back and released its key, so the next
      // attempt is a new act and mints a new one.
      if (!response.ok) {
        pending.current = null;
        throw new Error(result.error);
      }
      try {
        await reload();
      } catch {
        // The command committed but the workspace did not refresh. Keep the key:
        // if this form is submitted again it is a retry of the same act, and the
        // server will return the original result rather than recording it twice.
        onError(
          'Your change was saved, but the workspace could not refresh. Use Refresh before continuing.',
        );
        return false;
      }
      pending.current = null;
      setNotice(
        result.outcome === 'replayed'
          ? `Already recorded at ${stamp(result.originallyAppliedAt)}. Nothing was saved twice.`
          : command.type === 'receiveSubmission'
            ? `${result.submission.id} received with ${result.samples.length === 1 ? 'Sample' : 'Samples'} ${result.samples.map((s: Sample) => s.id).join(', ')}.`
            : `${result.samples[0].id} saved to the laboratory record.`,
      );
      if (command.type === 'receiveSubmission')
        setSelected(result.samples[0].id);
      return true;
    } catch (e) {
      onError(
        e instanceof Error ? e.message : 'Unable to save. Please try again.',
      );
      return false;
    } finally {
      setBusy(false);
    }
  }

  const person = user ?? undefined;
  const roleViews = viewsForRole(person?.role);
  const isQueue = QUEUES.includes(view);
  const base = useMemo(
    () => (data ? baseSet(view, data.samples, actor) : []),
    [data, view, actor],
  );
  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    const rows = base.filter(
      (s) =>
        matches(s, filter) &&
        `${s.id} ${s.submissionId} ${s.product} ${s.client} ${s.batch}`
          .toLowerCase()
          .includes(q),
    );
    const dir = sort.asc ? 1 : -1;
    return rows.sort((a, b) => {
      if (sort.key === 'id') return a.id.localeCompare(b.id) * dir;
      if (sort.key === 'status')
        return (
          (STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status)) *
          dir
        );
      // Due order puts urgent work first on the same day.
      return (
        (a.dueDate.localeCompare(b.dueDate) ||
          (a.priority === b.priority ? 0 : a.priority === 'Urgent' ? -1 : 1)) *
        dir
      );
    });
  }, [base, filter, search, sort]);
  const sample = data?.samples.find((s) => s.id === selected);
  const queueCount = (v: View) =>
    data && v !== 'Samples' && QUEUES.includes(v)
      ? baseSet(v, data.samples, actor).length
      : 0;

  function navigate(next: View) {
    setView(next);
    setFilter('Active');
    setSearch('');
    setSelected(null);
  }
  function toggleSort(key: SortKey) {
    setSort((s) => ({ key, asc: s.key === key ? !s.asc : true }));
  }

  // Keyboard-first operation: move through the queue without reaching for
  // the mouse between instrument runs. Typing in a field is never hijacked.
  const keyState = useRef({ visible, selected, isQueue, busy, person });
  useLayoutEffect(() => {
    keyState.current = { visible, selected, isQueue, busy, person };
  });
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target;
      // A key a focused control already handled (such as the divider's arrow
      // keys) is not also a register command.
      if (
        e.defaultPrevented ||
        e.metaKey ||
        e.ctrlKey ||
        e.altKey ||
        (t instanceof Element && t.closest('input, textarea, select, dialog'))
      )
        return;
      const k = keyState.current;
      if (e.key === '/') {
        e.preventDefault();
        searchRef.current?.focus();
      } else if (e.key === 'Escape' && k.selected) {
        setSelected(null);
      } else if (e.key === 'r' && !k.busy) {
        refresh();
      } else if (e.key === 'n' && k.person?.role === 'coordinator') {
        setError('');
        setIntake(true);
      } else if (
        k.isQueue &&
        k.visible.length &&
        ['j', 'k', 'ArrowDown', 'ArrowUp'].includes(e.key)
      ) {
        e.preventDefault();
        const step = e.key === 'j' || e.key === 'ArrowDown' ? 1 : -1;
        const i = k.visible.findIndex((s) => s.id === k.selected);
        const next =
          i === -1
            ? step > 0
              ? 0
              : k.visible.length - 1
            : Math.min(k.visible.length - 1, Math.max(0, i + step));
        setSelected(k.visible[next].id);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  useEffect(() => {
    if (selected)
      document
        .querySelector(`[data-sample="${selected}"]`)
        ?.scrollIntoView({ block: 'nearest' });
  }, [selected]);

  if (user === undefined) return <p className="blank">Loading…</p>;
  if (user === null)
    return <SignIn message={signInMessage} onSignedIn={signedIn} />;

  return (
    <div className="app">
      <nav className="rail" aria-label="Main navigation">
        <button
          className="mark"
          onClick={() => navigate(defaultViewForRole(person?.role))}
          aria-label="Benchline home"
        >
          b
        </button>
        {roleViews.map((v) => (
          <button
            key={v}
            className="rail-item"
            aria-current={view === v ? 'page' : undefined}
            onClick={() => navigate(v)}
          >
            <Icon name={v} />
            <span>{v === 'Approval queue' ? 'Approval' : v}</span>
            {queueCount(v) > 0 && <b className="rail-count">{queueCount(v)}</b>}
          </button>
        ))}
      </nav>
      <div className="shell">
        <header className="topbar">
          <h1>
            {view === 'Samples'
              ? 'Sample register'
              : view === 'Methods'
                ? 'Methods & Limits'
                : view}
            {isQueue && data && <span className="h-count">{base.length}</span>}
          </h1>
          {isQueue && (
            <label className="search">
              <svg
                viewBox="0 0 24 24"
                width="15"
                height="15"
                aria-hidden="true"
              >
                <circle
                  cx="11"
                  cy="11"
                  r="6.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                />
                <path
                  d="m16 16 4.5 4.5"
                  stroke="currentColor"
                  strokeWidth="2"
                />
              </svg>
              <input
                ref={searchRef}
                aria-label="Search samples"
                placeholder="Sample, Submission, product, Client or batch"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setSearch('');
                    e.currentTarget.blur();
                  }
                }}
              />
              <kbd>/</kbd>
            </label>
          )}
          <div className="top-actions">
            <button className="btn" disabled={busy} onClick={refresh}>
              Refresh
            </button>
            {person?.role === 'coordinator' && (
              <button
                className="btn primary"
                disabled={!data}
                onClick={() => {
                  setError('');
                  setIntake(true);
                }}
              >
                Receive submission
              </button>
            )}
            <div className="user" aria-label="Signed-in user">
              <span className="avatar" aria-hidden="true">
                {initials(user.name)}
              </span>
              <span className="user-id">
                <b>{user.name}</b>
                <small>{user.role}</small>
              </span>
              <button
                className="btn sm"
                disabled={busy}
                onClick={() => void signOut()}
              >
                Sign out
              </button>
            </div>
          </div>
        </header>
        {isQueue && data && (
          <div className="filters" role="toolbar" aria-label="Filter by status">
            {FILTERS.map((f) => {
              const n = base.filter((s) => matches(s, f)).length;
              return (
                <button
                  key={f}
                  className={'seg seg-' + f.toLowerCase().replaceAll(' ', '-')}
                  aria-pressed={filter === f}
                  data-empty={n === 0 || undefined}
                  onClick={() => setFilter(f)}
                >
                  <span className="seg-dot" aria-hidden="true" />
                  {f}
                  <span className="seg-n">{n}</span>
                </button>
              );
            })}
          </div>
        )}
        {(error || notice) && !intake && (
          <div
            role={error ? 'alert' : 'status'}
            className={'flash ' + (error ? 'error' : 'ok')}
          >
            <span>{error || notice}</span>
            <button
              className="flash-close"
              aria-label="Dismiss message"
              onClick={() => {
                setError('');
                setNotice('');
              }}
            >
              ×
            </button>
          </div>
        )}
        {!data ? (
          <div className="blank">
            {error
              ? 'The workspace did not load. Use Refresh to retry.'
              : 'Loading the laboratory workspace…'}
          </div>
        ) : isQueue ? (
          <div
            ref={setWorkspaceEl}
            className={'workspace' + (sample ? ' has-sample' : '')}
            style={
              {
                '--panel-width': `${shownPanelWidth}px`,
              } as React.CSSProperties
            }
          >
            <section className="register" aria-label="Samples">
              <div className="scroll">
                {/* A single-select grid: each row reports whether it is the
                    open sample, so assistive technology hears the selection
                    that j/k and the arrow keys move. */}
                <table
                  className="grid"
                  role="grid"
                  aria-label="Sample register"
                  aria-readonly="true"
                  aria-multiselectable="false"
                >
                  <thead>
                    <tr>
                      <SortHead k="id" sort={sort} onSort={toggleSort}>
                        Sample
                      </SortHead>
                      <SortHead k="status" sort={sort} onSort={toggleSort}>
                        Status
                      </SortHead>
                      <SortHead k="due" sort={sort} onSort={toggleSort}>
                        Due
                      </SortHead>
                      <th>Tests</th>
                      <th>Product · Material type</th>
                      <th>Client · batch</th>
                      <th>Analyst</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map((s) => {
                      const analyst = data.people.find(
                        (p) => p.id === s.assignee,
                      );
                      return (
                        <tr
                          key={s.id}
                          data-sample={s.id}
                          className={'row ' + statusClass(s)}
                          aria-selected={s.id === selected}
                          onClick={() => {
                            setSelected(s.id);
                            setError('');
                          }}
                        >
                          <td className="c-id">
                            <button
                              className="id-link"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelected(s.id);
                                setError('');
                              }}
                            >
                              {s.id}
                            </button>
                            {s.priority === 'Urgent' && (
                              <span className="urgent" title="Urgent">
                                Urgent
                              </span>
                            )}
                          </td>
                          <td>
                            <Status sample={s} />
                          </td>
                          <td>
                            <Due sample={s} />
                          </td>
                          <td>
                            <span className="pips" aria-hidden="true">
                              {s.tests.map((t) => (
                                <i
                                  key={t.id}
                                  className={
                                    currentResult(t) ? 'entered' : undefined
                                  }
                                />
                              ))}
                            </span>
                            <span className="num">
                              {s.tests.filter((t) => currentResult(t)).length}/
                              {s.tests.length}
                            </span>
                          </td>
                          <td className="c-product" title={s.product}>
                            {s.product}
                            <span className="batch">{s.materialType}</span>
                          </td>
                          <td className="c-client">
                            {s.client}
                            <span className="batch">{s.batch}</span>
                          </td>
                          <td>
                            {analyst ? (
                              <span className="who">
                                <span className="avatar sm">
                                  {initials(analyst.name)}
                                </span>
                                {analyst.name}
                              </span>
                            ) : (
                              <span className="dim">Unassigned</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {!visible.length && (
                  <div className="blank">
                    {base.length
                      ? 'No samples match this filter. Choose All or clear the search.'
                      : view === 'My work'
                        ? 'Nothing assigned to you needs work right now.'
                        : view === 'Approval queue'
                          ? 'No Samples are awaiting approval.'
                          : view === 'Receiving'
                            ? 'Every received Sample is assigned. Receive a Submission to add more.'
                            : 'No Samples yet. Receive a Submission to start.'}
                  </div>
                )}
              </div>
            </section>
            {/* With no sample open the register keeps the whole width; the
                panel and its divider only appear once there is something to
                show in them. */}
            {sample && (
              <>
                <Splitter
                  width={shownPanelWidth}
                  max={panelMax(workspaceWidth)}
                  onChange={setPanelWidth}
                />
                <section className="panel" aria-label="Sample">
                  <SamplePanel
                    key={sample.id}
                    sample={sample}
                    data={data}
                    actor={actor}
                    busy={busy}
                    execute={execute}
                    onClose={() => setSelected(null)}
                  />
                </section>
              </>
            )}
          </div>
        ) : view === 'Methods' ? (
          <div className="scroll page">
            <table className="grid">
              <thead>
                <tr>
                  <th>Method</th>
                  <th>Version</th>
                  <th>Analyte</th>
                  <th>Technique</th>
                  <th>Material types · reporting unit</th>
                  <th className="r">LOD / LOQ, ng/day</th>
                  <th className="r">LOD / LOQ, ppm</th>
                </tr>
              </thead>
              <tbody>
                {data.methods.map((m) => (
                  <tr key={m.id}>
                    <td className="strong num">{m.code}</td>
                    <td className="num">v{m.version}</td>
                    <td>
                      {data.analytes.find((a) => a.id === m.analyteId)?.name}
                    </td>
                    <td>{m.technique}</td>
                    <td>
                      {m.materialTypes
                        .map((t) => `${t} (${reportingUnit(t)})`)
                        .join(', ')}
                    </td>
                    <td className="r num">
                      {m.lodLoq['ng/day'].lod} / {m.lodLoq['ng/day'].loq}
                    </td>
                    <td className="r num">
                      {m.lodLoq.ppm.lod} / {m.lodLoq.ppm.loq}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="footnote">
              Each Test copies its Method code, version, Analyte and the LOD/LOQ
              pair for the Sample's Material type when the Sample is received. A
              Result below the LOD is reported as {'< LOD'}, from the LOD up to
              but not including the LOQ as {'< LOQ'}. Illustrative Methods and
              values only.
            </p>
            <AcceptableIntakeTable data={data} />
          </div>
        ) : (
          <div className="scroll page">
            <AuditTable entries={data.audit} data={data} showSample />
          </div>
        )}
        <footer className="statusbar">
          <span className="demo">Demo</span>
          <span>
            Fictional data. Not validated for regulated laboratory records.
          </span>
          <span className="spacer" />
          {isQueue && data && (
            <span className="hints">
              <kbd>j</kbd>
              <kbd>k</kbd> move <kbd>/</kbd> search <kbd>Esc</kbd> close{' '}
              <kbd>r</kbd> refresh
              {person?.role === 'coordinator' && (
                <>
                  {' '}
                  <kbd>n</kbd> receive
                </>
              )}
            </span>
          )}
          {busy && <span className="saving">Saving…</span>}
          {loadedAt && (
            <span>
              Updated{' '}
              {loadedAt.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
              })}
            </span>
          )}
          {isQueue && data && (
            <span>
              {visible.length} of {base.length} shown
            </span>
          )}
        </footer>
      </div>
      {intake && data && (
        <Modal
          title="Receive submission"
          onClose={() => {
            if (!busy) {
              setIntake(false);
              setError('');
            }
          }}
        >
          <Intake
            data={data}
            disabled={busy || person?.role !== 'coordinator'}
            error={error}
            onSubmit={async (c) => {
              if (await execute(c)) setIntake(false);
            }}
          />
        </Modal>
      )}
    </div>
  );
}

function SortHead({
  k,
  sort,
  onSort,
  children,
}: {
  k: SortKey;
  sort: { key: SortKey; asc: boolean };
  onSort: (k: SortKey) => void;
  children: React.ReactNode;
}) {
  const active = sort.key === k;
  return (
    <th
      aria-sort={active ? (sort.asc ? 'ascending' : 'descending') : undefined}
    >
      <button className="sort" onClick={() => onSort(k)}>
        {children}
        <span className={'caret' + (active ? ' on' : '')} aria-hidden="true">
          {active && !sort.asc ? '▾' : '▴'}
        </span>
      </button>
    </th>
  );
}

function Modal({
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

function Intake({
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
  const [missing, setMissing] = useState('');
  return (
    <form
      className="form"
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const samples: SampleReceipt[] = rows.map((key) => ({
          product: String(f.get(`product-${key}`)),
          batch: String(f.get(`batch-${key}`)),
          materialType: String(f.get(`materialType-${key}`)) as MaterialType,
          methodIds: f.getAll(`methods-${key}`).map(String),
          dueDate: String(f.get(`dueDate-${key}`)),
          priority: f.get(`priority-${key}`) as 'Routine' | 'Urgent',
        }));
        const empty = samples.findIndex((s) => !s.methodIds.length);
        if (empty !== -1) {
          setMissing(`Request at least one Method for Sample ${empty + 1}.`);
          return;
        }
        setMissing('');
        void onSubmit({
          type: 'receiveSubmission',
          client: String(f.get('client')),
          samples,
        });
      }}
    >
      <div className="fields">
        <label className="span-2">
          Client
          <input
            name="client"
            required
            maxLength={200}
            autoFocus
            placeholder="Northstar Pharma"
          />
        </label>
      </div>
      {rows.map((key, i) => {
        const unit = reportingUnit(types[key] ?? 'finished product');
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
              <label className="span-2">
                Product
                <input
                  name={`product-${key}`}
                  required
                  maxLength={200}
                  placeholder="Losartan potassium tablets 50 mg"
                />
              </label>
              <label>
                Batch or lot
                <input name={`batch-${key}`} required maxLength={200} />
              </label>
              <label>
                Material type
                <select
                  name={`materialType-${key}`}
                  value={types[key] ?? 'finished product'}
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
                Due date
                <input name={`dueDate-${key}`} type="date" required />
              </label>
              <fieldset className="priority">
                <legend>Priority</legend>
                <label>
                  <input
                    type="radio"
                    name={`priority-${key}`}
                    value="Routine"
                    defaultChecked
                  />
                  Routine
                </label>
                <label>
                  <input type="radio" name={`priority-${key}`} value="Urgent" />
                  Urgent
                </label>
              </fieldset>
            </div>
            <fieldset className="tests">
              <legend>Requested Methods · reported in {unit}</legend>
              {data.methods
                .filter((m) =>
                  m.materialTypes.includes(types[key] ?? 'finished product'),
                )
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
                    <span className="num r">{m.technique}</span>
                  </label>
                ))}
            </fieldset>
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

function SamplePanel({
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
  const [tab, setTab] = useState<'Results' | 'History'>('Results');
  const [signing, setSigning] = useState<SigningCommandType | null>(null);
  useEffect(() => setSigning(null), [s.id]);
  const tabIds = useId();
  const person = data.people.find((p) => p.id === actor)!;
  const canRecord =
    s.assignee === actor && ['In progress', 'Returned'].includes(s.status);
  const canDecide =
    person.role === 'manager' && s.status === 'Awaiting approval';
  // Separation of duties (ADR-0003): the core refuses this Approval too.
  const ownResults = enteredResultOn(s, actor);
  const canAssign =
    person.role === 'coordinator' &&
    !['Approved', 'Awaiting approval'].includes(s.status);
  const history = data.audit.filter((e) => auditsSample(e, s));
  const recorded = s.tests.filter((t) => currentResult(t)).length;
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
        <h2>{s.product}</h2>
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
                      .filter((p) => p.role === 'analyst')
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
          // Roving focus between the two tabs, per the ARIA tabs pattern.
          if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
          e.preventDefault();
          const next = tab === 'Results' ? 'History' : 'Results';
          setTab(next);
          document.getElementById(`${tabIds}-tab-${next}`)?.focus();
        }}
      >
        {(['Results', 'History'] as const).map((t) => (
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
            <span className="tab-n">
              {t === 'Results'
                ? `${recorded}/${s.tests.length}`
                : history.length}
            </span>
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
        ) : (
          <>
            {s.status === 'Returned' && s.lastReturn && (
              <div className="flash returned inline">
                <strong>
                  Returned by {personName(data, s.lastReturn.by)},{' '}
                  {stamp(s.lastReturn.at)}:
                </strong>{' '}
                {s.lastReturn.comment}
              </div>
            )}
            <TestSheet
              sample={s}
              canRecord={canRecord}
              busy={busy}
              execute={execute}
              data={data}
            />
            <Signatures
              signatures={data.signatures.filter((x) => x.sampleId === s.id)}
            />
          </>
        )}
      </div>
      {tab === 'Results' && (
        <footer className="sample-foot">
          {canRecord ? (
            <>
              <span className="dim">
                {recorded} of {s.tests.length} results recorded
              </span>
              <button
                className="btn primary"
                disabled={busy || recorded < s.tests.length}
                onClick={() => setSigning('submitForApproval')}
              >
                Submit for approval…
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
                  disabled={busy || ownResults}
                  title={
                    ownResults
                      ? 'You entered a Result on this Sample, so another Manager must approve it.'
                      : undefined
                  }
                >
                  Approve…
                </button>
              </div>
            </form>
          ) : (
            <span className="dim">
              {s.status === 'Approved'
                ? 'Approved. This Sample is locked.'
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
          busy={busy}
          execute={execute}
          onClose={() => setSigning(null)}
        />
      )}
    </div>
  );
}

/** A date and time with its UTC offset, as a signature manifestation shows it. */
function signatureStamp(value: string) {
  const d = new Date(value);
  const offset = -d.getTimezoneOffset();
  const hhmm = (n: number) => String(n).padStart(2, '0');
  const local = d.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  return `${local} UTC${offset < 0 ? '-' : '+'}${hhmm(Math.floor(Math.abs(offset) / 60))}:${hhmm(Math.abs(offset) % 60)}`;
}

/** Signature manifestations: who signed, when, and what the signature means. */
function Signatures({ signatures }: { signatures: Signature[] }) {
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
            <strong>{x.printedName}</strong>
            <time dateTime={x.signedAt}>{signatureStamp(x.signedAt)}</time>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Re-entering the password is the act of signing. A wrong password keeps the
 * dialog open with the server's message; nothing was applied. */
function SignDialog({
  type,
  sample: s,
  signerName,
  busy,
  execute,
  onClose,
}: {
  type: SigningCommandType;
  sample: Sample;
  signerName: string;
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
            : `I performed the Tests on Sample ${s.id} and submit their Results for approval.`}{' '}
          This Electronic signature records{' '}
          <strong>
            {signatureMeanings[type]} {signerName}
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

/** The one place an `enterResult` command is built, so every entry row sends
 * a Result the same way. The unit and qualifier are never sent: the unit
 * follows the Material type and the core assigns the qualifier. */
function resultDraft(s: Sample, t: Test, f: FormData): Draft {
  return {
    type: 'enterResult',
    sampleId: s.id,
    revision: s.revision,
    testId: t.id,
    value: Number(f.get('value')),
    instrumentReading: Number(f.get('instrumentReading')),
    sequenceId: String(f.get('sequenceId') ?? ''),
    reason: String(f.get('reason') ?? ''),
  };
}

/** Every Acceptable intake entry, newest first within each Analyte, marked
 * in force, historical or not yet effective as of today. */
function AcceptableIntakeTable({ data }: { data: Snapshot }) {
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

function ConformityTag({ statement }: { statement: ConformityStatement }) {
  return (
    <span
      className={'conformity ' + statement.toLowerCase().replace(/\s+/g, '-')}
    >
      {statement}
    </span>
  );
}

function LimitCell({ result: r }: { result: Result }) {
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

function QualifierTag({ qualifier }: { qualifier: Qualifier }) {
  return qualifier === 'quantified' ? null : (
    <span className="qualifier">{qualifier}</span>
  );
}

function ResultValue({ result: r }: { result: Result }) {
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
function ResultEntry({
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
  const limit =
    s.materialType === 'finished product'
      ? limitInForce(
          data.acceptableIntakes,
          t.analyteId,
          new Date().toISOString(),
        )
      : null;
  const verdict =
    preview === null
      ? null
      : conformity({ value, qualifier: preview }, t, limit);
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (await execute(resultDraft(s, t, new FormData(e.currentTarget))))
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
        <b>{verdict === null ? '—' : <ConformityTag statement={verdict} />}</b>
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
      {current && (
        <label className="grow">
          <span>Reason for correction</span>
          <input name="reason" required minLength={3} maxLength={1000} />
        </label>
      )}
      <button className="btn sm primary" disabled={busy}>
        Save
      </button>
    </form>
  );
}

/** Every requested test as one row. Unrecorded tests show their entry fields
 * inline for the assigned analyst, so a whole sample can be keyed in one pass
 * with Tab and Enter; a current Result opens for correction on request. */
function TestSheet({
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
                    </span>
                  </>
                ) : (
                  <span className="dim">— {t.unit}</span>
                )}
              </td>
              <td>
                {current ? (
                  <LimitCell result={current} />
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
                          {r.status === 'current' ? 'Current' : 'Superseded'}
                        </span>
                        <ResultValue result={r} />
                        <ConformityTag statement={r.conformity} />
                        <span className="dim num">
                          {r.limit ? `Limit ${r.limit.value} ng/day · ` : ''}
                          {r.instrumentReading} ng/mL · {r.sequenceId}
                        </span>
                        <span>{personName(data, r.enteredBy)}</span>
                        <time className="dim" dateTime={r.enteredAt}>
                          {stamp(r.enteredAt)}
                        </time>
                        {r.reason && (
                          <span className="reason">Reason: {r.reason}</span>
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

const COMMAND_LABELS: Record<string, string> = {
  receiveSubmission: 'Received',
  assign: 'Assigned',
  enterResult: 'Result entered',
  submitForApproval: 'Submitted',
  approve: 'Approved',
  return: 'Returned',
};

const auditValue = (value: AuditValue) =>
  value === null ? <span className="none">empty</span> : String(value);

/** A Test's record ID repeats its Sample, which the History tab already shows. */
const recordLabel = (e: AuditEntry, showSample: boolean) =>
  e.recordType === 'Test' && !showSample
    ? `Test ${e.recordId.slice(e.recordId.indexOf('/') + 1)}`
    : `${e.recordType} ${e.recordId}`;

/** The audit trail, newest first, one group per command: who acted, when and
 * through which command, then each field it changed with the reason. */
function AuditTable({
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

type SessionUser = { id: string; name: string; role: string };

function SignIn({
  message,
  onSignedIn,
}: {
  message: string;
  onSignedIn: (user: SessionUser) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  return (
    <main className="sign-in">
      <form
        className="form sign-in-card"
        aria-labelledby="sign-in-title"
        onSubmit={async (e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          setBusy(true);
          setError('');
          try {
            const response = await fetch('/api/sign-in', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                username: String(f.get('username')),
                password: String(f.get('password')),
              }),
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error);
            onSignedIn(result.user);
          } catch (err) {
            setError(
              err instanceof Error && err.message
                ? err.message
                : 'Unable to sign in. Please try again.',
            );
            setBusy(false);
          }
        }}
      >
        <div className="sign-in-brand">
          <span className="mark" aria-hidden="true">
            b
          </span>
          <h1 id="sign-in-title">Sign in to Benchline</h1>
        </div>
        {(error || message) && (
          <p
            role={error ? 'alert' : 'status'}
            className={'flash inline ' + (error ? 'error' : 'ok')}
          >
            {error || message}
          </p>
        )}
        <label>
          Username
          <input
            name="username"
            autoComplete="username"
            required
            autoFocus
            maxLength={100}
          />
        </label>
        <label>
          Password
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            required
            maxLength={200}
          />
        </label>
        <button className="btn primary" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
        <p className="sign-in-note">
          Prototype demo accounts (password is the username followed by{' '}
          <code>-demo</code>): <code>coordinator</code>, <code>analyst</code>,{' '}
          <code>analyst-2</code>, <code>manager</code>.
        </p>
      </form>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
