#!/usr/bin/env bash
# The friction logger ships with the borso-harness plugin, so every repository
# that installs the plugin logs the same way. This path stays because a hundred
# documents and every subagent prompt name it.
exec "$(dirname "$0")/../plugins/borso-harness/scripts/kaizen.sh" "$@"
