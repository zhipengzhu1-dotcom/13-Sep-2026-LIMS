#!/usr/bin/env bash
set -uo pipefail
port="${1:-5199}"
repo="${BENCHLINE_VERIFY_CHECKOUT:-$(cd "$(dirname "$0")/../../../.." && pwd)}"
dir="${BENCHLINE_VERIFY_DIR:-${TMPDIR:-/tmp}/benchline-verify}/$port"
fail=0
check() { if eval "$2"; then echo "ok    $1"; else echo "FAIL  $1"; fail=1; fi; }

pid="$(cat "$dir/server.pid" 2>/dev/null || echo none)"
check "server pid $pid is alive" "kill -0 $pid 2>/dev/null"
descends_from() { local p="$1"; while [ -n "$p" ] && [ "$p" != 1 ] && [ "$p" != 0 ]; do [ "$p" = "$2" ] && return 0; p="$(ps -o ppid= -p "$p" | tr -d ' ')"; done; return 1; }
listener="$(lsof -nP -iTCP:"$port" -sTCP:LISTEN -t 2>/dev/null | head -1)"
check "port $port is held by our process tree" "[ -n '$listener' ] && descends_from '$listener' '$pid'"
check "workspace answers" "curl -sf http://127.0.0.1:$port/ >/dev/null"
check "API refuses an unsigned request (401)" \
  "[ \"\$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:$port/api/session)\" = 401 ]"
check "database is the scratch copy, not data/prototype.sqlite" \
  "grep -q \"^Database: $dir/verify.sqlite\" '$dir/server.log'"
check "serving this checkout's commit ($(git -C "$repo" rev-parse --short HEAD))" \
  "grep -q \"commit $(git -C "$repo" rev-parse --short HEAD)\" '$dir/server.log'"
if git -C "$repo" diff --quiet HEAD -- src; then :; else
  echo "note  src/ has uncommitted changes; the demo serves them live from source"
fi
exit $fail
