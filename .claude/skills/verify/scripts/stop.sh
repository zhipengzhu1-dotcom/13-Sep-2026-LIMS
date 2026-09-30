#!/usr/bin/env bash
set -uo pipefail
port="${1:-5199}"
here="$(cd "$(dirname "$0")" && pwd)"
source "$here/lib.sh"
dir="${BENCHLINE_VERIFY_DIR:-${TMPDIR:-/tmp}/benchline-verify}/$port"
[ -n "${AGENT_BROWSER_SESSION:-}" ] && stop_browser
[ -f "$dir/server.pid" ] || { echo "no instance recorded for $port"; exit 0; }
pid="$(cat "$dir/server.pid")"
kids="$(pgrep -P "$pid" 2>/dev/null || true)"
grandkids="$(for k in $kids; do pgrep -P "$k" 2>/dev/null; done)"
kill $pid $kids $grandkids 2>/dev/null || true
sleep 1
rm -f "$dir/server.pid" "$dir/verify.sqlite" "$dir/verify.sqlite-wal" "$dir/verify.sqlite-shm"
echo "stopped $pid on $port"
