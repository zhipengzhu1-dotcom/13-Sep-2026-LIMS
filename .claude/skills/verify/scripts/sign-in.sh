#!/usr/bin/env bash
# Signs the current agent-browser session in as a demo account. The password
# is read from demo-credentials.txt at run time so it never lands in this skill.
# Usage: sign-in.sh <username> [port]
#   usernames: coordinator analyst analyst-2 manager admin quality-lead
set -euo pipefail
user="$1"
port="${2:-5199}"
repo="$(cd "$(dirname "$0")/../../../.." && pwd)"
: "${AGENT_BROWSER_SESSION:?export AGENT_BROWSER_SESSION first (see SKILL.md, Drive)}"
password="$(awk -v u="$user" '$1 == u { print $2; exit }' "$repo/demo-credentials.txt")"
[ -n "$password" ] || { echo "No demo account named $user" >&2; exit 1; }

ab() {
  local n
  for n in 1 2 3 4; do
    agent-browser "$@" && return 0
    sleep "$n"
  done
  return 1
}

ab open "http://127.0.0.1:$port/" >/dev/null
ab wait 400 >/dev/null
if [ "$(ab get count 'nav[aria-label="Main navigation"]')" -gt 0 ]; then
  ab find role button click --name "Sign out" >/dev/null
  ab wait 'input[required]' >/dev/null
fi
ab find label "Username" fill "$user" >/dev/null
ab find label "Password" fill "$password" >/dev/null
ab find role button click --name "Sign in" >/dev/null
ab wait 'nav[aria-label="Main navigation"]' >/dev/null
echo "signed in as $user"
