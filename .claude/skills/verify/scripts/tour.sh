#!/usr/bin/env bash
set -euo pipefail
out="$1"
port="${2:-5199}"
shift $(($# >= 2 ? 2 : 1))
roles=("$@")
[ ${#roles[@]} -gt 0 ] || roles=(coordinator analyst manager admin quality-lead)
here="$(cd "$(dirname "$0")" && pwd)"
source "$here/lib.sh"
: "${AGENT_BROWSER_SESSION:?export AGENT_BROWSER_SESSION first (see SKILL.md, Drive)}"
mkdir -p "$out"
rail='nav[aria-label="Main navigation"] .rail-item'

normalise() {
  sed -E \
    -e 's/ ?\[ref=e[0-9]+\]//g' \
    -e 's/, ref=e[0-9]+\]/]/g' \
    -e 's/(^|[^0-9])[0-9]{1,2}:[0-9]{2}/\1HH:MM/g' \
    -e 's/HH:MM:[0-9]{2}(\.[0-9]+)?/HH:MM:SS/g' \
    -e 's/[0-9a-f]{64}/<sha256>/g' \
    -e 's/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/<uuid>/g' \
    -e 's/(spinbutton "(Hours|Minutes|Seconds|AM\/PM)[^"]*"): [0-9]+/\1: N/g' \
    -e 's/(commit )[0-9a-f]{7,40}/\1<sha>/g'
}

capture() {
  local snapshot
  snapshot="$(browser snapshot -i -c)" && [ -n "$snapshot" ] || return 1
  printf '%s\n' "$snapshot" | normalise >"$out/$1.a11y.txt" || return 1
  browser screenshot "$out/$1.png" >/dev/null || return 1
}

prepare() {
  browser set viewport 1440 900 >/dev/null || return 1
  browser set media "$1" >/dev/null || return 1
}

signed_out() {
  prepare "$1" || return 1
  browser open "http://127.0.0.1:$port/" >/dev/null || return 1
  browser wait 600 >/dev/null || return 1
  local signed
  signed="$(browser get count 'nav[aria-label="Main navigation"]')" || return 1
  if [ "$signed" -gt 0 ]; then
    browser find role button click --name "Sign out" >/dev/null || return 1
    browser wait 'input[required]' >/dev/null || return 1
  fi
  capture "sign-in$2" || return 1
}

view() {
  local role="$1" suffix="$2" i="$3" name
  browser eval "document.querySelectorAll('$rail')[$i].click()" >/dev/null || return 1
  browser wait 500 >/dev/null || return 1
  name="$(browser eval "document.querySelectorAll('$rail')[$i].querySelector('span').textContent" | tr -d '"' | tr ' ' '-' | tr '[:upper:]' '[:lower:]')" || return 1
  capture "$role.$name$suffix" || return 1
  local samples
  samples="$(browser get count '[data-sample]')" || return 1
  if [ "$samples" -gt 0 ]; then
    browser eval "document.querySelector('[data-sample] button, [data-sample]').click()" >/dev/null || return 1
    browser wait 600 >/dev/null || return 1
    capture "$role.$name.sample$suffix" || return 1
  fi
}

signed_in() {
  "$here/sign-in.sh" "$1" "$port" >/dev/null && prepare "$2"
}

# A step that fails has already restarted the browser; sign back in and try
# it once more before giving up on the tour.
again() {
  local role="$1" scheme="$2"
  shift 2
  "$@" && return 0
  echo "retrying on a fresh browser: $*" >&2
  { [ -z "$role" ] || signed_in "$role" "$scheme"; } && "$@" && return 0
  echo "gave up: $*" >&2
  exit 1
}

"$here/stop.sh" "$port" >/dev/null
"$here/start.sh" "$port" >/dev/null
trap '"$here/stop.sh" "$port" >/dev/null' EXIT

for scheme in ${BENCHLINE_TOUR_SCHEMES:-light}; do
  suffix=""
  [ "$scheme" = light ] || suffix=".$scheme"
  again "" "$scheme" signed_out "$scheme" "$suffix"
  for role in "${roles[@]}"; do
    again "" "$scheme" signed_in "$role" "$scheme"
    count="$(browser get count "$rail")" || { signed_in "$role" "$scheme"; count="$(browser get count "$rail")"; }
    for i in $(seq 0 $((count - 1))); do
      again "$role" "$scheme" view "$role" "$suffix" "$i"
    done
    echo "toured $role ($count views, $scheme)"
  done
done
echo "evidence: $out"
