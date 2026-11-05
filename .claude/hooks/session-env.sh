#!/usr/bin/env bash
# SessionStart: give the session shell a TMPDIR.
#
# A session can start without one. The
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

exit 0
