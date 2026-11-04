#!/usr/bin/env bash
# SessionStart — let a shell command find the harness when it is linked in as
# plain files rather than loaded as a plugin.
#
# The skills name the harness's own files as `${CLAUDE_PLUGIN_ROOT}/…`. Claude
# Code fills that in when it loads the plugin. When a repository links the
# skills into .claude/ instead (see scripts/link-into.sh), nothing fills it in,
# and a command an agent copies from a skill expands it to an empty string. So
# this hook exports the variable to the session's shell, computed from where
# this script really lives. A plugin load already has it and is left alone.
#
# It also gives the shell a TMPDIR when the session starts without one. The
# sweep of PR #249 wrote eleven `$TMPDIR/…` files with TMPDIR empty, so each
# landed at the filesystem root, where the safety check then refused to remove
# them. See docs/dantotsus/an-empty-tmpdir-wrote-to-the-root.md.
#
# Best-effort by contract: it ALWAYS exits 0.

[ -n "${CLAUDE_ENV_FILE:-}" ] || exit 0

if [ -z "${TMPDIR:-}" ]; then
  session_tmp="$(mktemp -d /tmp/claude-session.XXXXXX 2>/dev/null)" &&
    printf 'export TMPDIR=%q\n' "$session_tmp" >> "$CLAUDE_ENV_FILE"
fi

[ -n "${CLAUDE_PLUGIN_ROOT:-}" ] && exit 0

plugin_root="$(cd -P "$(dirname "$0")/.." 2>/dev/null && pwd)" || exit 0
printf 'export CLAUDE_PLUGIN_ROOT=%q\n' "$plugin_root" >> "$CLAUDE_ENV_FILE"
exit 0
