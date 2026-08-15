#!/usr/bin/env bash
# Extract the files a human pasted into this Claude Code session.
#
# A pasted image does not arrive as a file on disk, so it is easy to conclude it
# is unreachable and work from a description of it instead. That conclusion is
# wrong and it has already been acted on here: a band logo was pasted, declared
# unavailable, redrawn by hand from memory, and shipped as an app icon before
# the human said it looked nothing like their logo. The bytes were sitting in
# the session transcript the whole time.
#
# Claude Code appends every message to a JSONL transcript, and an attachment
# rides along as a base64 `image` block. This reads that file and writes each
# attachment out.
#
#   scripts/session-attachments.sh list          what is in this session
#   scripts/session-attachments.sh extract <dir> write them all to <dir>
#
# Newest transcript for the current project by default; pass a path as the last
# argument to read a specific one.
#
# See docs/dantotsus/said-the-file-was-unreachable-without-looking.md.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PROJECTS_DIR="${CLAUDE_PROJECTS_DIR:-$HOME/.claude/projects}"

fail() {
  printf '\033[31m[attachments]\033[0m %s\n' "$1" >&2
  exit 1
}

# Claude Code slugifies the working directory into the project folder name, and
# a session started from a subdirectory gets its own folder — so several may
# match one repository. Search them all, newest transcript wins.
find_transcript() {
  local slug newest
  slug="$(printf '%s' "$REPO_ROOT" | tr '/.' '--')"
  newest="$(find "$PROJECTS_DIR" -maxdepth 2 -name '*.jsonl' -path "*${slug}*" -printf '%T@ %p\n' 2>/dev/null \
    | sort -rn | head -1 | cut -d' ' -f2-)"
  [ -n "$newest" ] || fail "no transcript under $PROJECTS_DIR matching $slug"
  printf '%s' "$newest"
}

ACTION="${1:-list}"
case "$ACTION" in
  list) TRANSCRIPT="${2:-$(find_transcript)}" ;;
  extract)
    [ -n "${2:-}" ] || fail "usage: scripts/session-attachments.sh extract <output-dir> [transcript]"
    OUTPUT_DIR="$2"
    TRANSCRIPT="${3:-$(find_transcript)}"
    mkdir -p "$OUTPUT_DIR"
    ;;
  *) fail "unknown command '$ACTION' — list | extract <dir> [transcript]" ;;
esac

[ -f "$TRANSCRIPT" ] || fail "no transcript at $TRANSCRIPT"
printf '\033[36m[attachments]\033[0m reading %s\n' "$TRANSCRIPT"

node -e '
const fs = require("fs");
const readline = require("readline");
const [transcript, action, outputDir] = process.argv.slice(1);
const extensions = { "image/png": "png", "image/jpeg": "jpg", "image/gif": "gif", "image/webp": "webp" };
let index = 0;
const stream = readline.createInterface({ input: fs.createReadStream(transcript) });
stream.on("line", (line) => {
  if (!line.includes("base64")) return;
  let entry;
  try { entry = JSON.parse(line); } catch { return; }
  const content = entry?.message?.content;
  if (!Array.isArray(content)) return;
  for (const block of content) {
    if (block?.type !== "image" || block?.source?.type !== "base64") continue;
    const role = entry?.message?.role ?? "unknown";
    const bytes = Buffer.from(block.source.data, "base64");
    const extension = extensions[block.source.media_type] ?? "bin";
    const name = `attachment-${index}-${role}.${extension}`;
    if (action === "extract") {
      fs.writeFileSync(`${outputDir}/${name}`, bytes);
      console.log(`  wrote ${outputDir}/${name}  ${block.source.media_type}  ${bytes.length} bytes`);
    } else {
      console.log(`  ${name}  ${block.source.media_type}  ${bytes.length} bytes  (from ${role})`);
    }
    index += 1;
  }
});
stream.on("close", () => {
  if (index === 0) console.log("  no attachments in this transcript");
  else if (action === "list") console.log(`\n  ${index} attachment(s) — extract them with: scripts/session-attachments.sh extract <dir>`);
});
' "$TRANSCRIPT" "$ACTION" "${OUTPUT_DIR:-}"
