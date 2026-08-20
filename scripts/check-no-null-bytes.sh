#!/usr/bin/env bash
# Fails when a tracked text file carries a NUL byte.
#
# A NUL inside a string literal is invisible everywhere a human would look. It
# renders as nothing in an editor, `git diff` shows the line as unchanged
# whitespace, ESLint and Prettier both accept it, and TypeScript compiles it,
# because a NUL is a perfectly legal character inside a string. The failure
# arrives much later and somewhere else: `execFileSync` refuses an argument
# containing one, and a separator built from one silently stops matching.
#
# It happened three times in one session while an agent wrote files through a
# tool transport that turned a space into a NUL. Nothing in the repository
# noticed, and the only thing that found it was `cat -A`.
set -euo pipefail

failed=0
while IFS= read -r path; do
  [ -f "$path" ] || continue
  case "$path" in
    *.png | *.jpg | *.jpeg | *.gif | *.ico | *.webp | *.avif | *.pdf | *.woff | *.woff2 | *.ttf | *.otf | *.gz | *.zip | *.mp4 | *.webm) continue ;;
  esac
  if ! tr -d '\000' <"$path" | cmp -s - "$path"; then
    echo "  $path carries a NUL byte" >&2
    failed=1
  fi
done < <(git ls-files)

if [ "$failed" -ne 0 ]; then
  echo >&2
  echo "A NUL byte is legal in a string and invisible in every editor and diff." >&2
  echo "Find it with: cat -A <file> | grep '\\^@'" >&2
  exit 1
fi

echo "[check-no-null-bytes] no tracked text file carries a NUL byte"
