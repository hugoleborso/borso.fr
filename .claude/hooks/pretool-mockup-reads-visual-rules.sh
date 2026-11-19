#!/usr/bin/env bash
# PreToolUse (Artifact) — before a design canvas is started, name where an app
# keeps the rules about what its screens may draw.
#
# On PR #351 the session drew eight lineup mockups on a Design canvas, then
# recommended one that gave each instrument its own colour. pragma's rule is
# that a member colour is the only colour on a lineup. The rule was in the
# repository; the mockups came before any skill ran, so the line /specification
# carries ("read the app's VOCABULARY.md first") was never read. The moment the
# mistake is made is the canvas, so this speaks there.
#
# On PR #377 the hook fired, the session ran its grep and read "an instrument
# is shown by its glyph", then wrote "Gui garde la batterie" from the words the
# MCP returned. Reading a rule did not stop it, so for pragma it now names the
# kit that hands over the real glyphs, which makes the right drawing the
# shortest one.
#
# Advisory: it always exits 0 and answers with additionalContext. It speaks on
# a quickstart whose intent is a design, once per session. A publish names its
# type only by URL, so it says nothing there.
command -v jq >/dev/null 2>&1 || exit 0

INPUT="$(cat)"

ACTION="$(jq -r '.tool_input.action // "publish"' <<<"$INPUT")"
INTENT="$(jq -r '.tool_input.intent // ""' <<<"$INPUT")"
[ "$ACTION:$INTENT" = quickstart:design ] || exit 0

SESSION="$(jq -r '.session_id // "unknown"' <<<"$INPUT")"
MARKER="${TMPDIR:-/tmp}/mockup-reads-visual-rules-$SESSION"
[ -e "$MARKER" ] && exit 0
: >"$MARKER" 2>/dev/null || true

NOTE=$(
  cat <<'NOTE'
[mockup-visual-rules] A mockup of an app follows the rules the app already holds about what a screen may draw: what a colour means, which icons stand for what, which fonts and tokens exist. Read them before the first variant, for the app you are drawing:

  grep -rn -i -E 'colou?r|hue|icon|font|token' apps/<app>/VOCABULARY.md apps/<app>/DESIGN.md $(find apps/<app> -name INVARIANTS.md -not -path '*/node_modules/*')

A variant that breaks one of them is not an option the operator can pick.

pragma: draw members and instruments with the app's own marks, never as words. `pnpm --filter @borso-app/pragma run mockup-kit` prints each instrument glyph as SVG and a member-mark example to paste.
NOTE
)

jq -n --arg context "$NOTE" \
  '{hookSpecificOutput: {hookEventName: "PreToolUse", additionalContext: $context}}'
exit 0
