---
name: verify
description: Drive Benchline's laboratory workspace (React web UI plus its HTTP API) the way a lab user does, on an isolated seeded demo instance, and prove a change with screenshots, accessibility trees and audit trail rows. Dispatches a panel of checking subagents (feature drivers, regulatory auditors, presentation-rules and design-craft reviewers) so the work produced is accurate. Use before calling any change to src/ui/, src/styles.css, the Certificate of Analysis or a workflow done, when reviewing such a change, or when a UI bug is reported.
---

# Verify Benchline

Benchline is a GMP laboratory system of record. A screen that shows the wrong reason, hides a control a role needs, or drops a column from the audit trail is a compliance defect, not a cosmetic one. This skill proves what the real workspace does. It never reads JSX as a substitute for looking.

All scripts live in `.claude/skills/verify/scripts/` and run from the repo root. Every command below assumes these two exports:

```bash
export BENCHLINE_VERIFY_DIR="${TMPDIR:-/tmp}/benchline-verify"   # instances and evidence live here, never in the repo
export AGENT_BROWSER_SESSION="$(agent-browser session id --scope worktree --prefix benchline-verify)"
```

## Launch

```bash
.claude/skills/verify/scripts/start.sh 5199        # prints http://127.0.0.1:5199 when it answers
```

It runs `server/main.ts` in demo mode with `PORT=5199` and `BENCHLINE_DATABASE=$BENCHLINE_VERIFY_DIR/5199/verify.sqlite`, a fresh database seeded at start-up (six demo accounts, twelve-plus Samples across every status, three OOS investigations, published Certificates). It refuses a port some other process holds. Use one port per concurrent driver (5199, 5201, 5202, ...). Two drivers never share an instance, because every action writes audit trail rows the other would see.

The demo serves `src/` live through Vite, so uncommitted UI edits show without a restart. Server or seed edits need `stop.sh` then `start.sh`. Every instance serves the same checkout, so never edit `src/` while another agent is touring or driving: its next screenshot shows your half-finished edit. Only the first instance gets Vite's live-reload socket (port 24678); later ones log `Port 24678 is already in use` and still serve the current source on each page load, which is all a driver needs.

Needs `agent-browser` (0.37+). Run `agent-browser skills get core` once per session before driving. If it is missing, ask the user before `npm i -g agent-browser && agent-browser install`.

## Doctor

```bash
.claude/skills/verify/scripts/doctor.sh 5199
```

Read-only. Checks that the pid this skill recorded is alive, that it (or its child) holds the port, that the workspace answers, that the API returns 401 unsigned, that the database is the scratch copy and not `data/prototype.sqlite`, and that the server reports this checkout's commit. Run it first, and again whenever anything looks off. Never drive an instance whose doctor fails. Stop it and start your own.

## Drive

Sign in as the role the change is for. Passwords are read from `demo-credentials.txt` at run time. Never copy them into commits, docs, PR text or file names.

```bash
.claude/skills/verify/scripts/sign-in.sh manager 5199    # coordinator analyst analyst-2 manager admin quality-lead
```

Then the core loop. `agent-browser snapshot -i` shows names, roles and `[disabled]`. Act with refs from the latest snapshot, then re-snapshot.

Stable handles in this app:

- The view rail is `nav[aria-label="Main navigation"]`. Each view is a `.rail-item` button whose accessible name is the short label plus its count, such as `Approval 3`, `OOS 1`, `Methods`. `Benchline home` goes to the role's first view.
- The page heading (`h1`) names the view, such as `Approval queue 3`.
- Sample rows carry `data-sample="<id>"`. The Sample number inside is a button (`26-00011`). Opening one shows a panel with tabs `Results`, `Receipt` and `History`, and the role's actions at the bottom.
- Status filter buttons are named `<Status> <count>` (`Awaiting approval 3`). `/` focuses `Search samples`. `j`/`k` move the selection, `Esc` closes the panel, `r` refreshes.
- Signing dialogs are native `<dialog>` elements (`showModal`). Certificates open in a dialog from the Sample panel.
- Never `agent-browser press` a printable key the page does not consume (`r`, `n`, `s`, ...). agent-browser 0.37.1 then repeats the keydown thousands of times a second, and with `r` the workspace refetches in a loop until the browser wedges. `j`, `k`, `/`, `Escape`, `Enter` and arrows are safe. Use the `Refresh` and `Receive submission` buttons instead of `r` and `n`.
- A control a rule blocks is `[disabled]` or `aria-disabled="true"`, with its reason as visible text linked by `aria-describedby`. A control a role can never use is absent.

Per-role views (`src/ui/register.tsx`, `viewsForRole`). These are the view names the `h1` shows; the rail shortens three of them to `Approval`, `OOS` and `Publish`, followed by the queue count (the exact rail names are in [`features/README.md`](features/README.md)):

| Account        | Views                                                                                                   |
| -------------- | ------------------------------------------------------------------------------------------------------- |
| `coordinator`  | Receiving, Holds, Publish queue, Samples, Methods, Audit trail                                          |
| `analyst`      | My work, Methods, Audit trail                                                                           |
| `manager`      | Approval queue, OOS investigations, Methods, Audit trail                                                |
| `admin`        | Receiving, Holds, Samples, Publish queue, My work, Approval queue, OOS investigations, Methods, Audit trail, Accounts |
| `quality-lead` | Samples, Invalid signatures, Methods, Audit trail                                                       |

Feature recipes, with exact button names and the end state that proves each one, are in [`features/README.md`](features/README.md). A proof that drives one convenient entry point is incomplete when the map lists others.

### Tour and compare

For any change to how screens look, record every view for every role on the base commit and on the change, the same UTC day, and compare. The base runs from a worktree of `main` on its own port, served by this checkout's scripts through `BENCHLINE_VERIFY_CHECKOUT`:

```bash
V=.claude/skills/verify/scripts
BASE="$BENCHLINE_VERIFY_DIR/base-checkout"
git worktree add "$BASE" main && ln -s "$PWD/node_modules" "$BASE/node_modules"
exclude="$(git rev-parse --git-common-dir)/info/exclude"
grep -qx node_modules "$exclude" || echo node_modules >>"$exclude"
AGENT_BROWSER_SESSION=benchline-verify-5198 BENCHLINE_VERIFY_CHECKOUT="$BASE" BENCHLINE_TOUR_SCHEMES="light dark" \
  $V/tour.sh "$BENCHLINE_VERIFY_DIR/evidence/before" 5198
BENCHLINE_TOUR_SCHEMES="light dark" $V/tour.sh "$BENCHLINE_VERIFY_DIR/evidence/after" 5199
$V/compare.sh "$BENCHLINE_VERIFY_DIR/evidence/before" "$BENCHLINE_VERIFY_DIR/evidence/after"
git worktree remove --force "$BASE"
```

`tour.sh <out> [port] [roles...]` stops anything it started on that port, starts a freshly seeded instance, signs in as each role, opens every rail view and the first Sample in it, writes `<role>.<view>[.sample][.dark].png` plus `.a11y.txt`, and stops the instance when it exits. The accessibility text has clock times, UUIDs, hashes and refs masked, so two tours of fresh instances on the same UTC day are identical (tested). The seed places Due and received dates relative to the current UTC day, so a tour from yesterday differs on every queue screen: capture both sides in one sitting. The `exclude` line matters: `.gitignore`'s `node_modules/` does not match the symlink, so without it the base counts as modified and every Audit trail screen reads "with uncommitted changes" on one side only. For the same reason, commit or stash before the after tour: `git status --porcelain` must print nothing in both checkouts.

`compare.sh <before> <after>` exits 0 only when every accessibility tree matches. A pure restyle must exit 0. Every difference it prints must be an intended change named in the PR, or it is a defect. One known exception: when a browser command hangs and the tour signs back in to retry it, the `Audit trail` screens show one more `Signed In` / `Signed Out` group than the other tour. Those rows are the harness, not the change; any other difference is not.

### Stylesheet checks

```bash
node .claude/skills/verify/scripts/contrast.mjs     # or pass another stylesheet path
node .claude/skills/verify/scripts/invariants.mjs
```

`contrast.mjs` reads the colour tokens from `src/styles.css`, light and dark, and measures every text-on-background pairing the workspace draws (ink, muted and accent on each surface; each status colour on its wash; button text on its fill) against WCAG AA's 4.5:1. It also fails any rule that fades an element below full opacity, unless it is a blocked control, a decorative mark or an entrance state (`MAY_FADE`), because token ratios can't see opacity. A new token pairing the workspace uses is added to `TEXT_PAIRINGS` in the same change.

`invariants.mjs` holds the presentation rules that a restyle could silently undo, each checked against the stylesheet: a Result value is always ink; the Certificate document keeps Archivo, normal figures and normal tracking, and never animates; a reason, badge or hold never fades or slides in; press and entrance scaling only under `prefers-reduced-motion: no-preference` (or with a reduced-motion override); hover styles only for a fine pointer. Both scripts share `css-rules.mjs`, a small parser of the stylesheet's declarations and the blocks they sit in. Both exit 1 on any failure.

### When the browser hangs

agent-browser's daemon can stop answering: a command sits for minutes, or every retry prints `Resource temporarily unavailable (os error 35)`. Retrying through the same daemon never recovers, and `agent-browser close` hangs too, because it goes through that daemon.

Every script drives the browser through `browser` in `scripts/lib.sh`. It runs each `agent-browser` command under a deadline (`BROWSER_COMMAND_SECONDS`, default 45), and on a timeout or error it kills the session's daemon by the pid agent-browser 0.37 keeps in `~/.agent-browser/<session>.pid`, then returns failure. The next command starts a fresh browser. `tour.sh` then signs back in as the role, resets the viewport and colour scheme, and retries that view once before giving up with `gave up: <step>`. Proven by freezing the daemon mid-tour with `kill -STOP`: the tour logged `browser session ... restarted` and `retrying on a fresh browser: view admin 0`, and finished every screen.

By hand, when an interactive drive hangs:

```bash
source .claude/skills/verify/scripts/lib.sh
restart_browser                                   # kills this session's daemon and its Chrome
.claude/skills/verify/scripts/doctor.sh 5199      # then sign in again and reset the viewport
```

Use `browser <args>` instead of `agent-browser <args>` in any new helper so it inherits the deadline and the restart.

## Verification panel (subagents)

A single agent grading its own work passes too easily. After a change, the parent dispatches these reviewers in parallel (`run_in_background: true`), each with its own port and `AGENT_BROWSER_SESSION`, and file pointers rather than pasted context. Each returns a verdict of **VERIFIED**, **NOT VERIFIED** or **INCONCLUSIVE**, with the evidence path for every claim. INCONCLUSIVE is not a pass. A claim without an artifact is discarded.

| Reviewer | Dispatch when | Reads | Does | Returns |
| --- | --- | --- | --- | --- |
| **Tour judge** | any UI change | `compare.sh` output, both tours' PNGs | Classifies each accessibility difference as intended (named in the brief) or a defect. Looks at every before/after screenshot pair for clipped text, overlap, lost information, broken dark mode. | one row per screen: same / intended / defect, with file names |
| **Feature driver** (one per touched feature file) | any change a feature file covers | `features/<feature>.md` | Starts its own instance on its own port, drives every entry point in the recipe as the named role, captures the action and the resulting state, and checks the side effect in a second view (the History tab or the Audit trail). | per sub-feature ID: verdict plus screenshot and `.a11y.txt` paths |
| **Regulatory auditor** (one per matching file in `docs/regulatory/`, per `docs/agents/regulatory.md`) | the change touches Results, OOS, Limits, the audit trail, Electronic signatures, access, Sample receipt or Certificates, including how they are displayed | its regulatory file, the diff, the tour screenshots | Checks every requirement and developer-checklist rule that bears on what the screen shows. Examples are a signature showing the signer's printed name, date and time, and meaning (21 CFR 11.50); audit trail entries showing who, when, old and new value, and reason (11.10(e)); an OOS Result never looking like a passing one; a Certificate keeping every ISO/IEC 17025 7.8 item. | each rule with citation: satisfied / at risk / violated, and the screenshot that shows it |
| **Presentation-rules auditor** | any UI change | `docs/agents/frontend-design.md` step 3, `CONTEXT.md`, the diff, the tour | Checks that a never-usable control is hidden, a blocked control is disabled but focusable with its reason as visible text linked by `aria-describedby`, that no reason lives in a tooltip, that separation-of-duties notes are neutral and OOS blockers are the warning style, that every reason is word for word the server's refusal, and that labels use `CONTEXT.md` terms. | each rule: pass / fail with the element and screenshot |
| **Craft auditor** | any change to styles or motion | the `emil-design-eng` skill, the diff, the tour | Reviews against Emil Kowalski's checklist (no `transition: all`, ease-out entries, under 300ms, no motion on keyboard actions, press feedback, hover gated by `(hover: hover)`, reduced motion honoured). Runs `contrast.mjs` and `invariants.mjs`, and spot-checks computed colours on the rendered screens with `agent-browser eval` for any colour not drawn from a token. Checks focus is visible on every control. | Emil's Before / After / Why table, plus measured contrast ratios |

Brief template for each reviewer (fill the brackets, keep the rest):

> You are the [reviewer] for a change to Benchline on branch [branch]. Read `.claude/skills/verify/SKILL.md` and [its reads]. The change: [one paragraph in `CONTEXT.md` terms, and the list of intended differences]. Use port [port] and `AGENT_BROWSER_SESSION=benchline-verify-[port]`. Evidence goes under `$BENCHLINE_VERIFY_DIR/evidence/[reviewer]/`. Don't edit the repo. Return [its returns], each with a verdict of VERIFIED / NOT VERIFIED / INCONCLUSIVE and an artifact path. Stop your instance with `stop.sh [port]` before returning.

The parent owns the result. It opens at least one artifact behind every NOT VERIFIED, and a sample behind the VERIFIEDs, before believing them. It fixes each defect and re-runs only the reviewers whose ground moved.

## Evidence

Proof standards:

- Drive the real user path, signed in as the real role. No test-only endpoints, no setting React state, no editing the database.
- Capture the action and the resulting state, not only the final screen, as a snapshot and a screenshot per step.
- Verify side effects in a second view. A recorded Result appears in the Sample's `History` tab and in the `Audit trail` view with who, when, old value, new value and reason. A signature shows in the Sample panel's `Electronic signatures` region.
- Check a blocked control as a role it blocks, and a hidden control as a role that can never use it.
- Mocks are never needed. The demo's mail boundary already prints lockout notices to the server log instead of sending them.

Evidence goes to `$BENCHLINE_VERIFY_DIR/evidence/<run>/`, outside the repo. Report what was checked, as which role, what the screen showed, and the paths. If you didn't open the UI, say so rather than implying it was verified.

## Cleanup

```bash
.claude/skills/verify/scripts/stop.sh 5199
```

Closes this `AGENT_BROWSER_SESSION`'s browser, kills the pid tree `start.sh` recorded for that port, and deletes that instance's scratch database. It never kills by process name, and it leaves `$BENCHLINE_VERIFY_DIR/evidence/` alone. Run it after every failed attempt too, so broken runs don't strand ports.
