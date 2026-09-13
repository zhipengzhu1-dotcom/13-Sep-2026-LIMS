import React, { useEffect, useRef, useState } from 'react';
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
const names: Record<View, string> = {
  Samples: 'Sample workspace',
  'My work': 'My work',
  'Review queue': 'Review queue',
  Methods: 'Method catalog',
  Activity: 'Laboratory activity',
};
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
type WorkspaceMode = 'Cards' | 'Tabs' | 'Grid';
const WORKSPACE_MODE_KEY = 'benchline:workspace-mode';
const date = (value: string) =>
  new Date(
    value.length === 10 ? value + 'T12:00:00' : value,
  ).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
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
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.65"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name] ?? paths.Samples}
    </svg>
  );
}
function Badge({ sample }: { sample: Sample }) {
  // An out-of-spec result reads as "Investigate", not "Exception" — it needs
  // a second look, not a verdict of failure. It also gets its own colour,
  // distinct from "Returned", so the two don't read as the same thing.
  return (
    <span
      className={
        'badge ' +
        (hasException(sample)
          ? 'investigate'
          : sample.status.toLowerCase().replaceAll(' ', '-'))
      }
    >
      {hasException(sample) ? 'Investigate' : sample.status}
    </span>
  );
}

function App() {
  const [data, setData] = useState<Snapshot | null>(null);
  const [actor, setActor] = useState('coordinator');
  const [view, setView] = useState<View>('Samples');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All samples');
  const [selected, setSelected] = useState<string | null>(null);
  const [mode, setModeState] = useState<WorkspaceMode>(() => {
    try {
      const stored = localStorage.getItem(WORKSPACE_MODE_KEY);
      return stored === 'Tabs' || stored === 'Grid' ? stored : 'Cards';
    } catch {
      return 'Cards';
    }
  });
  function setMode(next: WorkspaceMode) {
    setModeState(next);
    try {
      localStorage.setItem(WORKSPACE_MODE_KEY, next);
    } catch {
      // Per-viewer convenience only; a private window or blocked storage
      // just means the mode resets next visit instead of persisting.
    }
  }
  const [intake, setIntake] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const pending = useRef<string | null>(null);
  async function reload() {
    const response = await fetch('/api/workspace');
    if (!response.ok)
      throw new Error('The workspace is unavailable. Please try again.');
    setData(await response.json());
  }
  useEffect(() => {
    reload().catch((e) => setError(e.message));
  }, []);
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
          ? `Already recorded at ${date(result.originallyAppliedAt)}. Nothing was saved twice.`
          : command.type === 'receive'
            ? `${result.sample.id} received.`
            : 'Change saved to the laboratory record.',
      );
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
  const sample = data?.samples.find((s) => s.id === selected);
  const active = data?.samples.filter((s) => s.status !== 'Approved') ?? [];
  const counts = [
    {
      label: 'Active samples',
      count: active.length,
      hint: 'Across the laboratory',
      filter: 'Active',
      color: 'blue',
    },
    {
      label: 'In progress',
      count:
        data?.samples.filter(
          (s) => s.status === 'In progress' || s.status === 'Returned',
        ).length ?? 0,
      hint: 'At the analytical bench',
      filter: 'In progress',
      color: 'teal',
    },
    {
      label: 'Awaiting review',
      count: data?.samples.filter((s) => s.status === 'In review').length ?? 0,
      hint: 'Ready for a second look',
      filter: 'In review',
      color: 'purple',
    },
    {
      label: 'Exceptions',
      count: active.filter(hasException).length,
      hint: 'Need investigation',
      filter: 'Exceptions',
      color: 'orange',
    },
  ];
  const visible =
    data?.samples.filter((s) => {
      if (
        view === 'My work' &&
        (s.assignee !== actor || s.status === 'Approved')
      )
        return false;
      if (view === 'Review queue' && s.status !== 'In review') return false;
      if (filter === 'Active' && s.status === 'Approved') return false;
      if (filter === 'Exceptions' && !hasException(s)) return false;
      if (
        !['All samples', 'Active', 'Exceptions'].includes(filter) &&
        s.status !== filter &&
        !(filter === 'In progress' && s.status === 'Returned')
      )
        return false;
      return `${s.id} ${s.product} ${s.client} ${s.batch}`
        .toLowerCase()
        .includes(search.toLowerCase());
    }) ?? [];
  function navigate(next: View) {
    setView(next);
    setFilter('All samples');
    setSearch('');
    setSelected(null);
  }
  function switchActor(nextId: string) {
    setActor(nextId);
    setError('');
    navigate(
      defaultViewForRole(data?.people.find((p) => p.id === nextId)?.role),
    );
  }
  const roleViews = viewsForRole(person?.role);
  const wide = !!selected && mode !== 'Cards';
  // A stat tile used to always jump to the unrestricted "Samples" register.
  // For a role without that view, that would leak the full register past
  // the same boundary the nav and the server both enforce — so land on the
  // role's own queue instead, with the tile's filter still applied on top.
  function openFiltered(nextFilter: string) {
    setView(
      roleViews.includes('Samples')
        ? 'Samples'
        : defaultViewForRole(person?.role),
    );
    setFilter(nextFilter);
    setSearch('');
    setSelected(null);
  }
  return (
    <div className="app">
      <aside className="sidebar">
        <a
          className="brand"
          href="#"
          onClick={() => navigate(defaultViewForRole(person?.role))}
        >
          <span className="brand-mark">
            b<span>·</span>
          </span>
          <span>
            benchline<small>LABORATORY WORKSPACE</small>
          </span>
        </a>
        <div className="lab-label">
          <span className="lab-avatar">AL</span>
          <div>
            Analytical laboratory<small>Pharmaceutical testing</small>
          </div>
        </div>
        <div className="nav-caption">WORKSPACE</div>
        <nav aria-label="Main navigation">
          {roleViews.map((v) => (
            <button
              key={v}
              className={view === v ? 'nav-item selected' : 'nav-item'}
              onClick={() => navigate(v)}
            >
              <Icon name={v} />
              {v}
              {v === 'Review queue' && (
                <span className="nav-count">{counts[2].count}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <span className="prototype-pill">LOCAL PROTOTYPE</span>
          <p>
            A paperless workflow,
            <br />
            one sample at a time.
          </p>
          <small>Fictional data · Demo users</small>
        </div>
      </aside>
      <div className="main-wrap">
        <header className="topbar">
          <div className="breadcrumb">
            Workspace <span>/</span> <strong>{view}</strong>
          </div>
          <label className="demo-user">
            <span>Demo user</span>
            <select value={actor} onChange={(e) => switchActor(e.target.value)}>
              {data?.people.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} · {p.role}
                </option>
              ))}
            </select>
            <span className="avatar">
              {person?.name
                .split(' ')
                .map((n) => n[0])
                .join('') ?? 'ML'}
            </span>
          </label>
        </header>
        <main>
          <div className="page-heading">
            <div>
              <div className="eyebrow">ANALYTICAL OPERATIONS</div>
              <h1>{names[view]}</h1>
              <p>
                {view === 'Samples'
                  ? 'From sample receipt to reviewed results.'
                  : view === 'My work'
                    ? 'Assigned samples for the selected demo user.'
                    : view === 'Review queue'
                      ? 'Submitted results awaiting independent review.'
                      : view === 'Methods'
                        ? 'Illustrative methods and acceptance limits.'
                        : 'A chronological record of laboratory work.'}
              </p>
            </div>
            <div className="heading-actions">
              <button
                className="button secondary"
                disabled={busy}
                onClick={() => {
                  setError('');
                  reload().catch((e) => setError(e.message));
                }}
              >
                ↻ <span>Refresh</span>
              </button>
              <button
                className="button primary"
                onClick={() => {
                  setError('');
                  setIntake(true);
                }}
                disabled={!data || person?.role !== 'coordinator'}
                title="Sample receipt requires the coordinator demo user"
              >
                ＋ Receive sample
              </button>
            </div>
          </div>
          <div className="demo-banner">
            <span className="demo-label">DEMO</span>
            <span>
              Local evaluation only. Fictional specifications; not validated for
              regulated laboratory records.
            </span>
          </div>
          {error && (
            <div role="alert" className="message error">
              {error}
            </div>
          )}
          {notice && (
            <div role="status" className="message success">
              {notice}
            </div>
          )}
          {!data ? (
            <div className="empty">
              {error
                ? 'Unable to load samples. Use Refresh to retry.'
                : 'Loading the laboratory workspace…'}
            </div>
          ) : (
            <>
              {['Samples', 'My work', 'Review queue'].includes(view) && (
                <>
                  <div className={'workspace-split' + (wide ? ' wide' : '')}>
                    <div className="queue-pane">
                      <div className="stats">
                        {counts.map((c) => (
                          <button
                            key={c.label}
                            className={'stat ' + c.color}
                            onClick={() => openFiltered(c.filter)}
                          >
                            <span>
                              {c.label}
                              <span className="stat-line" />
                            </span>
                            <strong>
                              {c.count.toString().padStart(2, '0')}
                            </strong>
                            <small>{c.hint}</small>
                          </button>
                        ))}
                      </div>
                      <section className="queue card">
                        <div className="section-title">
                          <div>
                            <h2>
                              {view === 'Samples' ? 'Sample register' : view}
                              <span className="count">{visible.length}</span>
                            </h2>
                            <p>
                              {view === 'My work' && person?.role !== 'analyst'
                                ? 'Select an analyst demo user to see their assignments.'
                                : 'Open a sample to continue its workflow.'}
                            </p>
                          </div>
                          <span className="saved-note">Saved locally</span>
                        </div>
                        <div className="toolbar">
                          <label className="search">
                            <span aria-hidden="true">⌕</span>
                            <input
                              aria-label="Search samples"
                              placeholder="Search sample, product, client or batch…"
                              value={search}
                              onChange={(e) => setSearch(e.target.value)}
                            />
                          </label>
                          <label className="filter">
                            <span>Status</span>
                            <select
                              aria-label="Filter by status"
                              value={filter}
                              onChange={(e) => setFilter(e.target.value)}
                            >
                              {[
                                'All samples',
                                'Active',
                                'Received',
                                'In progress',
                                'In review',
                                'Returned',
                                'Approved',
                                'Exceptions',
                              ].map((f) => (
                                <option key={f}>{f}</option>
                              ))}
                            </select>
                          </label>
                        </div>
                        <div className="table-scroll">
                          <table>
                            <thead>
                              <tr>
                                <th>Sample / product</th>
                                <th>Client / batch</th>
                                <th>Status</th>
                                <th>Tests</th>
                                <th>Assigned to</th>
                                <th>Due date</th>
                                <th>
                                  <span className="sr-only">Open sample</span>
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {visible.map((s) => (
                                <tr
                                  key={s.id}
                                  className={
                                    s.id === selected ? 'selected' : undefined
                                  }
                                >
                                  <td>
                                    <button
                                      className="sample-link"
                                      onClick={() => {
                                        setSelected(s.id);
                                        setError('');
                                      }}
                                    >
                                      {s.id}
                                    </button>
                                    <div className="product-name">
                                      {s.product}
                                    </div>
                                  </td>
                                  <td>
                                    {s.client}
                                    <small className="cell-sub mono">
                                      {s.batch}
                                    </small>
                                  </td>
                                  <td>
                                    <Badge sample={s} />
                                    {hasException(s) && (
                                      <small className="cell-sub">
                                        {s.status}
                                      </small>
                                    )}
                                  </td>
                                  <td>
                                    <span className="test-fraction">
                                      {
                                        s.tests.filter((t) => t.results.length)
                                          .length
                                      }
                                      <span> / {s.tests.length}</span>
                                    </span>
                                    <div
                                      className="test-bars"
                                      aria-hidden="true"
                                    >
                                      {s.tests.map((t) => (
                                        <i
                                          key={t.id}
                                          className={
                                            t.results.length
                                              ? t.results.at(-1)?.inSpec
                                                ? 'done'
                                                : 'flagged'
                                              : ''
                                          }
                                        />
                                      ))}
                                    </div>
                                  </td>
                                  <td>
                                    {s.assignee ? (
                                      <span className="assignee">
                                        <span className="mini-avatar">
                                          {data.people
                                            .find((p) => p.id === s.assignee)
                                            ?.name.split(' ')
                                            .map((n) => n[0])
                                            .join('')}
                                        </span>
                                        {
                                          data.people.find(
                                            (p) => p.id === s.assignee,
                                          )?.name
                                        }
                                      </span>
                                    ) : (
                                      <span className="muted">Unassigned</span>
                                    )}
                                  </td>
                                  <td>
                                    <span>{date(s.dueDate)}</span>
                                    {s.priority === 'Urgent' && (
                                      <small className="urgent">Urgent</small>
                                    )}
                                  </td>
                                  <td>
                                    <button
                                      className="open-button"
                                      aria-label={'Open ' + s.id}
                                      onClick={() => {
                                        setSelected(s.id);
                                        setError('');
                                      }}
                                    >
                                      ↗
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        {!visible.length && (
                          <div className="empty">
                            <h3>No matching samples</h3>
                            <p>Change your filters or receive a new sample.</p>
                          </div>
                        )}
                        <div className="table-footer">
                          {visible.length} of {data.samples.length} samples
                          <span>All dates shown in your local time</span>
                        </div>
                      </section>
                    </div>
                    <div className="detail-pane">
                      {wide && (
                        <div className="chip-strip" aria-label="Switch sample">
                          {visible.map((s) => (
                            <button
                              key={s.id}
                              className={
                                'chip' + (s.id === selected ? ' selected' : '')
                              }
                              onClick={() => setSelected(s.id)}
                            >
                              {s.id}
                              <Badge sample={s} />
                            </button>
                          ))}
                        </div>
                      )}
                      {sample ? (
                        <SampleDetail
                          key={sample.id}
                          sample={sample}
                          data={data}
                          actor={actor}
                          busy={busy}
                          mode={mode}
                          onModeChange={setMode}
                          execute={execute}
                          onClose={() => setSelected(null)}
                        />
                      ) : (
                        <div className="empty detail-empty">
                          <h3>No sample open</h3>
                          <p>
                            Select a sample from the queue to open its
                            workspace.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                  <section className="workflow-strip">
                    <div>
                      <span className="eyebrow">THE SAMPLE JOURNEY</span>
                      <h3>Every handoff, accounted for.</h3>
                    </div>
                    <ol>
                      {['Receive', 'Assign', 'Record results', 'Review'].map(
                        (s, i) => (
                          <li key={s}>
                            <span>{i + 1}</span>
                            {s}
                          </li>
                        ),
                      )}
                    </ol>
                  </section>
                </>
              )}
              {view === 'Methods' && (
                <div className="method-grid">
                  {data.methods.map((m) => (
                    <article className="card method-card" key={m.id}>
                      <span className="technique">{m.technique}</span>
                      <h2>{m.name}</h2>
                      <p className="mono">{m.method}</p>
                      <div className="limit">
                        {m.min}–{m.max}
                        <span>{m.unit}</span>
                      </div>
                      <p>Inclusive acceptance limits</p>
                      <small>
                        Demo only. Limits are copied to each sample at receipt.
                      </small>
                    </article>
                  ))}
                </div>
              )}
              {view === 'Activity' && (
                <section className="card activity-card">
                  <ActivityList events={data.activity} data={data} />
                </section>
              )}
            </>
          )}
          <footer className="page-footer">
            <span>BENCHLINE / ANALYTICAL LABORATORY</span>
            <span>Prototype 0.1 · Sample-to-review</span>
          </footer>
        </main>
      </div>
      {intake && data && (
        <Modal
          title="Receive a sample"
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

function Modal({
  title,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      className={wide ? 'modal wide' : 'modal'}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      aria-label={title}
    >
      <div className="modal-heading">
        <div>
          <span className="eyebrow">LABORATORY RECORD</span>
          <h2>{title}</h2>
        </div>
        <button className="close" aria-label="Close dialog" onClick={onClose}>
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
      className="intake form-body"
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
      <p>
        Register the material and requested tests. A laboratory number is
        assigned when you save.
      </p>
      <div className="form-grid">
        <label>
          Product / material
          <input
            name="product"
            required
            maxLength={200}
            placeholder="e.g. Acetaminophen tablets 500 mg"
          />
        </label>
        <label>
          Client
          <input
            name="client"
            required
            maxLength={200}
            placeholder="Organization name"
          />
        </label>
        <label>
          Batch / lot number
          <input
            name="batch"
            required
            maxLength={200}
            placeholder="Client batch identifier"
          />
        </label>
        <label>
          Due date
          <input name="dueDate" type="date" required />
        </label>
        <label>
          Priority
          <select name="priority">
            <option>Routine</option>
            <option>Urgent</option>
          </select>
        </label>
      </div>
      <fieldset>
        <legend>
          Requested tests <span className="muted">· select at least one</span>
        </legend>
        {data.methods.map((m) => (
          <label className="method-choice" key={m.id}>
            <input type="checkbox" name="methods" value={m.id} defaultChecked />
            <span>
              {m.name}
              <small>{m.method}</small>
            </span>
            <span className="mono">
              {m.min}–{m.max} {m.unit}
            </span>
          </label>
        ))}
      </fieldset>
      <label>
        Receipt notes
        <textarea
          name="notes"
          rows={3}
          maxLength={2000}
          placeholder="Condition, storage location, or receipt observations"
        />
      </label>
      {error && (
        <div role="alert" className="message error">
          {error}
        </div>
      )}
      <div className="form-actions">
        <span>Coordinator role required</span>
        <button className="button primary" disabled={disabled}>
          Receive sample
        </button>
      </div>
    </form>
  );
}

function SampleDetail({
  sample: s,
  data,
  actor,
  busy,
  mode,
  onModeChange,
  execute,
  onClose,
}: {
  sample: Sample;
  data: Snapshot;
  actor: string;
  busy: boolean;
  mode: WorkspaceMode;
  onModeChange: (mode: WorkspaceMode) => void;
  execute: (command: Draft) => Promise<boolean>;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<'Results' | 'History'>('Results');
  const person = data.people.find((p) => p.id === actor)!;
  const canRecord =
    s.assignee === actor && ['In progress', 'Returned'].includes(s.status);
  const canReview = person.role === 'reviewer' && s.status === 'In review';
  const events = data.activity.filter((a) => a.sampleId === s.id);
  return (
    <div className="form-body detail-body">
      <button className="text-button back-to-queue" onClick={onClose}>
        ← Back to queue
      </button>
      <div className="detail-product">
        <div>
          <h3>{s.product}</h3>
          <p>
            {s.client} <span>·</span> Batch {s.batch}
          </p>
        </div>
        <Badge sample={s} />
      </div>
      <div className="record-meta">
        <div>
          <span>Received</span>
          {date(s.receivedAt)}
        </div>
        <div>
          <span>Due date</span>
          {date(s.dueDate)}
        </div>
        <div>
          <span>Priority</span>
          {s.priority}
        </div>
        <div>
          <span>Assigned analyst</span>
          {data.people.find((p) => p.id === s.assignee)?.name ?? 'Unassigned'}
        </div>
      </div>
      {s.notes && <p className="receipt-note">{s.notes}</p>}
      {person.role === 'coordinator' &&
        !['Approved', 'In review'].includes(s.status) && (
          <form
            className="assignment"
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
            <label>
              Assign an analyst
              <select
                key={s.assignee}
                name="assignee"
                defaultValue={s.assignee ?? ''}
                required
              >
                <option value="" disabled>
                  Select analyst
                </option>
                {data.people
                  .filter((p) => p.role === 'analyst')
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
              </select>
            </label>
            <button className="button secondary" disabled={busy}>
              Save assignment
            </button>
          </form>
        )}
      <div className="detail-tabs" role="tablist" aria-label="Sample details">
        {(['Results', 'History'] as const).map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
          >
            {t}
            {t === 'History' && <span>{events.length}</span>}
          </button>
        ))}
      </div>
      {tab === 'History' ? (
        <ActivityList events={events} data={data} />
      ) : (
        <>
          {hasException(s) && (
            <div className="message warning">
              A current or historical result is outside its specification.
              Routine approval remains blocked after revisions; investigation
              and disposition are outside this prototype.
            </div>
          )}
          {s.status === 'Returned' && (
            <div className="message warning">
              {events.find((e) => e.action === 'review')?.detail}
            </div>
          )}
          <div className="mode-switch" role="tablist" aria-label="Result view">
            {(['Cards', 'Tabs', 'Grid'] as const).map((m) => (
              <button
                key={m}
                role="tab"
                aria-selected={mode === m}
                className={mode === m ? 'selected' : undefined}
                onClick={() => onModeChange(m)}
              >
                {m}
              </button>
            ))}
          </div>
          {mode === 'Cards' && (
            <div className="test-list">
              {s.tests.map((t) => (
                <ResultCard
                  key={t.id}
                  test={t}
                  sample={s}
                  canRecord={canRecord}
                  busy={busy}
                  execute={execute}
                  data={data}
                />
              ))}
            </div>
          )}
          {mode === 'Tabs' && (
            <TestFocus
              sample={s}
              tests={s.tests}
              canRecord={canRecord}
              busy={busy}
              execute={execute}
              data={data}
            />
          )}
          {mode === 'Grid' && (
            <ResultGrid
              sample={s}
              tests={s.tests}
              canRecord={canRecord}
              busy={busy}
              execute={execute}
              data={data}
            />
          )}
          {canRecord && (
            <div className="form-actions">
              <span>
                {s.tests.filter((t) => t.results.length).length} of{' '}
                {s.tests.length} results recorded
              </span>
              <button
                className="button primary"
                disabled={busy || s.tests.some((t) => !t.results.length)}
                onClick={() =>
                  void execute({
                    type: 'submit',
                    sampleId: s.id,
                    revision: s.revision,
                  })
                }
              >
                Submit for review →
              </button>
            </div>
          )}
          {canReview && (
            <form
              className="review-form"
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
              <h3>Independent review</h3>
              <label>
                Review comments
                <textarea
                  name="comment"
                  required
                  minLength={3}
                  maxLength={2000}
                  rows={3}
                  placeholder="Document your review or explain the correction needed."
                />
              </label>
              <div className="form-actions">
                <button
                  className="button secondary"
                  name="decision"
                  value="return"
                  disabled={busy}
                >
                  Return for correction
                </button>
                <button
                  className="button primary"
                  name="decision"
                  value="approve"
                  disabled={busy || hasException(s)}
                >
                  Approve results
                </button>
              </div>
            </form>
          )}
          {s.status === 'Approved' ? (
            <div className="message success">
              Reviewed and approved. This sample is locked.
            </div>
          ) : (
            !canRecord &&
            !canReview && (
              <p className="role-hint">
                {s.status === 'In review'
                  ? 'Select the reviewer demo user to review results.'
                  : s.assignee
                    ? 'Select the assigned analyst demo user to enter results.'
                    : 'A coordinator must assign an analyst before results can be recorded.'}
              </p>
            )
          )}
        </>
      )}
    </div>
  );
}

/** The one place a `record` command is built, so Cards, Tabs and Grid enter
 * a result the same way regardless of how differently they display it. */
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

function ResultCard({
  test: t,
  sample: s,
  canRecord,
  busy,
  execute,
  data,
}: {
  test: Test;
  sample: Sample;
  canRecord: boolean;
  busy: boolean;
  execute: (command: Draft) => Promise<boolean>;
  data: Snapshot;
}) {
  const latest = t.results.at(-1);
  const [editing, setEditing] = useState(false);
  useEffect(() => {
    setEditing(false);
  }, [latest?.recordedAt]);
  return (
    <article className="result-card">
      <div className="result-header">
        <div>
          <h3>{t.name}</h3>
          <p>
            {t.method} <span>·</span> Specification {t.min}–{t.max} {t.unit}
          </p>
        </div>
        {latest ? (
          <div className={'result-value ' + (latest.inSpec ? '' : 'out')}>
            <strong>
              {latest.value}
              <span> {t.unit}</span>
            </strong>
            <small>
              {latest.inSpec ? 'Within specification' : 'Outside specification'}
            </small>
          </div>
        ) : (
          <span className="muted">Not recorded</span>
        )}
      </div>
      {latest && (
        <div className="result-provenance">
          {data.people.find((p) => p.id === latest.analyst)?.name}{' '}
          <span>·</span> {latest.reference} <span>·</span> Revision{' '}
          {t.results.length}
          {canRecord && (
            <button
              className="text-button"
              onClick={() => setEditing(!editing)}
            >
              {editing ? 'Cancel edit' : 'Revise result'}
            </button>
          )}
        </div>
      )}
      {canRecord && (!latest || editing) && (
        <form
          className="result-form"
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
              setEditing(false);
          }}
        >
          <div className="result-inputs">
            <label>
              Result ({t.unit})
              <input
                name="value"
                type="number"
                step="any"
                required
                defaultValue={latest?.value}
                placeholder="0.00"
              />
            </label>
            <label>
              Run / worksheet reference
              <input
                name="reference"
                required
                maxLength={200}
                defaultValue={latest?.reference}
                placeholder="e.g. HPLC-2026-0042"
              />
            </label>
            <button className="button secondary" disabled={busy}>
              Save result
            </button>
          </div>
          {latest && (
            <label>
              Reason for revision
              <input
                name="reason"
                required
                minLength={3}
                maxLength={1000}
                placeholder="Explain why the recorded result is changing"
              />
            </label>
          )}
        </form>
      )}
      {t.results.length > 1 && (
        <details className="revisions">
          <summary>View {t.results.length} result revisions</summary>
          {t.results.map((r, i) => (
            <p key={i}>
              <strong>
                v{i + 1}: {r.value} {t.unit}
              </strong>{' '}
              · {data.people.find((p) => p.id === r.analyst)?.name} ·{' '}
              {new Date(r.recordedAt).toLocaleString()}
              <br />
              {r.reference}
              {r.reason && ` — ${r.reason}`}
            </p>
          ))}
        </details>
      )}
    </article>
  );
}

/** Tabs mode: one test in focus at a time, full width — for a test whose
 * revision history or provenance needs room, at the cost of a click to
 * compare two tests. Reuses `ResultCard` for the active test rather than
 * a second copy of its form and revision list. */
function TestFocus({
  sample: s,
  tests,
  canRecord,
  busy,
  execute,
  data,
}: {
  sample: Sample;
  tests: Test[];
  canRecord: boolean;
  busy: boolean;
  execute: (command: Draft) => Promise<boolean>;
  data: Snapshot;
}) {
  const [activeId, setActiveId] = useState(tests[0]?.id);
  const active = tests.find((t) => t.id === activeId) ?? tests[0];
  return (
    <div className="test-focus">
      <div className="chip-strip" role="tablist" aria-label="Tests">
        {tests.map((t) => {
          const latest = t.results.at(-1);
          return (
            <button
              key={t.id}
              role="tab"
              aria-selected={t.id === active?.id}
              className={'chip' + (t.id === active?.id ? ' selected' : '')}
              onClick={() => setActiveId(t.id)}
            >
              <span
                className={
                  'chip-dot' +
                  (latest ? (latest.inSpec ? ' approved' : ' investigate') : '')
                }
                aria-hidden="true"
              />
              {t.name}
            </button>
          );
        })}
      </div>
      {active && (
        <ResultCard
          key={active.id}
          test={active}
          sample={s}
          canRecord={canRecord}
          busy={busy}
          execute={execute}
          data={data}
        />
      )}
    </div>
  );
}

/** Grid mode: every test as one dense row — fastest for a heads-down entry
 * session across many tests at once. Editing a row reveals the same fields
 * `ResultCard`'s form does, inline, rather than navigating away from the
 * sheet. */
function ResultGrid({
  sample: s,
  tests,
  canRecord,
  busy,
  execute,
  data,
}: {
  sample: Sample;
  tests: Test[];
  canRecord: boolean;
  busy: boolean;
  execute: (command: Draft) => Promise<boolean>;
  data: Snapshot;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  return (
    <div className="table-scroll">
      <table className="grid-table">
        <thead>
          <tr>
            <th>Test</th>
            <th>Specification</th>
            <th>Result</th>
            <th>Analyst</th>
            <th>Status</th>
            {canRecord && (
              <th>
                <span className="sr-only">Edit</span>
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {tests.map((t) => {
            const latest = t.results.at(-1);
            const editing = editingId === t.id;
            return (
              <React.Fragment key={t.id}>
                <tr>
                  <td>
                    {t.name}
                    <div className="cell-sub mono">{t.method}</div>
                  </td>
                  <td className="mono">
                    {t.min}–{t.max} {t.unit}
                  </td>
                  <td>
                    {latest ? (
                      <span
                        className={
                          'result-value inline' + (latest.inSpec ? '' : ' out')
                        }
                      >
                        {latest.value} {t.unit}
                      </span>
                    ) : (
                      <span className="muted">Not recorded</span>
                    )}
                  </td>
                  <td>
                    {latest
                      ? data.people.find((p) => p.id === latest.analyst)?.name
                      : '—'}
                  </td>
                  <td>
                    {latest ? (
                      <span
                        className={
                          'badge ' +
                          (latest.inSpec ? 'approved' : 'investigate')
                        }
                      >
                        {latest.inSpec ? 'In spec' : 'Investigate'}
                      </span>
                    ) : (
                      <span className="badge">Pending</span>
                    )}
                  </td>
                  {canRecord && (
                    <td>
                      <button
                        className="text-button"
                        onClick={() => setEditingId(editing ? null : t.id)}
                      >
                        {editing ? 'Cancel' : latest ? 'Revise' : 'Enter'}
                      </button>
                    </td>
                  )}
                </tr>
                {canRecord && editing && (
                  <tr className="grid-edit-row">
                    <td colSpan={6}>
                      <form
                        className="result-form"
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
                        <div className="result-inputs">
                          <label>
                            Result ({t.unit})
                            <input
                              name="value"
                              type="number"
                              step="any"
                              required
                              defaultValue={latest?.value}
                              placeholder="0.00"
                            />
                          </label>
                          <label>
                            Run / worksheet reference
                            <input
                              name="reference"
                              required
                              maxLength={200}
                              defaultValue={latest?.reference}
                              placeholder="e.g. HPLC-2026-0042"
                            />
                          </label>
                          <button className="button secondary" disabled={busy}>
                            Save result
                          </button>
                        </div>
                        {latest && (
                          <label>
                            Reason for revision
                            <input
                              name="reason"
                              required
                              minLength={3}
                              maxLength={1000}
                              placeholder="Explain why the recorded result is changing"
                            />
                          </label>
                        )}
                      </form>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function ActivityList({
  events,
  data,
}: {
  events: Snapshot['activity'];
  data: Snapshot;
}) {
  return (
    <div className="activity-list">
      {!events.length && <p className="empty">No activity yet.</p>}
      {events.map((e) => (
        <article className="activity-item" key={e.id}>
          <span className="activity-marker">
            <Icon name="Activity" />
          </span>
          <div>
            <div className="activity-title">
              <strong>
                {data.people.find((p) => p.id === e.actor)?.name ?? e.actor}
              </strong>
              <span className="mono">{e.sampleId}</span>
              <time dateTime={e.at}>{new Date(e.at).toLocaleString()}</time>
            </div>
            <p>{e.detail}</p>
          </div>
        </article>
      ))}
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
