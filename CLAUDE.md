## Agent skills

### Issue tracker

Issues are tracked in GitHub Issues for zhipengzhu1-dotcom/13-Sep-2026, managed with the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Default vocabulary: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `CONTEXT.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.

### Regulatory guidelines

Benchline must meet 21 CFR Part 11, 21 CFR 211 and ISO/IEC 17025. Before building or reviewing a change to Results, OOS investigations, Limits, the audit trail, Electronic signatures, access, Sample receipt and handling, or Certificates of Analysis, consult the guidelines through subagents. See `docs/agents/regulatory.md`.

### Coding standards

Code follows Matt Pocock's recommendations: deep modules, test-first through public interfaces, mocks only at system boundaries. Before writing, refactoring or reviewing code, read `docs/agents/coding-standards.md`.

### Front-end design

Before designing, building or reviewing a change to workspace screens, styles or the rendered Certificate of Analysis, invoke the `ui-ux-pro-max` skills. See `docs/agents/frontend-design.md`.

### Seeing the web UI

When you need to see what the workspace looks like or how it behaves (finishing or reviewing a UI change, or a UI bug), use the `agent-browser` CLI against `npm run dev`. See `docs/agents/browser-verification.md`.
