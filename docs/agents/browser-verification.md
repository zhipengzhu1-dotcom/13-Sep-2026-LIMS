# Seeing the web UI

When you need to see what Benchline's workspace looks like or how it behaves, use the `agent-browser` CLI. Use it instead of other browser tools, and don't rely on reading JSX alone.

## When this applies

- Before calling a change to `src/ui/`, `src/styles.css` or the rendered Certificate of Analysis done. This is the check in step 4 of `frontend-design.md`, done on the real screen.
- When reviewing a UI change, or when a UI bug is reported.
- Whenever a question is about what a screen shows: labels, blocked controls and their reasons, layout.

## Steps

1. **Load the CLI's guide.** Run `agent-browser skills get core` before your first command, since it matches the installed version. If `agent-browser` isn't installed, ask the user before running `npm i -g agent-browser && agent-browser install`.
2. **Start the app.** Run `npm run dev` in the background. It serves the workspace and API on `http://127.0.0.1:5173` and seeds the demo database. In a worktree, or if 5173 is taken, set `PORT` to a free port.
3. **Use your own session.** Run `export AGENT_BROWSER_SESSION="$(agent-browser session id --scope worktree --prefix benchline)"` so you don't take over another agent's browser.
4. **Sign in as the role the change is for.** Accounts are in `demo-credentials.txt`. Check a blocked control as a role it blocks, and a hidden control as a role that can never use it. Never copy the passwords into commits, docs, PR text or file names.
5. **Look, then act.**
   - Look: `agent-browser open <url>`, then `snapshot -i`, which shows labels, roles and `aria-disabled`.
   - Act: `click` or `fill` with refs from the latest snapshot, then re-snapshot.
   - Capture what you'll report with `agent-browser screenshot <file>` in your scratch or `$TMPDIR`, never the repo.
6. **Clean up.** Run `agent-browser close` and stop the dev server.

## What to report

- What you checked, as which role, and what the screen showed.
- Any mismatch with spec #17's workspace presentation rules, or with the server's refusal text.

If you didn't open the UI, say so rather than implying it was verified.
