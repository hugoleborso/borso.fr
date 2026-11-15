#!/usr/bin/env bash
# Fails when a vocabulary or an invariants file states a fact that is no longer
# true, or when a rule moves back into a glossary.
#
# A vocabulary is split in two (docs/adr/2026-11-15T0628-glossary-and-invariants-are-two-files.md).
# `apps/<app>/VOCABULARY.md` and the repository's `docs/VOCABULARY.md` are
# glossaries: what a word means, where it lives, what not to confuse it with.
# The rules a term holds, and the tests that hold them, sit in an
# `INVARIANTS.md` in the folder the term lives in, beside the code an agent is
# about to touch. Most of a glossary or an invariant is prose, and a reviewer's
# job. What this script checks are the parts that are facts.
#
# Each term names the folder that owns it on a `Lives in:` line. That line rots
# first, because a slice gets renamed by a change that has no reason to open
# the vocabulary.
#
# There are no comments in this code, so a sentence saying a file header names
# something cites an artefact that cannot exist. It already decayed once:
# `self-punch.controller.ts` claimed a geofence was the only barrier, the
# vocabulary repeated the claim, and the geofence had been removed months
# earlier in 4bb4b78. See docs/dantotsus/a-comment-decayed-and-took-the-vocabulary-with-it.md.
#
# An invariant names the test that holds it on a
# `Held by: `<test file>` › <test title>` line, relative to the application
# folder, and this script fails when that file or that title is gone. The
# vocabulary once promised "voiding is what lets a runner be punched again"
# while no test asserted it and the code refused it; see
# docs/dantotsus/a-voided-punch-still-held-its-loop.md.
#
# The split keeps the old single file's one property worth keeping, that a
# reader of a term can reach every rule about it: a term with rules carries an
# `Invariants:` line naming its file, that file must hold a section with the
# term's exact heading, and every section of an invariants file must be a term
# whose `Invariants:` line names that file. A glossary may not carry a `Held by`
# line or a rule bullet, so the rules cannot drift back into the file every
# agent reads. The bullets a term keeps are `Code:` (the identifiers it is
# spelled as) and `Not to be confused with`.
#
# It reads from the repository root whatever the working directory: run from
# apps/pragma, it once found no vocabulary and passed.
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."

failed=0
HELD_BY_LINE='^Held by: `([^`]+)` › (.+)$'
COMMENT_CITATION='(file )?header (names|says|records|states)|the comment (above|beside|on)\b'
declare -A test_sources=()
declare -A term_owner=()
declare -A invariants_section=()
invariants_records=()

# Each test file is read once, however many invariants it holds: pragma has
# close to three hundred Held by lines, and one grep per line cost 1.8 s of CPU
# on the commit.
test_source_names_title() {
  if [ -z "${test_sources[$1]+read}" ]; then
    test_sources[$1]=$(<"$1")
  fi
  [[ ${test_sources[$1]} == *"'$2'"* ]]
}

fail() {
  echo "  $1" >&2
  failed=1
}

refuse_comment_citations() {
  while IFS= read -r citation; do
    [ -n "$citation" ] || continue
    fail "$1 sources a claim from a comment: $citation"
  done < <(grep -nEi "$COMMENT_CITATION" "$1" || true)
}

# A section is a term when it has a `Lives in:` line, so the closing
# "Words we do not use" list and a list of links are not read as rules.
# Prints one record per term of a glossary, `term<TAB>heading<TAB>invariants path`,
# and one `rule<TAB>line` per bullet a glossary may not carry.
read_glossary() {
  awk '
    function close_section() {
      if (heading != "" && lives) { print "term\t" heading "\t" invariants; printf "%s", rules }
    }
    /^## / { close_section(); heading = substr($0, 4); invariants = ""; rules = ""; lives = 0; next }
    heading == "" { next }
    /^Lives in:/ { lives = 1 }
    /^Invariants: `[^`]+`$/ { invariants = $0; sub(/^Invariants: `/, "", invariants); sub(/`$/, "", invariants); next }
    /^- / && !/^- (Code:|Not to be confused)/ { rules = rules "rule\t" FNR ": " $0 "\n" }
    END { close_section() }
  ' "$1"
}

check_lives_in() {
  local glossary=$1 base=$2 target
  while IFS= read -r target; do
    [ -n "$target" ] || continue
    if [ ! -e "$base/$target" ] && [ ! -e "$base/${target%/}" ]; then
      fail "$glossary points at $target, which is not in $base"
    fi
  done < <(grep -oE '^Lives in: `[^`]+`' "$glossary" | sed -E 's/^Lives in: `([^`]+)`/\1/')
}

check_glossary() {
  local glossary=$1 base=$2 kind heading invariants
  check_lives_in "$glossary" "$base"
  refuse_comment_citations "$glossary"
  while IFS= read -r held_by; do
    [ -n "$held_by" ] || continue
    fail "$glossary carries a Held by line; it belongs in the INVARIANTS.md of the term's folder: $held_by"
  done < <(grep -nE '^[[:space:]]*Held by:' "$glossary" || true)
  while IFS=$'\t' read -r kind heading invariants; do
    if [ "$kind" = rule ]; then
      fail "$glossary carries a rule in a term; move it to the INVARIANTS.md of the term's folder: $heading"
      continue
    fi
    [ -n "$invariants" ] || continue
    if [ ! -f "$base/$invariants" ]; then
      fail "$glossary sends $heading to $invariants, which is not in $base"
    elif [ -z "${invariants_section["$base/$invariants|$heading"]+held}" ]; then
      fail "$glossary sends $heading to $invariants, which has no section ## $heading"
    else
      term_owner["$base/$invariants|$heading"]=1
    fi
  done < <(read_glossary "$glossary")
}

# Every invariants file is read in one pass: one grep per file and per kind of
# line cost 1.5 s of CPU on a commit, nine times the single-file check it
# replaced. Prints `section`, `held` and `indented` records, each
# `kind<TAB>file<TAB>value`. Comment citations are one grep over every file,
# because awk -v turns the pattern's `\b` into a backspace and matched nothing.
read_invariants() {
  awk '
    /^## / { print "section\t" FILENAME "\t" substr($0, 4); next }
    /^Held by:/ { print "held\t" FILENAME "\t" $0; next }
    /^[[:space:]]+Held by:/ { print "indented\t" FILENAME "\t" FNR ": " $0 }
  ' "$@"
}

check_invariants() {
  local kind invariants value app_directory test_file test_title
  [ "${#invariants_records[@]}" -gt 0 ] || return 0
  while IFS=$'\t' read -r kind invariants value; do
    app_directory=${invariants#apps/}
    app_directory=apps/${app_directory%%/*}
    case $kind in
      indented) fail "$invariants has an indented Held by line, which the check above never reads; start it at column 0: $value" ;;
      section)
        if [ -z "${term_owner["$invariants|$value"]+named}" ]; then
          fail "$invariants holds rules for $value, and no term of $app_directory/VOCABULARY.md sends its reader here"
        fi
        ;;
      held)
        if [[ $value =~ $HELD_BY_LINE ]]; then
          test_file=${BASH_REMATCH[1]}
          test_title=${BASH_REMATCH[2]}
        else
          test_file=''
          test_title=''
        fi
        if [ -z "$test_file" ] || [ -z "$test_title" ]; then
          fail "$invariants has a Held by line that is not \`<test file>\` › <test title>: $value"
        elif [ ! -f "$app_directory/$test_file" ]; then
          fail "$invariants holds an invariant with $test_file, which is not in $app_directory"
        elif ! test_source_names_title "$app_directory/$test_file" "$test_title"; then
          fail "$invariants holds an invariant with a test $test_file does not have: $test_title"
        fi
        ;;
    esac
  done < <(printf '%s\n' "${invariants_records[@]}")
}

invariants_files=()
mapfile -t invariants_files < <(git ls-files --cached --others --exclude-standard -- 'apps/*/INVARIANTS.md')
if [ "${#invariants_files[@]}" -gt 0 ]; then
  mapfile -t invariants_records < <(read_invariants "${invariants_files[@]}")
fi
for record in "${invariants_records[@]}"; do
  [[ $record == section$'\t'* ]] || continue
  record=${record#section$'\t'}
  invariants_section["${record%%$'\t'*}|${record#*$'\t'}"]=1
done

found_any=0
[ -f docs/VOCABULARY.md ] && check_glossary docs/VOCABULARY.md .
for vocabulary in apps/*/VOCABULARY.md; do
  [ -f "$vocabulary" ] || continue
  found_any=1
  check_glossary "$vocabulary" "$(dirname "$vocabulary")"
done

check_invariants
if [ "${#invariants_files[@]}" -gt 0 ]; then
  while IFS= read -r citation; do
    [ -n "$citation" ] || continue
    fail "${citation%%:*} sources a claim from a comment: ${citation#*:}"
  done < <(grep -HnEi "$COMMENT_CITATION" "${invariants_files[@]}" || true)
fi

# The repository glossary is the map of every application glossary, so an
# application whose glossary it does not link is one nobody finds from there.
if [ -f docs/VOCABULARY.md ]; then
  glossary_map=$(awk '/^## / { listing = ($0 == "## Glossaries"); next } listing' docs/VOCABULARY.md)
  for vocabulary in apps/*/VOCABULARY.md; do
    [ -f "$vocabulary" ] || continue
    [[ $glossary_map == *"(../$vocabulary)"* ]] ||
      fail "docs/VOCABULARY.md does not list $vocabulary under ## Glossaries"
  done
fi

if [ "$found_any" -eq 0 ]; then
  echo "[check-vocabulary-paths] no application ships a VOCABULARY.md"
  exit 0
fi

if [ "$failed" -ne 0 ]; then
  echo >&2
  echo "A term whose folder moved is a term nobody will trust again, a" >&2
  echo "definition sourced from a comment cites something this repository" >&2
  echo "no longer has, a Held by line naming a test that is gone is a promise" >&2
  echo "nothing checks, and a rule in the glossary is a rule every agent reads." >&2
  echo "Define the word in VOCABULARY.md; state the rule in the INVARIANTS.md" >&2
  echo "of its folder, and point at the test that holds it." >&2
  exit 1
fi

echo "[check-vocabulary-paths] every term names a folder that exists and reaches its invariants, every Held by names a test that exists, and no glossary holds a rule or cites a comment"
