import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  hasException,
  newCommandId,
  type Command,
  type Snapshot,
  type Sample,
  type Test,
} from './laboratory/contracts';
import './styles.css';

type View = 'Samples' | 'My work' | 'Review queue' | 'Methods' | 'Activity';

/** A command as a screen writes it. The key is minted by `execute`, not by the
 * caller, so no screen can reuse one across two separate laboratory acts. */
type Draft<C = Command> = C extends unknown ? Omit<C, 'commandId'> : never;
type Execute = (command: Draft) => Promise<boolean>;

/** Each role's own queue is a permission, not a preference: a coordinator
 * schedules and needs the whole register plus the review queue to oversee
 * it; an analyst only ever acts on samples assigned to them; a reviewer
 * only ever acts on samples awaiting their review. Neither can act outside
 * their queue today (the server enforces this — see `requireRole` and
 * `requireAssignedAnalyst` in laboratory.ts), so there is no reason to show
 * them a queue they cannot use. */
function viewsForRole(role: string | undefined): View[] {
  if (role === 'analyst') return ['My work', 'Methods', 'Activity'];
  if (role === 'reviewer') return ['Review queue', 'Methods', 'Activity'];
  return ['Samples', 'My work', 'Review queue', 'Methods', 'Activity'];
}
function defaultViewForRole(role: string | undefined): View {
  return viewsForRole(role)[0];
}

/** The rows a queue view starts from, before any filter or search. Counts in
 * the filter bar are taken from this set, so a role never sees totals for
 * samples outside its own queue. */
function baseSet(view: View, samples: Sample[], actor: string) {
  if (view === 'My work')
    return samples.filter(
      (s) => s.assignee === actor && s.status !== 'Approved',
    );
  if (view === 'Review queue')
    return samples.filter((s) => s.status === 'In review');
  return samples;
}

const FILTERS = [
  'Active',
  'Received',
  'In progress',
  'Returned',
  'In review',
  'Investigate',
  'Approved',
  'All',
] as const;
type Filter = (typeof FILTERS)[number];
function matches(s: Sample, f: Filter) {
  if (f === 'All') return true;
  if (f === 'Active') return s.status !== 'Approved';
  if (f === 'Investigate') return hasException(s);
  return s.status === f;
}

const STATUS_ORDER: Sample['status'][] = [
  'Received',
  'In progress',
  'Returned',
  'In review',
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
const statusClass = (s: Sample) =>
  hasException(s) ? 'investigate' : s.status.toLowerCase().replaceAll(' ', '-');

function Icon({ name }: { name: string }) {
  const paths: Record<string, React.ReactNode> = {
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
    'Review queue': (
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
    Activity: (
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
  // An out-of-spec result reads as "Investigate", not "Exception" — it needs
  // a second look, not a verdict of failure. It has its own colour, distinct
  // from "Returned", so the two don't read as the same thing.
  return (
    <span className={'status ' + statusClass(sample)}>
      {hasException(sample) ? 'Investigate' : sample.status}
    </span>
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

/** Where a value sits inside its acceptance window. The window is drawn at a
 * fixed place on the track so every row reads the same way; values outside
 * it are pinned to the ends. */
function SpecGauge({ test, value }: { test: Test; value?: number }) {
  const span = test.max - test.min || 1;
  const lo = test.min - span * 0.25;
  const hi = test.max + span * 0.25;
  const at =
    value === undefined
      ? null
      : Math.min(100, Math.max(0, ((value - lo) / (hi - lo)) * 100));
  const inSpec = value !== undefined && value >= test.min && value <= test.max;
  return (
    <span
      className="gauge"
      role="img"
      aria-label={
        value === undefined
          ? `Specification ${test.min} to ${test.max} ${test.unit}, not recorded`
          : `${value} ${test.unit}, ${inSpec ? 'within' : 'outside'} ${test.min} to ${test.max}`
      }
    >
      <span className="gauge-window" />
      {at !== null && (
        <span
          className={'gauge-mark' + (inSpec ? '' : ' out')}
          style={{ left: `${at}%` }}
        />
      )}
    </span>
  );
}

const PANEL_WIDTH_KEY = 'benchline:panel-width';
const PANEL_DEFAULT = 560;
/** Neither pane may be dragged narrower than this, so the divider can never
 * hide the register or the open sample. CSS enforces the same floor when the
 * window itself shrinks. */
const PANE_MIN = 360;

/** The divider between the register and the open sample. Drag it, or focus it
 * and use the arrow keys (Shift for bigger steps); double-click restores the
 * default width. */
function Splitter({
  width,
  onChange,
  containerRef,
}: {
  width: number;
  onChange: (width: number) => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
}) {
  function clamp(w: number) {
    const total = containerRef.current?.clientWidth ?? PANEL_DEFAULT * 2;
    return Math.round(Math.max(PANE_MIN, Math.min(total - PANE_MIN, w)));
  }
  return (
    <div
      className="splitter"
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize sample panel"
      aria-valuenow={width}
      aria-valuemin={PANE_MIN}
      tabIndex={0}
      title="Drag to resize. Double-click to reset."
      onPointerDown={(e) => {
        e.preventDefault();
        const el = e.currentTarget;
        el.setPointerCapture(e.pointerId);
        const startX = e.clientX;
        const startWidth = width;
        const move = (m: PointerEvent) =>
          onChange(clamp(startWidth + startX - m.clientX));
        const end = () => {
          el.removeEventListener('pointermove', move);
          el.removeEventListener('pointerup', end);
          el.removeEventListener('pointercancel', end);
          document.body.classList.remove('resizing');
        };
        el.addEventListener('pointermove', move);
        el.addEventListener('pointerup', end);
        el.addEventListener('pointercancel', end);
        document.body.classList.add('resizing');
      }}
      onDoubleClick={() => onChange(clamp(PANEL_DEFAULT))}
      onKeyDown={(e) => {
        const step = e.shiftKey ? 80 : 20;
        if (e.key === 'ArrowLeft') onChange(clamp(width + step));
        else if (e.key === 'ArrowRight') onChange(clamp(width - step));
        else if (e.key === 'Home') onChange(clamp(PANEL_DEFAULT));
        else return;
        e.preventDefault();
      }}
    />
  );
}

function App() {
  const [data, setData] = useState<Snapshot | null>(null);
  const [actor, setActor] = useState('coordinator');
  const [view, setView] = useState<View>('Samples');
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
  const workspaceRef = useRef<HTMLDivElement>(null);
  const [panelWidth, setPanelWidth] = useState(() => {
    try {
      const stored = Number(localStorage.getItem(PANEL_WIDTH_KEY));
      return stored >= PANE_MIN ? stored : PANEL_DEFAULT;
    } catch {
      return PANEL_DEFAULT;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(PANEL_WIDTH_KEY, String(panelWidth));
    } catch {
      // Per-viewer convenience only; blocked storage just means the divider
      // starts at its default width next visit.
    }
  }, [panelWidth]);
  async function reload() {
    const response = await fetch('/api/workspace');
    if (!response.ok)
      throw new Error('The workspace is unavailable. Use Refresh to retry.');
    setData(await response.json());
    setLoadedAt(new Date());
  }
  function refresh() {
    setError('');
    reload().catch((e) => setError(e.message));
  }
  useEffect(refresh, []);
  async function execute(draft: Draft) {
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
        headers: { 'Content-Type': 'application/json', 'X-Demo-Actor': actor },
        body: JSON.stringify(command),
      });
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
        setError(
          'Your change was saved, but the workspace could not refresh. Use Refresh before continuing.',
        );
        return false;
      }
      pending.current = null;
      setNotice(
        result.outcome === 'replayed'
          ? `Already recorded at ${stamp(result.originallyAppliedAt)}. Nothing was saved twice.`
          : command.type === 'receive'
            ? `${result.sample.id} received.`
            : `${result.sample.id} saved to the laboratory record.`,
      );
      if (command.type === 'receive') setSelected(result.sample.id);
      return true;
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'Unable to save. Please try again.',
      );
      return false;
    } finally {
      setBusy(false);
    }
  }

  const person = data?.people.find((p) => p.id === actor);
  const roleViews = viewsForRole(person?.role);
  const isQueue = ['Samples', 'My work', 'Review queue'].includes(view);
  const base = useMemo(
    () => (data ? baseSet(view, data.samples, actor) : []),
    [data, view, actor],
  );
  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    const rows = base.filter(
      (s) =>
        matches(s, filter) &&
        `${s.id} ${s.product} ${s.client} ${s.batch}`.toLowerCase().includes(q),
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
  const reviewCount =
    data?.samples.filter((s) => s.status === 'In review').length ?? 0;
  const myCount = data ? baseSet('My work', data.samples, actor).length : 0;

  function navigate(next: View) {
    setView(next);
    setFilter('Active');
    setSearch('');
    setSelected(null);
  }
  function switchActor(nextId: string) {
    setActor(nextId);
    setError('');
    setNotice('');
    navigate(
      defaultViewForRole(data?.people.find((p) => p.id === nextId)?.role),
    );
  }
  function toggleSort(key: SortKey) {
    setSort((s) => ({ key, asc: s.key === key ? !s.asc : true }));
  }

  // Keyboard-first operation: move through the queue without reaching for
  // the mouse between instrument runs. Typing in a field is never hijacked.
  const keyState = useRef({ visible, selected, isQueue, busy, person });
  keyState.current = { visible, selected, isQueue, busy, person };
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target;
      if (
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
            <span>{v === 'Review queue' ? 'Review' : v}</span>
            {v === 'Review queue' && reviewCount > 0 && (
              <b className="rail-count">{reviewCount}</b>
            )}
            {v === 'My work' && myCount > 0 && (
              <b className="rail-count">{myCount}</b>
            )}
          </button>
        ))}
      </nav>
      <div className="shell">
        <header className="topbar">
          <h1>
            {view === 'Samples' ? 'Sample register' : view}
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
                placeholder="Sample, product, client or batch"
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
                Receive sample
              </button>
            )}
            <label className="user">
              <span className="avatar" aria-hidden="true">
                {initials(person?.name)}
              </span>
              <select
                aria-label="Demo user"
                value={actor}
                onChange={(e) => switchActor(e.target.value)}
              >
                {data?.people.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.role})
                  </option>
                ))}
              </select>
            </label>
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
            ref={workspaceRef}
            className={'workspace' + (sample ? ' has-sample' : '')}
            style={
              { '--panel-width': `${panelWidth}px` } as React.CSSProperties
            }
          >
            <section className="register" aria-label="Samples">
              <div className="scroll">
                <table className="grid">
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
                      <th>Product</th>
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
                              {s.tests.map((t) => {
                                const r = t.results.at(-1);
                                return (
                                  <i
                                    key={t.id}
                                    className={
                                      r ? (r.inSpec ? 'pass' : 'fail') : ''
                                    }
                                  />
                                );
                              })}
                            </span>
                            <span className="num">
                              {s.tests.filter((t) => t.results.length).length}/
                              {s.tests.length}
                            </span>
                          </td>
                          <td className="c-product" title={s.product}>
                            {s.product}
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
                        ? person?.role === 'analyst'
                          ? 'Nothing is assigned to you right now.'
                          : 'Switch to an analyst to see their assignments.'
                        : view === 'Review queue'
                          ? 'No results are waiting for review.'
                          : 'No samples yet. Receive one to start.'}
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
                  width={panelWidth}
                  onChange={setPanelWidth}
                  containerRef={workspaceRef}
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
                  <th>Test</th>
                  <th>Method</th>
                  <th>Technique</th>
                  <th className="r">Lower limit</th>
                  <th className="r">Upper limit</th>
                  <th>Unit</th>
                </tr>
              </thead>
              <tbody>
                {data.methods.map((m) => (
                  <tr key={m.id}>
                    <td className="strong">{m.name}</td>
                    <td className="num">{m.method}</td>
                    <td>{m.technique}</td>
                    <td className="num r">{m.min}</td>
                    <td className="num r">{m.max}</td>
                    <td>{m.unit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="footnote">
              Limits are inclusive and copied to each sample when it is
              received. Illustrative values only.
            </p>
          </div>
        ) : (
          <div className="scroll page">
            <ActivityTable events={data.activity} data={data} showSample />
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
          title="Receive sample"
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
  return (
    <form
      className="form"
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        void onSubmit({
          type: 'receive',
          product: String(f.get('product')),
          client: String(f.get('client')),
          batch: String(f.get('batch')),
          dueDate: String(f.get('dueDate')),
          priority: f.get('priority') as 'Routine' | 'Urgent',
          notes: String(f.get('notes')),
          methodIds: f.getAll('methods').map(String),
        });
      }}
    >
      <div className="fields">
        <label className="span-2">
          Product or material
          <input
            name="product"
            required
            maxLength={200}
            autoFocus
            placeholder="Acetaminophen tablets 500 mg"
          />
        </label>
        <label>
          Client
          <input name="client" required maxLength={200} />
        </label>
        <label>
          Batch or lot
          <input name="batch" required maxLength={200} />
        </label>
        <label>
          Due date
          <input name="dueDate" type="date" required />
        </label>
        <fieldset className="priority">
          <legend>Priority</legend>
          <label>
            <input
              type="radio"
              name="priority"
              value="Routine"
              defaultChecked
            />
            Routine
          </label>
          <label>
            <input type="radio" name="priority" value="Urgent" />
            Urgent
          </label>
        </fieldset>
      </div>
      <fieldset className="tests">
        <legend>Requested tests</legend>
        {data.methods.map((m) => (
          <label key={m.id}>
            <input type="checkbox" name="methods" value={m.id} defaultChecked />
            <span className="strong">{m.name}</span>
            <span className="dim num">{m.method}</span>
            <span className="num r">
              {m.min}–{m.max} {m.unit}
            </span>
          </label>
        ))}
      </fieldset>
      <label>
        Receipt notes
        <textarea
          name="notes"
          rows={2}
          maxLength={2000}
          placeholder="Condition, storage location, observations"
        />
      </label>
      {error && (
        <div role="alert" className="flash error inline">
          {error}
        </div>
      )}
      <div className="form-foot">
        <span className="dim">A laboratory number is assigned on save.</span>
        <button className="btn primary" disabled={disabled}>
          Receive sample
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
  const person = data.people.find((p) => p.id === actor)!;
  const canRecord =
    s.assignee === actor && ['In progress', 'Returned'].includes(s.status);
  const canReview = person.role === 'reviewer' && s.status === 'In review';
  const canAssign =
    person.role === 'coordinator' &&
    !['Approved', 'In review'].includes(s.status);
  const events = data.activity.filter((a) => a.sampleId === s.id);
  const recorded = s.tests.filter((t) => t.results.length).length;
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
                (data.people.find((p) => p.id === s.assignee)?.name ??
                'Unassigned')
              )}
            </dd>
          </div>
        </dl>
        {s.notes && <p className="note">{s.notes}</p>}
      </header>
      <div className="tabs" role="tablist" aria-label="Sample details">
        {(['Results', 'History'] as const).map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
          >
            {t}
            <span className="tab-n">
              {t === 'Results'
                ? `${recorded}/${s.tests.length}`
                : events.length}
            </span>
          </button>
        ))}
      </div>
      <div className="sample-body">
        {tab === 'History' ? (
          <ActivityTable events={events} data={data} />
        ) : (
          <>
            {hasException(s) && (
              <div className="flash warn inline">
                A current or earlier result is outside its specification.
                Routine approval stays blocked after revision; investigation and
                disposition happen outside this prototype.
              </div>
            )}
            {s.status === 'Returned' && (
              <div className="flash returned inline">
                <strong>Returned by review:</strong>{' '}
                {events.find((e) => e.action === 'review')?.detail}
              </div>
            )}
            <TestSheet
              sample={s}
              canRecord={canRecord}
              busy={busy}
              execute={execute}
              data={data}
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
                onClick={() =>
                  void execute({
                    type: 'submit',
                    sampleId: s.id,
                    revision: s.revision,
                  })
                }
              >
                Submit for review
              </button>
            </>
          ) : canReview ? (
            <form
              className="review"
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                const decision = (
                  e.nativeEvent as SubmitEvent
                ).submitter?.getAttribute('value');
                void execute({
                  type: 'review',
                  sampleId: s.id,
                  revision: s.revision,
                  decision: decision === 'return' ? 'return' : 'approve',
                  comment: String(f.get('comment')),
                });
              }}
            >
              <textarea
                name="comment"
                aria-label="Review comment"
                required
                minLength={3}
                maxLength={2000}
                rows={2}
                placeholder="Review comment: what you checked, or the correction needed"
              />
              <div className="review-actions">
                <button
                  className="btn"
                  name="decision"
                  value="return"
                  disabled={busy}
                >
                  Return for correction
                </button>
                <button
                  className="btn primary"
                  name="decision"
                  value="approve"
                  disabled={busy || hasException(s)}
                  title={
                    hasException(s)
                      ? 'Out-of-specification results cannot be approved routinely'
                      : undefined
                  }
                >
                  Approve results
                </button>
              </div>
            </form>
          ) : (
            <span className="dim">
              {s.status === 'Approved'
                ? 'Reviewed and approved. This sample is locked.'
                : s.status === 'In review'
                  ? 'Waiting for independent review.'
                  : s.assignee
                    ? `Results are entered by ${data.people.find((p) => p.id === s.assignee)?.name}.`
                    : 'Assign an analyst before results can be recorded.'}
            </span>
          )}
        </footer>
      )}
    </div>
  );
}

/** The one place a `record` command is built, so every entry row sends a
 * result the same way. */
function recordDraft(
  s: Sample,
  t: Test,
  value: number,
  reference: string,
  reason: string,
): Draft {
  return {
    type: 'record',
    sampleId: s.id,
    revision: s.revision,
    testId: t.id,
    value,
    reference,
    reason,
  };
}

/** Every requested test as one row. Unrecorded tests show their entry fields
 * inline for the assigned analyst, so a whole sample can be keyed in one pass
 * with Tab and Enter; a recorded result opens for revision on request. */
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
  // The run reference is usually shared across a sample's tests, so a new
  // entry starts from the most recent one used on this sample.
  const lastReference = s.tests
    .flatMap((t) => t.results)
    .sort((a, b) => a.recordedAt.localeCompare(b.recordedAt))
    .at(-1)?.reference;
  return (
    <table className="grid sheet">
      <thead>
        <tr>
          <th>Test</th>
          <th>Specification</th>
          <th className="r">Result</th>
          <th className="c-gauge">
            <span className="sr-only">Position in specification</span>
          </th>
          <th>Recorded</th>
        </tr>
      </thead>
      {s.tests.map((t) => {
        const latest = t.results.at(-1);
        const editing = canRecord && (!latest || editingId === t.id);
        const history = openHistory === t.id;
        return (
          <tbody key={t.id} className={editing ? 'editing' : undefined}>
            <tr>
              <td>
                <span className="strong">{t.name}</span>
                <span className="sub num">{t.method}</span>
              </td>
              <td className="num">
                {t.min}–{t.max} {t.unit}
              </td>
              <td className="r">
                {latest ? (
                  <span className={'value' + (latest.inSpec ? '' : ' out')}>
                    {latest.value}
                    <small>{t.unit}</small>
                  </span>
                ) : (
                  <span className="dim">—</span>
                )}
              </td>
              <td className="c-gauge">
                <SpecGauge test={t} value={latest?.value} />
              </td>
              <td>
                {latest ? (
                  <span className="rec">
                    <span>
                      {initials(
                        data.people.find((p) => p.id === latest.analyst)?.name,
                      )}{' '}
                      <span className="num">{latest.reference}</span>
                    </span>
                    <span className="rec-actions">
                      {t.results.length > 1 && (
                        <button
                          className="link"
                          aria-expanded={history}
                          onClick={() => setOpenHistory(history ? null : t.id)}
                        >
                          v{t.results.length}
                        </button>
                      )}
                      {canRecord && (
                        <button
                          className="link"
                          onClick={() =>
                            setEditingId(editingId === t.id ? null : t.id)
                          }
                        >
                          {editingId === t.id ? 'Cancel' : 'Revise'}
                        </button>
                      )}
                    </span>
                  </span>
                ) : (
                  <span className="dim">Not recorded</span>
                )}
              </td>
            </tr>
            {editing && (
              <tr className="entry">
                <td colSpan={5}>
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      const f = new FormData(e.currentTarget);
                      if (
                        await execute(
                          recordDraft(
                            s,
                            t,
                            Number(f.get('value')),
                            String(f.get('reference')),
                            String(f.get('reason') ?? ''),
                          ),
                        )
                      )
                        setEditingId(null);
                    }}
                  >
                    <label>
                      <span>Result, {t.unit}</span>
                      <input
                        name="value"
                        type="number"
                        step="any"
                        required
                        inputMode="decimal"
                        defaultValue={latest?.value}
                      />
                    </label>
                    <label>
                      <span>Run reference</span>
                      <input
                        name="reference"
                        required
                        maxLength={200}
                        defaultValue={latest?.reference ?? lastReference}
                        placeholder="HPLC-2026-0042"
                      />
                    </label>
                    {latest && (
                      <label className="grow">
                        <span>Reason for revision</span>
                        <input
                          name="reason"
                          required
                          minLength={3}
                          maxLength={1000}
                        />
                      </label>
                    )}
                    <button className="btn sm primary" disabled={busy}>
                      Save
                    </button>
                  </form>
                </td>
              </tr>
            )}
            {history && (
              <tr className="revisions">
                <td colSpan={5}>
                  <ol>
                    {t.results.map((r, i) => (
                      <li key={i}>
                        <span className="num">v{i + 1}</span>
                        <span className={'value' + (r.inSpec ? '' : ' out')}>
                          {r.value}
                          <small>{t.unit}</small>
                        </span>
                        <span>
                          {data.people.find((p) => p.id === r.analyst)?.name}
                        </span>
                        <span className="num">{r.reference}</span>
                        <time className="dim" dateTime={r.recordedAt}>
                          {stamp(r.recordedAt)}
                        </time>
                        {r.reason && <span className="reason">{r.reason}</span>}
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

function ActivityTable({
  events,
  data,
  showSample = false,
}: {
  events: Snapshot['activity'];
  data: Snapshot;
  showSample?: boolean;
}) {
  if (!events.length) return <p className="blank">No activity yet.</p>;
  return (
    <table className="grid activity">
      <thead>
        <tr>
          <th>Time</th>
          {showSample && <th>Sample</th>}
          <th>By</th>
          <th>Action</th>
          <th>Detail</th>
        </tr>
      </thead>
      <tbody>
        {events.map((e) => (
          <tr key={e.id}>
            <td className="num nowrap">
              <time dateTime={e.at}>{stamp(e.at)}</time>
            </td>
            {showSample && <td className="num nowrap">{e.sampleId}</td>}
            <td className="nowrap">
              {data.people.find((p) => p.id === e.actor)?.name ?? e.actor}
            </td>
            <td>
              <span className={'action a-' + e.action}>{e.action}</span>
            </td>
            <td className="wrap">{e.detail}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
