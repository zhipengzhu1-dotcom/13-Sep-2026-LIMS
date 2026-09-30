#!/usr/bin/env bash
# Visits every view every role can open, and the first Sample in each, and
# records what the screen shows: a screenshot and the accessibility tree
# (names, roles, disabled state) with volatile parts stripped, so two tours
# can be compared with compare.sh. Tour a freshly started instance each time
# (stop.sh, start.sh): every sign-in adds audit trail rows.
# Usage: tour.sh <out-dir> [port] [roles...]
#   default roles: coordinator analyst manager admin quality-lead
#   BENCHLINE_TOUR_SCHEMES="light dark" also captures dark mode (default light)
set -euo pipefail
out="$1"
port="${2:-5199}"
shift $(($# >= 2 ? 2 : 1))
roles=("$@")
[ ${#roles[@]} -gt 0 ] || roles=(coordinator analyst manager admin quality-lead)
here="$(cd "$(dirname "$0")" && pwd)"
: "${AGENT_BROWSER_SESSION:?export AGENT_BROWSER_SESSION first (see SKILL.md, Drive)}"
mkdir -p "$out"

# The browser daemon occasionally answers "busy"; a command is retried before
# the tour gives up.
ab() {
  local n
  for n in 1 2 3 4; do
    agent-browser "$@" && return 0
    sleep "$n"
  done
  return 1
}

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
  local name="$1"
  ab snapshot -i -c | normalise >"$out/$name.a11y.txt"
  ab screenshot "$out/$name.png" >/dev/null
}

ab set viewport 1440 900 >/dev/null
for scheme in ${BENCHLINE_TOUR_SCHEMES:-light}; do
  ab set media "$scheme" >/dev/null
  suffix=""
  [ "$scheme" = light ] || suffix=".$scheme"
  ab open "http://127.0.0.1:$port/" >/dev/null
  ab wait 600 >/dev/null
  if [ "$(ab get count 'nav[aria-label="Main navigation"]')" -gt 0 ]; then
    ab find role button click --name "Sign out" >/dev/null
    ab wait 'input[required]' >/dev/null
  fi
  capture "sign-in$suffix"
  for role in "${roles[@]}"; do
    "$here/sign-in.sh" "$role" "$port" >/dev/null
    # A relaunched browser forgets the viewport and colour scheme; set both
    # for every role so every screenshot has the same size and theme.
    ab set viewport 1440 900 >/dev/null
    ab set media "$scheme" >/dev/null
    count="$(ab get count 'nav[aria-label="Main navigation"] .rail-item')"
    for i in $(seq 0 $((count - 1))); do
      ab eval "document.querySelectorAll('nav[aria-label=\"Main navigation\"] .rail-item')[$i].click()" >/dev/null
      ab wait 500 >/dev/null
      view="$(ab eval "document.querySelectorAll('nav[aria-label=\"Main navigation\"] .rail-item')[$i].querySelector('span').textContent" | tr -d '"' | tr ' ' '-' | tr '[:upper:]' '[:lower:]')"
      capture "$role.$view$suffix"
      if [ "$(ab get count '[data-sample]')" -gt 0 ]; then
        ab eval "document.querySelector('[data-sample] button, [data-sample]').click()" >/dev/null
        ab wait 600 >/dev/null
        capture "$role.$view.sample$suffix"
        ab press Escape >/dev/null
      fi
    done
    echo "toured $role ($count views, $scheme)"
  done
done
echo "evidence: $out"
