import React, { useEffect, useRef } from 'react';
import { publishQueue, type Sample } from '../laboratory/contracts';
import { closed, type View } from './shared';

/** Each role's own queue is a permission, not a preference: a Coordinator
 * receives Submissions, assigns them from Receiving and oversees the whole
 * register; an Analyst only ever acts on Samples assigned to them; a Manager
 * only ever acts on Samples awaiting approval. No one can act outside their
 * queue (the server enforces this — see `requireRole` and
 * `requireAssignedAnalyst` in handlers.ts), so there is no reason to show
 * them a queue they cannot use. */
export function viewsForRole(role: string | undefined): View[] {
  if (role === 'analyst') return ['My work', 'Methods', 'Audit trail'];
  if (role === 'manager')
    return ['Approval queue', 'OOS investigations', 'Methods', 'Audit trail'];
  return [
    'Receiving',
    'Holds',
    'Publish queue',
    'Samples',
    'Methods',
    'Audit trail',
  ];
}

export function defaultViewForRole(role: string | undefined): View {
  return viewsForRole(role)[0];
}

/** The rows a queue view starts from, before any filter or search. Counts in
 * the filter bar are taken from this set, so a role never sees totals for
 * samples outside its own queue. */
export function baseSet(view: View, samples: Sample[], actor: string) {
  if (view === 'Receiving')
    return samples.filter((s) => s.status === 'Received');
  if (view === 'Holds') return samples.filter((s) => s.status === 'On hold');
  if (view === 'Publish queue') return publishQueue(samples);
  if (view === 'My work')
    return samples.filter(
      (s) =>
        s.assignee === actor &&
        (s.status === 'In progress' ||
          s.status === 'Returned' ||
          s.status === 'Amendment in progress'),
    );
  if (view === 'Approval queue')
    return samples.filter((s) => s.status === 'Awaiting approval');
  return samples;
}

export const FILTERS = [
  'Active',
  'On hold',
  'Received',
  'In progress',
  'Returned',
  'Awaiting approval',
  'Approved',
  'Published',
  'Amendment in progress',
  'Withdrawn',
  'All',
] as const;

export type Filter = (typeof FILTERS)[number];

export function matches(s: Sample, f: Filter) {
  if (f === 'All') return true;
  if (f === 'Active') return !closed(s);
  // A returned sample is back at the analytical bench, so it is still work in
  // progress; "Returned" narrows to just those.
  if (f === 'In progress')
    return s.status === 'In progress' || s.status === 'Returned';
  return s.status === f;
}

/** Register filters beyond status. Empty means "any". */
export type Refine = { clientId: string; materialType: string; dueBy: string };

export const NO_REFINE: Refine = { clientId: '', materialType: '', dueBy: '' };

export function refines(s: Sample, r: Refine) {
  return (
    (!r.clientId || s.clientId === r.clientId) &&
    (!r.materialType || s.materialType === r.materialType) &&
    (!r.dueBy || s.dueDate <= r.dueBy)
  );
}

export const STATUS_ORDER: Sample['status'][] = [
  'On hold',
  'Received',
  'In progress',
  'Returned',
  'Awaiting approval',
  'Approved',
  'Published',
  'Amendment in progress',
  'Withdrawn',
];

export type SortKey = 'due' | 'id' | 'status';

export const PANEL_WIDTH_KEY = 'benchline:panel-width';

export const PANEL_DEFAULT = 560;

/** Neither pane may be dragged narrower than this, so the divider can never
 * hide the register or the open sample. CSS enforces the same floor when the
 * window itself shrinks. */
export const PANE_MIN = 360;

/** Width of the divider's grid track; must match `.workspace.has-sample`. */
export const SPLITTER_WIDTH = 7;

/** The widest the sample panel may be in a workspace of the given width, so
 * the register keeps its floor. */
export function panelMax(workspaceWidth: number) {
  return Math.max(PANE_MIN, workspaceWidth - SPLITTER_WIDTH - PANE_MIN);
}

export function clampPanel(width: number, workspaceWidth: number) {
  return Math.round(
    Math.max(PANE_MIN, Math.min(panelMax(workspaceWidth), width)),
  );
}

/** The divider between the register and the open sample. Drag it, or focus it
 * and use the arrow keys (Shift for bigger steps); double-click restores the
 * default width. Esc cancels a drag and restores the width it started from.
 * `width` is the width actually displayed, already clamped to `max`. */
export function Splitter({
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

export function SortHead({
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
