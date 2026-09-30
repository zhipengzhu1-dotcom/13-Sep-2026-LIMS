#!/usr/bin/env bash
# Starts an isolated demo instance: its own port, its own freshly seeded
# database, never data/prototype.sqlite. Prints the URL once it answers.
# Usage: start.sh [port]   (default 5199)
set -euo pipefail
port="${1:-5199}"
repo="$(cd "$(dirname "$0")/../../../.." && pwd)"
dir="${BENCHLINE_VERIFY_DIR:-${TMPDIR:-/tmp}/benchline-verify}/$port"

if [ -f "$dir/server.pid" ] && kill -0 "$(cat "$dir/server.pid")" 2>/dev/null; then
  echo "An instance this skill started is already running on $port (pid $(cat "$dir/server.pid")). Run stop.sh $port first." >&2
  exit 1
fi
if lsof -nP -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1; then
  echo "Port $port is taken by a process this skill did not start. Pick another port." >&2
  exit 1
fi

mkdir -p "$dir"
rm -f "$dir/verify.sqlite" "$dir/verify.sqlite-wal" "$dir/verify.sqlite-shm"
cd "$repo"
BENCHLINE_MODE=demo PORT="$port" BENCHLINE_DATABASE="$dir/verify.sqlite" \
  nohup npx tsx server/main.ts >"$dir/server.log" 2>&1 &
echo $! >"$dir/server.pid"

for _ in $(seq 1 60); do
  if curl -sf "http://127.0.0.1:$port/" >/dev/null; then
    echo "http://127.0.0.1:$port"
    exit 0
  fi
  if ! kill -0 "$(cat "$dir/server.pid")" 2>/dev/null; then
    echo "The server exited during start-up:" >&2
    cat "$dir/server.log" >&2
    exit 1
  fi
  sleep 1
done
echo "No answer on $port after 60s. Log: $dir/server.log" >&2
exit 1
