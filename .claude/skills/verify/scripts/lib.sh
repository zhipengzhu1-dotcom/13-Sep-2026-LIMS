BROWSER_COMMAND_SECONDS="${BROWSER_COMMAND_SECONDS:-45}"

run_with_timeout() {
  local seconds="$1"
  shift
  perl -e 'alarm shift; exec @ARGV' "$seconds" "$@"
}

# agent-browser 0.37 keeps each session's daemon pid here; a daemon that has
# stopped answering can only be stopped by that pid, since "close" goes
# through the daemon itself.
restart_browser() {
  local pidfile="${AGENT_BROWSER_HOME:-$HOME/.agent-browser}/$AGENT_BROWSER_SESSION.pid"
  local daemon
  daemon="$(cat "$pidfile" 2>/dev/null)"
  [ -n "$daemon" ] || return 0
  kill $(pgrep -P "$daemon") "$daemon" 2>/dev/null
  sleep 1
  kill -9 "$daemon" 2>/dev/null
  rm -f "$pidfile"
  echo "browser session $AGENT_BROWSER_SESSION restarted after a hung or refused command" >&2
}

browser() {
  local err status=0
  err="$(mktemp)"
  run_with_timeout "$BROWSER_COMMAND_SECONDS" agent-browser "$@" 2>"$err" || status=$?
  cat "$err" >&2
  if [ "$status" -eq 142 ] || grep -q 'os error 35\|daemon may be busy' "$err"; then
    restart_browser
  fi
  rm -f "$err"
  return "$status"
}

stop_browser() {
  run_with_timeout 5 agent-browser close >/dev/null 2>&1 || restart_browser
}
