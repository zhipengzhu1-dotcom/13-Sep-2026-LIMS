#!/usr/bin/env bash
set -euo pipefail
user="$1"
port="${2:-5199}"
here="$(cd "$(dirname "$0")" && pwd)"
repo="$(cd "$here/../../../.." && pwd)"
source "$here/lib.sh"
: "${AGENT_BROWSER_SESSION:?export AGENT_BROWSER_SESSION first (see SKILL.md, Drive)}"
password="$(awk -v u="$user" '$1 == u { print $2; exit }' "$repo/demo-credentials.txt")"
[ -n "$password" ] || { echo "No demo account named $user" >&2; exit 1; }

browser open "http://127.0.0.1:$port/" >/dev/null
browser wait 400 >/dev/null
if [ "$(browser get count 'nav[aria-label="Main navigation"]')" -gt 0 ]; then
  browser find role button click --name "Sign out" >/dev/null
  browser wait 'input[required]' >/dev/null
fi
browser find label "Username" fill "$user" >/dev/null
browser find label "Password" fill "$password" >/dev/null
browser find role button click --name "Sign in" >/dev/null
browser wait 'nav[aria-label="Main navigation"]' >/dev/null
echo "signed in as $user"
