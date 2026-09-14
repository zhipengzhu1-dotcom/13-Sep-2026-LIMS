import React, {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  actsAs,
  currentResult,
  materialTypes,
  newCommandId,
  methodLodLoq,
  reportingUnit,
  type Command,
  type Result,
  type Snapshot,
  type Sample,
  type Test,
} from '../laboratory/contracts';
import { oosRows, resultsView } from '../laboratory/results';
import {
  PASSWORD_AGING_DAYS,
  PASSWORD_MINIMUM_LENGTH,
} from '../accounts/account-contracts';
import { LabAuditTrail } from './audit-trail';
import { AccountsScreen } from './accounts';
import { OosTable } from './oos';
import { Intake } from './receiving';
import {
  baseSet,
  clampPanel,
  defaultViewForRole,
  type Filter,
  FILTERS,
  matches,
  NO_REFINE,
  PANE_MIN,
  PANEL_DEFAULT,
  PANEL_WIDTH_KEY,
  panelMax,
  type Refine,
  refines,
  SortHead,
  type SortKey,
  Splitter,
  STATUS_ORDER,
  viewsForRole,
} from './register';
import { AcceptableIntakeTable } from './results';
import { SamplePanel } from './sample-panel';
import {
  type Draft,
  Due,
  Icon,
  initials,
  InvalidSignatureTag,
  Modal,
  QUEUES,
  stamp,
  Status,
  statusClass,
  type InstanceMode,
  type View,
} from './shared';

export function App() {
  const [data, setData] = useState<Snapshot | null>(null);
  // undefined while the session is being checked; null when signed out.
  const [user, setUser] = useState<SessionUser | null | undefined>(undefined);
  const [signInMessage, setSignInMessage] = useState('');
  const [mode, setMode] = useState<InstanceMode>(null);
  // The running version with its commit, so users can tell which build runs.
  const [version, setVersion] = useState('');
  useEffect(() => {
    fetch('/api/instance')
      .then(async (response) => {
        if (!response.ok) return;
        const instance = await response.json();
        setMode(instance.mode);
        setVersion(instance.version);
      })
      .catch(() => {});
  }, []);
  const actor = user?.id ?? '';
  const [view, setView] = useState<View>('Receiving');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('Active');
  const [refine, setRefine] = useState<Refine>(NO_REFINE);
  const [sort, setSort] = useState<{ key: SortKey; asc: boolean }>({
    key: 'due',
    asc: true,
  });
  const [selected, setSelected] = useState<string | null>(null);
  const [intake, setIntake] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
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
    setChangingPassword(false);
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
  /** An account change may be the signed-in user's own name, role or active
   * flag, so the session user is read again with the workspace. */
  function accountsChanged() {
    fetch('/api/session')
      .then(async (response) => {
        if (response.status === 401)
          return sessionEnded('Your session has ended. Sign in to continue.');
        if (!response.ok) return;
        const next: SessionUser = (await response.json()).user;
        setUser(next);
        if (!viewsForRole(next.role, mode).includes(view))
          navigate(defaultViewForRole(next.role));
      })
      .catch(() => {});
    refresh();
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
        // A Locked account's refusal says why the session ended; show it
        // word for word.
        const refusal: { error?: string; code?: string } = await response
          .json()
          .catch(() => ({}));
        sessionEnded(
          refusal.code === 'accountLocked' && refusal.error
            ? refusal.error
            : 'Your session has ended, so this change was not saved. Sign in to continue.',
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
  const roleViews = viewsForRole(person?.role, mode);
  const isQueue = QUEUES.includes(view);
  const base = useMemo(
    () => (data ? baseSet(view, data.samples, actor, data.signatures) : []),
    [data, view, actor],
  );
  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    const rows = base.filter(
      (s) =>
        matches(s, filter) &&
        refines(s, refine) &&
        `${s.id} ${s.submissionId} ${s.product} ${s.client} ${s.clientSampleId} ${s.batch}`
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
  }, [base, filter, refine, search, sort]);
  const sample = data?.samples.find((s) => s.id === selected);
  const queueCount = (v: View) =>
    !data
      ? 0
      : v === 'OOS investigations'
        ? oosRows(data.samples).filter(
            (r) => r.investigation?.status !== 'Closed',
          ).length
        : v !== 'Samples' && QUEUES.includes(v)
          ? baseSet(v, data.samples, actor, data.signatures).length
          : 0;

  function navigate(next: View) {
    setView(next);
    // The Publish queue is worked in Due date order.
    if (next === 'Publish queue') setSort({ key: 'due', asc: true });
    // An invalid signature matters on a Published Sample as much as on one
    // still in work, so that list starts from every state.
    setFilter(next === 'Invalid signatures' ? 'All' : 'Active');
    setRefine(NO_REFINE);
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
      } else if (e.key === 'n' && actsAs(k.person, 'coordinator')) {
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

  // The open Sample beside a list: the register, or the OOS investigations.
  const openSample =
    sample && data ? (
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
    ) : null;
  const workspaceStyle = {
    '--panel-width': `${shownPanelWidth}px`,
  } as React.CSSProperties;

  if (user === undefined) return <p className="blank">Loading…</p>;
  if (user === null)
    return (
      <SignIn
        message={signInMessage}
        onSignedIn={signedIn}
        demo={mode === 'demo'}
      />
    );

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
            <span>
              {v === 'Approval queue'
                ? 'Approval'
                : v === 'Publish queue'
                  ? 'Publish'
                  : v === 'OOS investigations'
                    ? 'OOS'
                    : v}
            </span>
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
            {actsAs(person, 'coordinator') && (
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
                onClick={() => setChangingPassword(true)}
              >
                Change password
              </button>
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
              const n = base.filter(
                (s) => refines(s, refine) && matches(s, f),
              ).length;
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
        {isQueue && data && (
          <div
            className="refine"
            role="group"
            aria-label="Filter by Client, Material type and Due date"
          >
            <label>
              Client
              <select
                value={refine.clientId}
                onChange={(e) =>
                  setRefine({ ...refine, clientId: e.target.value })
                }
              >
                <option value="">All Clients</option>
                {data.clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                    {c.kind === 'internal' ? ' (internal)' : ''}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Material type
              <select
                value={refine.materialType}
                onChange={(e) =>
                  setRefine({ ...refine, materialType: e.target.value })
                }
              >
                <option value="">All</option>
                {materialTypes.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Due on or before
              <input
                type="date"
                value={refine.dueBy}
                onChange={(e) =>
                  setRefine({ ...refine, dueBy: e.target.value })
                }
              />
            </label>
            {(refine.clientId || refine.materialType || refine.dueBy) && (
              <button className="btn sm" onClick={() => setRefine(NO_REFINE)}>
                Clear filters
              </button>
            )}
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
            style={workspaceStyle}
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
                            {resultsView(s).oosRows.some(
                              (r) => r.investigation?.status !== 'Closed',
                            ) && (
                              <span
                                className="oos-flag"
                                title="Out of specification: an OOS investigation is required or open"
                              >
                                OOS
                              </span>
                            )}
                            {/* Every Sample in the Quality lead's list has one; the Sample
                                panel shows which signature to everyone (ADR-0008). */}
                            {view === 'Invalid signatures' && (
                              <InvalidSignatureTag />
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
                            {s.strength && ` ${s.strength}`}
                            <span className="batch">
                              {s.materialType}
                              {s.stability && ' · Stability'}
                            </span>
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
                      ? 'No samples match these filters. Choose All, clear the filters or clear the search.'
                      : view === 'Invalid signatures'
                        ? 'Every Electronic signature verifies against its Signed content.'
                        : view === 'My work'
                          ? 'Nothing assigned to you needs work right now.'
                          : view === 'Approval queue'
                            ? 'No Samples are awaiting approval.'
                            : view === 'Receiving'
                              ? 'Every received Sample is assigned. Receive a Submission to add more.'
                              : view === 'Holds'
                                ? 'No Samples are on hold for a Receipt deviation.'
                                : view === 'Publish queue'
                                  ? 'No approved Samples are waiting to be Published.'
                                  : 'No Samples yet. Receive a Submission to start.'}
                  </div>
                )}
              </div>
            </section>
            {/* With no sample open the register keeps the whole width; the
                panel and its divider only appear once there is something to
                show in them. */}
            {openSample}
          </div>
        ) : view === 'OOS investigations' ? (
          <div
            ref={setWorkspaceEl}
            className={'workspace' + (sample ? ' has-sample' : '')}
            style={workspaceStyle}
          >
            <section className="register" aria-label="OOS investigations">
              <div className="scroll">
                <OosTable
                  data={data}
                  selected={selected}
                  onSelect={(id) => {
                    setSelected(id);
                    setError('');
                  }}
                />
              </div>
            </section>
            {openSample}
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
                  <th className="r">LOD / LOQ, ppm</th>
                  <th className="r">Maximum-dose ceiling, mg/day</th>
                  <th className="r">LOD / LOQ, ng/day at ceiling</th>
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
                      {m.ppmLodLoq.lod} / {m.ppmLodLoq.loq}
                    </td>
                    <td className="r num">{m.maximumDoseCeiling}</td>
                    <td className="r num">
                      {methodLodLoq(m, 'ng/day').lod} /{' '}
                      {methodLodLoq(m, 'ng/day').loq}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="footnote">
              Each Test copies its Method code, version, Analyte and the LOD/LOQ
              pair for the Sample's Material type when the Sample is received. A
              Result below the LOD is reported as {'< LOD'}, from the LOD up to
              but not including the LOQ as {'< LOQ'}. The ng/day LOD and LOQ are
              the ppm values at the Maximum-dose ceiling, and a finished product
              whose Maximum daily dose is above the ceiling of a requested
              Method is not received. Illustrative Methods and values only.
            </p>
            <AcceptableIntakeTable data={data} />
          </div>
        ) : view === 'Accounts' ? (
          <AccountsScreen onChanged={accountsChanged} />
        ) : (
          <LabAuditTrail data={data} />
        )}
        <footer className="statusbar">
          {mode === 'demo' && (
            <>
              <span className="demo">Demo</span>
              <span>
                Fictional data. Not validated for regulated laboratory records.
              </span>
            </>
          )}
          {version && (
            // The commit is shortened to 12 characters to fit; the start-up
            // log keeps it in full for the deployment record.
            <span>
              Version {version.replace(/\b([0-9a-f]{12})[0-9a-f]{28}\b/, '$1')}
            </span>
          )}
          <span className="spacer" />
          {isQueue && data && (
            <span className="hints">
              <kbd>j</kbd>
              <kbd>k</kbd> move <kbd>/</kbd> search <kbd>Esc</kbd> close{' '}
              <kbd>r</kbd> refresh
              {actsAs(person, 'coordinator') && (
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
            disabled={busy || !actsAs(person, 'coordinator')}
            error={error}
            onSubmit={async (c) => {
              if (await execute(c)) setIntake(false);
            }}
          />
        </Modal>
      )}
      {changingPassword && (
        <ChangePassword
          userName={user.name}
          onClose={() => setChangingPassword(false)}
          onChanged={() => {
            setChangingPassword(false);
            setError('');
            setNotice(
              'Your password is changed. Your other sessions have ended.',
            );
          }}
          onSessionEnded={sessionEnded}
        />
      )}
    </div>
  );
}

/** A signed-in user's change of their own password, with the current one; it
 * ends their other sessions. A refusal is shown word for word. */
function ChangePassword({
  userName,
  onClose,
  onChanged,
  onSessionEnded,
}: {
  userName: string;
  onClose: () => void;
  onChanged: () => void;
  /** The session ended, or the account locked on a wrong current password. */
  onSessionEnded: (message: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const current = useRef<HTMLInputElement>(null);
  useEffect(() => {
    // After the dialog opens, which otherwise focuses its close button.
    const frame = requestAnimationFrame(() => current.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, []);
  return (
    <Modal
      title="Change your password"
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <form
        className="form"
        onSubmit={async (e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          const newPassword = String(f.get('newPassword'));
          setError('');
          if (newPassword !== String(f.get('confirmPassword'))) {
            setError('The two new passwords do not match.');
            return;
          }
          setBusy(true);
          try {
            const response = await fetch('/api/own-password', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                password: String(f.get('password')),
                newPassword,
              }),
            });
            const result: { error?: string; code?: string } = await response
              .json()
              .catch(() => ({}));
            if (response.status === 401)
              return onSessionEnded(
                result.code === 'accountLocked' && result.error
                  ? result.error
                  : 'Your session has ended, so the password was not changed. Sign in to continue.',
              );
            if (!response.ok) throw new Error(result.error);
            onChanged();
          } catch (err) {
            setError(
              err instanceof Error && err.message
                ? err.message
                : 'Unable to change the password. Please try again.',
            );
            setBusy(false);
            current.current?.select();
          }
        }}
      >
        <p className="dim">
          A new password is at least {PASSWORD_MINIMUM_LENGTH} characters,
          different from the current one, and good for {PASSWORD_AGING_DAYS}{' '}
          days. Changing it signs you out of Benchline everywhere else.
        </p>
        {error && (
          <p role="alert" className="flash inline error">
            {error}
          </p>
        )}
        <label>
          Current password for {userName}
          <input
            ref={current}
            name="password"
            type="password"
            autoComplete="current-password"
            required
            maxLength={200}
          />
        </label>
        <label>
          New password
          <input
            name="newPassword"
            type="password"
            autoComplete="new-password"
            required
            minLength={PASSWORD_MINIMUM_LENGTH}
            maxLength={200}
          />
        </label>
        <label>
          Confirm new password
          <input
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            required
            minLength={PASSWORD_MINIMUM_LENGTH}
            maxLength={200}
          />
        </label>
        <div className="form-foot">
          <span className="dim">
            Benchline keeps only a hash of a password.
          </span>
          <div className="sign-actions">
            <button
              type="button"
              className="btn"
              disabled={busy}
              onClick={onClose}
            >
              Cancel
            </button>
            <button className="btn primary" disabled={busy}>
              {busy ? 'Changing password…' : 'Change password'}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}

export type SessionUser = { id: string; name: string; role: string };

export function SignIn({
  message,
  onSignedIn,
  demo,
}: {
  message: string;
  onSignedIn: (user: SessionUser) => void;
  /** The demo accounts are listed in the demo only, never in production. */
  demo: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  /** Set once the server refuses a One-time password or an expired password:
   * the only way on is setting a new password of one's own. */
  const [oneTime, setOneTime] = useState<{
    username: string;
    password: string;
    code: 'oneTimePassword' | 'passwordExpired';
  } | null>(null);
  if (oneTime)
    return (
      <main className="sign-in">
        <form
          // Its own key, so none of the sign-in form's inputs, the One-time
          // password above all, are reused with their typed values.
          key="new-password"
          className="form sign-in-card"
          aria-labelledby="new-password-title"
          onSubmit={async (e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            const newPassword = String(f.get('newPassword'));
            setError('');
            if (newPassword !== String(f.get('confirmPassword'))) {
              setError('The two new passwords do not match.');
              return;
            }
            setBusy(true);
            try {
              const response = await fetch('/api/password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  username: oneTime.username,
                  password: oneTime.password,
                  newPassword,
                }),
              });
              const result = await response.json();
              if (!response.ok) throw new Error(result.error);
              onSignedIn(result.user);
            } catch (err) {
              setError(
                err instanceof Error && err.message
                  ? err.message
                  : 'Unable to set the password. Please try again.',
              );
              setBusy(false);
            }
          }}
        >
          <div className="sign-in-brand">
            <span className="mark" aria-hidden="true">
              b
            </span>
            <h1 id="new-password-title">Set a new password</h1>
          </div>
          <p className="sign-in-note">
            {oneTime.code === 'passwordExpired'
              ? `The password for ${oneTime.username} has expired: a password is good for ${PASSWORD_AGING_DAYS} days. Choose a new password, at least ${PASSWORD_MINIMUM_LENGTH} characters and different from the current one, to sign in.`
              : `The password for ${oneTime.username} is a One-time password. Choose a password of your own, at least ${PASSWORD_MINIMUM_LENGTH} characters, to sign in.`}
          </p>
          {error && (
            <p role="alert" className="flash inline error">
              {error}
            </p>
          )}
          <label>
            New password
            <input
              name="newPassword"
              type="password"
              autoComplete="new-password"
              required
              autoFocus
              minLength={PASSWORD_MINIMUM_LENGTH}
              maxLength={200}
            />
          </label>
          <label>
            Confirm new password
            <input
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              minLength={PASSWORD_MINIMUM_LENGTH}
              maxLength={200}
            />
          </label>
          <button className="btn primary" disabled={busy}>
            {busy ? 'Setting password…' : 'Set password and sign in'}
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => {
              setOneTime(null);
              setError('');
            }}
          >
            Back to sign-in
          </button>
        </form>
      </main>
    );
  return (
    <main className="sign-in">
      <form
        key="sign-in"
        className="form sign-in-card"
        aria-labelledby="sign-in-title"
        onSubmit={async (e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          setBusy(true);
          setError('');
          try {
            const credentials = {
              username: String(f.get('username')),
              password: String(f.get('password')),
            };
            const response = await fetch('/api/sign-in', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(credentials),
            });
            const result = await response.json();
            if (
              result.code === 'oneTimePassword' ||
              result.code === 'passwordExpired'
            ) {
              setOneTime({ ...credentials, code: result.code });
              setBusy(false);
              return;
            }
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
        {demo && (
          <p className="sign-in-note">
            Prototype demo accounts (password is the username followed by{' '}
            <code>-demo</code>): <code>coordinator</code>, <code>analyst</code>,{' '}
            <code>analyst-2</code>, <code>manager</code>, <code>admin</code>,{' '}
            <code>quality-lead</code>.
          </p>
        )}
      </form>
    </main>
  );
}
