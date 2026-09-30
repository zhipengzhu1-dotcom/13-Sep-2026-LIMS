#!/usr/bin/env bash
# Stops the instance this skill started on this port and closes the browser
# session. Evidence directories are left alone.
# Usage: stop.sh [port]
set -uo pipefail
port="${1:-5199}"
dir="${BENCHLINE_VERIFY_DIR:-${TMPDIR:-/tmp}/benchline-verify}/$port"
# A wedged browser can keep "close" from returning; give it five seconds.
if [ -n "${AGENT_BROWSER_SESSION:-}" ]; then
  agent-browser close >/dev/null 2>&1 &
  closer=$!
  for _ in 1 2 3 4 5; do kill -0 "$closer" 2>/dev/null || break; sleep 1; done
  kill "$closer" 2>/dev/null || true
fi
[ -f "$dir/server.pid" ] || { echo "no instance recorded for $port"; exit 0; }
pid="$(cat "$dir/server.pid")"
kids="$(pgrep -P "$pid" 2>/dev/null || true)"
grandkids="$(for k in $kids; do pgrep -P "$k" 2>/dev/null; done)"
kill $pid $kids $grandkids 2>/dev/null || true
sleep 1
rm -f "$dir/server.pid" "$dir/verify.sqlite" "$dir/verify.sqlite-wal" "$dir/verify.sqlite-shm"
echo "stopped $pid on $port"
