#!/usr/bin/env bash
# PreToolUse, PostToolUse and PostToolUseFailure — put a knowledge entry in
# front of the agent at the moment it applies, rather than wait to be searched.
#
# A knowledge entry is found only by someone who already suspects its answer.
# Nine dantotsus record the same thing: the entry existed, was correct, and the
# trap hit anyway; what finally held each time was a hook or a gate printing the
# entry where the wrong conclusion was being formed. This hook is that, for
# every entry: each one declares in its front matter the file paths, commands
# and output text it applies to (see knowledge-triggers.py), and this matches
# the call against them.
#
#   PreToolUse  (Write, Edit, MultiEdit, NotebookEdit)  the target path
#   PreToolUse  (Bash)                                   the command, minus mentions
#   PostToolUse / PostToolUseFailure (Bash, mcp__*)      what the call printed
#
# The answer goes back as `additionalContext`. Plain stdout from these events
# reaches the debug log and not the model, and a failing Bash command fires
# PostToolUseFailure rather than PostToolUse, so both are needed.
#
# An entry is shown once per session: repeating it on every match teaches the
# reader to skip it. Output that comes from reading a markdown document is not
# matched, because a document quoting an error is not that error happening.
#
# Best-effort by contract: it ALWAYS exits 0, and it never refuses a call. It
# reads a precomputed lookup with jq, and rebuilds that lookup only when an
# entry is newer than it. `knowledge-triggers.py check` is the gate.
#
# See docs/adr/0030-knowledge-is-delivered-by-trigger.md.

command -v jq >/dev/null 2>&1 || exit 0

HOOK_DIRECTORY="$(cd "$(dirname "$0")" && pwd)"
SCRIPTS_DIRECTORY="$HOOK_DIRECTORY/../scripts"
MAXIMUM_ENTRIES=3
OUTPUT_HEAD=20000
OUTPUT_TAIL=20000

INPUT="$(cat)"

ROOT="$("$SCRIPTS_DIRECTORY/harness-path.sh" --root 2>/dev/null)" || exit 0
KNOWLEDGE="$ROOT/$("$SCRIPTS_DIRECTORY/harness-path.sh" knowledge 2>/dev/null)" || exit 0
LOOKUP="$ROOT/.claude/knowledge-triggers.json"
[ -d "$KNOWLEDGE" ] || exit 0

if [ ! -f "$LOOKUP" ] || [ "$KNOWLEDGE" -nt "$LOOKUP" ] ||
  [ -n "$(find "$KNOWLEDGE" -name '*.md' -newer "$LOOKUP" -print -quit 2>/dev/null)" ]; then
  python3 "$SCRIPTS_DIRECTORY/knowledge-triggers.py" compile >/dev/null 2>&1 || exit 0
fi
[ -f "$LOOKUP" ] || exit 0

EVENT="$(jq -r '.hook_event_name // "PreToolUse"' <<<"$INPUT" 2>/dev/null)" || exit 0
TOOL="$(jq -r '.tool_name // ""' <<<"$INPUT" 2>/dev/null)" || exit 0

case "$EVENT:$TOOL" in
  PreToolUse:Write | PreToolUse:Edit | PreToolUse:MultiEdit | PreToolUse:NotebookEdit)
    KIND=paths
    SUBJECT="$(jq -r '.tool_input.file_path // .tool_input.notebook_path // ""' <<<"$INPUT")"
    ;;
  PreToolUse:Bash)
    KIND=commands
    SUBJECT="$(jq -r '.tool_input.command // ""' <<<"$INPUT")"
    ;;
  PostToolUse:Bash | PostToolUse:mcp__* | PostToolUseFailure:Bash | PostToolUseFailure:mcp__*)
    KIND=output
    if jq -e '.tool_input | tostring | test("\\.md\\b")' <<<"$INPUT" >/dev/null 2>&1; then
      exit 0
    fi
    SUBJECT="$(jq -r --argjson head "$OUTPUT_HEAD" --argjson tail "$OUTPUT_TAIL" '
      ( .error
        // ( .tool_response
             | if type == "string" then .
               elif type == "object" and (has("stdout") or has("stderr"))
                 then (.stdout // "") + "\n" + (.stderr // "")
               else tostring end )
        // "" )
      | if length > ($head + $tail) then .[0:$head] + "\n" + .[-$tail:] else . end
    ' <<<"$INPUT" 2>/dev/null)"
    ;;
  *) exit 0 ;;
esac

[ -n "$SUBJECT" ] || exit 0

matching_entries() {
  jq -r --arg kind "$KIND" --arg subject "$1" '
    .entries[] | select(any(.[$kind][]; . as $pattern | $subject | test($pattern))) | .path
  ' "$LOOKUP" 2>/dev/null
}

MATCHED="$(matching_entries "$SUBJECT")"
[ -n "$MATCHED" ] || exit 0

if [ "$KIND" = commands ]; then
  INVOKED="$(printf '%s' "$SUBJECT" |
    python3 "$HOOK_DIRECTORY/strip-heredocs.py" |
    python3 "$HOOK_DIRECTORY/strip-quoted-strings.py")"
  MATCHED="$(matching_entries "$INVOKED")"
  [ -n "$MATCHED" ] || exit 0
fi

SESSION="$(jq -r '.session_id // ""' <<<"$INPUT" | tr -cd 'A-Za-z0-9_-')"
SEEN=""
if [ -n "$SESSION" ]; then
  SEEN="${TMPDIR:-/tmp}/knowledge-triggers-$SESSION.seen"
  touch "$SEEN" 2>/dev/null || SEEN=""
fi

FRESH=""
while IFS= read -r entry; do
  [ -n "$entry" ] || continue
  if [ -n "$SEEN" ] && grep -qxF -- "$entry" "$SEEN"; then continue; fi
  FRESH="$FRESH$entry"$'\n'
done <<<"$MATCHED"
[ -n "$FRESH" ] || exit 0

SELECTED="$(printf '%s' "$FRESH" | head -n "$MAXIMUM_ENTRIES")"
[ -n "$SEEN" ] && printf '%s\n' "$SELECTED" >>"$SEEN"

case "$KIND" in
  paths) MOMENT="The file this call writes" ;;
  commands) MOMENT="The command about to run" ;;
  output) MOMENT="What that call printed" ;;
esac

CONTEXT="$(jq -r --arg selected "$SELECTED" --arg moment "$MOMENT" '
  ($selected | split("\n") | map(select(length > 0))) as $wanted
  | [ .entries[] | select(.path as $path | $wanted | index($path)) ] as $found
  | "[knowledge] " + $moment + " matches "
    + (if ($found | length) == 1 then "a knowledge entry" else "knowledge entries" end)
    + " written after the same moment cost a session before. Read "
    + (if ($found | length) == 1 then "it" else "them" end)
    + " before concluding anything:\n\n"
    + ([ $found[] | "- `" + .path + "`: " + .summary ] | join("\n"))
' "$LOOKUP" 2>/dev/null)" || exit 0

[ -n "$CONTEXT" ] || exit 0

jq -n --arg event "$EVENT" --arg context "$CONTEXT" \
  '{hookSpecificOutput: {hookEventName: $event, additionalContext: $context}}'
exit 0
