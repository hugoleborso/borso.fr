#!/usr/bin/env bash
# Pre-commit gate: an application's one stylesheet holds tokens, and nothing
# that reaches an element the JSX could have styled.
#
# docs/standards/08-styling.md puts component styles inline as Tailwind
# utilities, allows one CSS file per application, and says that file holds an
# `@theme` block and nothing else. A global `.classname { … }` rule there is
# banned by name, because it is the cascade coming back: the class is invisible
# in the JSX that renders it, its specificity fights every utility on the same
# element, and deleting the component leaves the rule behind.
#
# check-single-stylesheet.sh counts the files and never opens one, so the
# standard's second half — what the file may contain — had no gate at all and
# the "Enforced by" section named a reviewer for it. That is the shape recorded
# in docs/dantotsus/an-approval-gate-that-only-existed-in-a-comment.md, and
# reviewer judgement is the rung this check climbs off.
#
# ESLint cannot do this one. The repository configures no CSS parser, and
# adding one to lint four files would be a language, a plugin and a second
# config for a check that is a selector test.
#
# WHAT IS ALLOWED
#
#   @import, @theme, @keyframes, @font-face, @property   at-rules whose body
#                                                        declares tokens or
#                                                        frames, never a page
#                                                        element
#   @media, @supports, @container                        transparent: whatever
#                                                        they wrap is checked
#                                                        as if unwrapped
#   @layer <name> { … }                                  element selectors,
#                                                        `:root`, `*`, and
#                                                        `#root`
#   :root { … } at the top level                         the token overrides a
#                                                        media query needs,
#                                                        which cannot be
#                                                        written inside @theme
#
# WHAT IS REJECTED
#
#   a class selector, anywhere                           the standard bans it
#                                                        by name
#   an id selector other than `#root`                     same reach, higher
#                                                        specificity
#   an element rule outside `@layer`                     unlayered CSS outranks
#                                                        every utility Tailwind
#                                                        emits, whatever the
#                                                        selector, so `body { … }`
#                                                        at the top level beats
#                                                        the classes on the
#                                                        element it targets.
#                                                        Wrapping it in
#                                                        `@layer base` puts it
#                                                        back under them.
#
# `#root` is allowed because the mount node is declared in `index.html` and no
# component renders it, so there is no JSX to carry a utility.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

failed=0

# Tracked files only, minus the ones deleted in the working tree but not yet
# staged, for the same two reasons check-single-stylesheet.sh reads the index:
# `coverage/` and `.stryker-tmp/` are gitignored and full of CSS, and a
# half-finished migration would otherwise report a file that is already gone.
list_application_stylesheets() {
  local tracked removed
  tracked="$(git ls-files -- ':(glob)apps/*/site/**' | { /usr/bin/grep -E '\.css$' || true; })"
  removed="$(git ls-files --deleted -- ':(glob)apps/*/site/**' |
    { /usr/bin/grep -E '\.css$' || true; })"
  /usr/bin/comm -23 <(printf '%s\n' "$tracked" | sort) <(printf '%s\n' "$removed" | sort) |
    { /usr/bin/grep -E '\.css$' || true; }
}

# Reports one line per offending rule: `<line>|<selector>|<reason>`.
#
# The scan is a character walk rather than a line grep, because a selector and
# its brace are on the same line only by convention, an at-rule's body has to be
# skipped or checked depending on which at-rule it is, and a `{` inside a string
# — the data URI in borso-fr's `@theme` is one — would put a line-based reader
# permanently one level deep.
read_offending_rules() {
  /usr/bin/awk '
    { text = text $0 "\n" }

    function strip_comments(source,   result, index_, character, pair, in_comment) {
      result = ""; in_comment = 0
      for (index_ = 1; index_ <= length(source); index_++) {
        character = substr(source, index_, 1)
        pair = substr(source, index_, 2)
        if (!in_comment && pair == "/*") { in_comment = 1; index_++; continue }
        if (in_comment && pair == "*/") { in_comment = 0; index_++; continue }
        if (in_comment) { result = result (character == "\n" ? "\n" : " "); continue }
        result = result character
      }
      return result
    }

    function at_rule_kind(prelude,   name) {
      name = prelude
      sub(/[ \t\n(].*$/, "", name)
      if (name == "@media" || name == "@supports" || name == "@container") return "transparent"
      if (name == "@layer") return "layer"
      return "opaque"
    }

    function is_inside_opaque(   depth_) {
      for (depth_ = 1; depth_ <= depth; depth_++) if (kind[depth_] == "opaque") return 1
      return 0
    }

    function is_inside_layer(   depth_) {
      for (depth_ = 1; depth_ <= depth; depth_++) if (kind[depth_] == "layer") return 1
      return 0
    }

    # A library that renders its own DOM cannot be styled with a utility class,
    # because there is no JSX element to put the class on. Leaflet is the case
    # this exists for. The exception is written where it applies and names the
    # library and the reason, so a reviewer reads the claim with the code, the
    # same shape as an `eslint-disable-next-line <rule> -- <reason>`:
    #
    #   /* @third-party-dom leaflet: renders tiles into DOM it owns */
    #   .course-map .leaflet-tile { … }
    #   /* @end-third-party-dom */
    #
    # It exempts class selectors only. An unlayered element rule inside the
    # region still reports, because that one is about the cascade rather than
    # about who owns the DOM.
    function build_exempt_ranges(   count, index_, lines, open_line) {
      count = split(text, lines, "\n"); exempt_count = 0; open_line = 0
      for (index_ = 1; index_ <= count; index_++) {
        if (lines[index_] ~ /@third-party-dom[ \t]+[A-Za-z0-9_-]+[ \t]*:/) { open_line = index_; continue }
        if (lines[index_] ~ /@end-third-party-dom/ && open_line > 0) {
          exempt_count++
          exempt_start[exempt_count] = open_line
          exempt_end[exempt_count] = index_
          open_line = 0
        }
      }
    }

    function is_exempt(line,   index_) {
      for (index_ = 1; index_ <= exempt_count; index_++) {
        if (line >= exempt_start[index_] && line <= exempt_end[index_]) return 1
      }
      return 0
    }

    function report(line, selector, reason) {
      if (reason == "class selector" && is_exempt(line)) return
      printf "%d|%s|%s\n", line, selector, reason
    }

    function check_selectors(prelude, line,   parts, count, index_, selector, layered) {
      layered = is_inside_layer()
      count = split(prelude, parts, ",")
      for (index_ = 1; index_ <= count; index_++) {
        selector = parts[index_]
        gsub(/^[ \t\n]+|[ \t\n]+$/, "", selector)
        gsub(/[ \t\n]+/, " ", selector)
        if (selector == "") continue
        if (selector ~ /\.[A-Za-z_-]/) { report(line, selector, "class selector"); continue }
        if (selector ~ /#/ && selector !~ /^#root$/) {
          report(line, selector, "id selector"); continue
        }
        if (!layered && selector != ":root") { report(line, selector, "unlayered rule") }
      }
    }

    END {
      build_exempt_ranges()
      source = strip_comments(text)
      depth = 0; prelude = ""; line = 1; prelude_line = 1
      for (index_ = 1; index_ <= length(source); index_++) {
        character = substr(source, index_, 1)
        if (character == "\n") { line++; prelude = prelude " "; continue }
        if (character == "\"" || character == "'"'"'") {
          quote = character
          for (index_++; index_ <= length(source); index_++) {
            character = substr(source, index_, 1)
            if (character == "\n") line++
            if (character == quote) break
          }
          continue
        }
        if (character == ";") { prelude = ""; continue }
        if (character == "}") { if (depth > 0) depth--; prelude = ""; continue }
        if (character != "{") {
          if (prelude ~ /^[ \t]*$/ && character !~ /[ \t]/) prelude_line = line
          prelude = prelude character
          continue
        }
        gsub(/^[ \t\n]+|[ \t\n]+$/, "", prelude)
        if (substr(prelude, 1, 1) == "@") {
          depth++; kind[depth] = at_rule_kind(prelude)
        } else {
          if (!is_inside_opaque()) check_selectors(prelude, prelude_line)
          depth++; kind[depth] = "opaque"
        }
        prelude = ""
      }
    }
  ' "$1"
}

while read -r stylesheet; do
  [ -n "$stylesheet" ] || continue
  offences="$(read_offending_rules "$stylesheet")"
  [ -n "$offences" ] || continue

  printf '\033[31m[stylesheet-contents] FAIL\033[0m %s\n' "$stylesheet"
  while IFS='|' read -r rule_line selector reason; do
    printf '  %s:%s  %s  (%s)\n' "$stylesheet" "$rule_line" "$selector" "$reason"
  done <<<"$offences"
  failed=1
done <<<"$(list_application_stylesheets)"

if [ "$failed" -ne 0 ]; then
  printf '\nAn application keeps one CSS file, holding `@import "tailwindcss"`, its\n'
  printf '`@theme` block, its `@keyframes`, and the base rules it cannot write as\n'
  printf 'utilities. A class selector belongs on the JSX element as a Tailwind\n'
  printf 'utility, and a base element rule belongs inside `@layer base`, where the\n'
  printf 'utilities still outrank it. See docs/standards/08-styling.md.\n'
  exit 1
fi

printf '[check-stylesheet-contents] every application stylesheet holds tokens and layered base rules only\n'
