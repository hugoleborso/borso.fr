#!/usr/bin/env bash
# Fails when a stylesheet or an HTML page carries a comment.
#
# `borso/no-comments` is an ESLint rule, and ESLint lints no `.css` and no
# `.html` in this repository, so the standard in docs/standards/00-principles.md
# reaches every source file except these two kinds. This closes that gap with
# the same question: is the comment machine-read, or is it prose a name should
# have carried?
#
# What stays, because a script parses it and fails without it:
#   /* @third-party-dom <id>: <why no element can carry a class> */ ... 
#   /* @end-third-party-dom */
# read by scripts/check-stylesheet-contents.sh, and a conditional comment,
# which is markup rather than prose.
set -euo pipefail

failed=0

while IFS= read -r path; do
  [ -f "$path" ] || continue
  offending=$(
    perl -0777 -ne '
      while (/\/\*(.*?)\*\//gs) {
        my $body = $1;
        next if $body =~ /\@(end-)?third-party-dom/;
        my $line = 1 + substr($_, 0, pos($_) - length($body) - 4) =~ tr/\n//;
        print "$line\n";
      }
    ' "$path"
  )
  for line in $offending; do
    echo "  $path:$line carries a comment" >&2
    failed=1
  done
done < <(git ls-files '*.css' | grep -v '^docs/features/' || true)

while IFS= read -r path; do
  [ -f "$path" ] || continue
  offending=$(
    perl -0777 -ne '
      while (/<!--(.*?)-->/gs) {
        my $body = $1;
        next if $body =~ /^\[if /;
        my $line = 1 + substr($_, 0, pos($_) - length($body) - 7) =~ tr/\n//;
        print "$line\n";
      }
    ' "$path"
  )
  for line in $offending; do
    echo "  $path:$line carries a comment" >&2
    failed=1
  done
done < <(git ls-files '*.html' | grep -v '^docs/features/' || true)

if [ "$failed" -ne 0 ]; then
  echo >&2
  echo "There are no comments in this code. Replace each one with a clearer name," >&2
  echo "a named custom property, or a document under docs/." >&2
  echo "See docs/standards/00-principles.md." >&2
  exit 1
fi

echo "[check-no-comments-in-styles-and-markup] no stylesheet or page carries a comment"
