#!/bin/sh
set -eu
if [ "${1:-}" = "--health" ]; then exit 0; fi
cat >/dev/null
counter="${ONEKVM_EXTENSION_DATA:?}/calls"
calls=0
if [ -f "$counter" ]; then read -r calls <"$counter"; fi
calls=$((calls + 1))
printf '%s\n' "$calls" >"$counter"
printf '{"source":"mcp-tool-probe","calls":%s}\n' "$calls"
