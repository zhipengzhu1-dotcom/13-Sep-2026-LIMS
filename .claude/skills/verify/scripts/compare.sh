#!/usr/bin/env bash
# Compares two tours. The accessibility trees must match for a change that
# only restyles: every label, reason, role and disabled state the same. Any
# difference is printed and must be explained or fixed.
# Usage: compare.sh <before-dir> <after-dir>
set -uo pipefail
before="$1"
after="$2"
changed=0
for f in "$before"/*.a11y.txt; do
  name="$(basename "$f")"
  if [ ! -f "$after/$name" ]; then
    echo "MISSING in after: $name"
    changed=1
  elif ! diff -q "$f" "$after/$name" >/dev/null; then
    echo "DIFFERS: $name"
    diff -u "$f" "$after/$name" | sed -n '3,40p'
    changed=1
  fi
done
for f in "$after"/*.a11y.txt; do
  [ -f "$before/$(basename "$f")" ] || { echo "NEW in after: $(basename "$f")"; changed=1; }
done
[ $changed = 0 ] && echo "accessibility trees identical across $(ls "$before"/*.a11y.txt | wc -l | tr -d ' ') screens"
exit $changed
