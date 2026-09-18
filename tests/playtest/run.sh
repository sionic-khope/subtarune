#!/bin/bash
set -eu
exec node "$(dirname "$0")/lib/runner.mjs" "$@"
