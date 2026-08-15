#!/usr/bin/env bash
# PreToolUse (Write) — put the blueprint for a file's layer in front of the
# agent BEFORE it writes that file, not after a reviewer notices it diverged.
#
# CLAUDE.md already says to read the blueprint index before writing a new file
# in apps/. That instruction competes with everything else in a long context,
# and the failure is silent: the file gets written in a shape nobody chose, the
# lint rules pass because they check placement rather than shape, and the
# divergence surfaces in review or not at all.
#
# So the seeding is mechanical. A new source file under apps/ or infra/ gets
# its layer's canonical example, and the standard that layer answers to,
# injected as context on the write itself.
#
# Only for a file that does not exist yet. Editing a file means the agent has
# already read it, and repeating the blueprint on every edit is noise that
# trains the reader to skip it.
#
# Best-effort by contract: it ALWAYS exits 0. A hook that blocks a write
# because a generated JSON is stale would be worse than the drift it prevents.
# The real gate is `blueprint-indexing.ts --check` at commit time.
#
# Reads a precomputed lookup rather than importing blueprint-utils.ts, because
# starting tsx costs about a second and this runs on every write. The layer
# tables inside that JSON are emitted from the same constants `inferLayer`
# uses, so the two cannot disagree. See blueprint-context.ts.

command -v jq >/dev/null 2>&1 || exit 0

INPUT=$(cat)
FILE=$(jq -r '.tool_input.file_path // empty' <<<"$INPUT")
[ -z "$FILE" ] && exit 0

cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0

# Path relative to the repository root, which is what the lookup is keyed on.
RELATIVE=${FILE#"$PWD"/}

case "$RELATIVE" in
  apps/* | infra/*) ;;
  *) exit 0 ;;
esac
case "$RELATIVE" in
  *.ts | *.tsx) ;;
  *) exit 0 ;;
esac
case "$RELATIVE" in
  *.test.ts | *.test.tsx | *.test-utils.ts | *.d.ts) exit 0 ;;
esac

# An existing file has already been read by whoever is editing it.
[ -e "$FILE" ] && exit 0

LOOKUP=.claude/skills/blueprint/blueprint-context.json
[ -f "$LOOKUP" ] || exit 0

CONTEXT=$(jq -r --arg path "$RELATIVE" '
  def layer_of($p):
    ( [ .entryPointSuffixes[] as $s | select($p | endswith($s)) | "entrypoint" ] | first )
    // ( [ .pathSegments[]      as $r | select($p | contains($r.segment)) | $r.layer ] | first )
    // ( [ .fileSuffixes[]      as $r | select($p | endswith($r.suffix))  | $r.layer ] | first )
    // "unknown";

  def project_of($p):
    if   ($p | startswith("infra/"))      then "infra"
    elif ($p | contains("/api/src/"))     then "api"
    elif ($p | contains("/domain/"))      then "domain"
    elif ($p | contains("/cdk/"))         then "cdk"
    else "site" end;

  . as $root
  | layer_of($path) as $layer
  | project_of($path) as $project
  | (($root.blueprints[$project + "/" + $layer] // []) | .[0:2]) as $found
  | if ($found | length) == 0 then empty
    else
      "This file reads as the **" + $layer + "** layer of **" + $project + "**.\n\n"
      + "Canonical example" + (if ($found|length) > 1 then "s" else "" end) + " to copy the shape of:\n\n"
      + ([ $found[]
           | "- `" + .id + "` — " + .name + "\n"
           + "  - `" + .path + "` (" + (.followers|tostring) + " follower(s))\n"
           + (if (.usage | length) > 0 then "  - " + .usage + "\n" else "" end) ] | join(""))
      + "\nRead the example before writing, and mark the new file "
      + "`// @FollowsBlueprint <id>` when it copies one. The pre-commit gate "
      + "rejects a marker naming a blueprint that does not exist.\n"
      + "\nCopy the code, not the `@Blueprint` JSDoc block. A second file "
      + "declaring the same id fails the gate, and an agent copying the "
      + "example literally has already done this. The declaration stays in "
      + "the one file that is the blueprint; the copy carries the one-line "
      + "marker instead.\n"
      + (($root.standardByLayer[$layer] // "") | if length > 0 then "\nThe rule this layer answers to: `" + . + "`.\n" else "" end)
    end
' "$LOOKUP" 2>/dev/null) || exit 0

[ -z "$CONTEXT" ] && exit 0

jq -n --arg context "$CONTEXT" \
  '{hookSpecificOutput: {hookEventName: "PreToolUse", additionalContext: $context}}'
exit 0
