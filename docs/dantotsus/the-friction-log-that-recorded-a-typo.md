---
date: 2026-10-29
introduced-at: implementation
detected-at: local
severity: low
related-pr: '#230'
fix-commits: [bf651455d, 2e5e2948d]
eradication-level: 2
eradication-paths: [scripts/kaizen.sh]
time-to-detect: one turn
tags: [harness, tooling, process]
zone: scripts/kaizen.sh
recurs: [the-wrapper-that-hid-the-subcommand]
---

# The friction log that recorded a typo

## User impact

While opening PR #230, the session ran `scripts/kaizen.sh list` to see what
the log held. The script answered `logged as main: list`, and `KAIZEN.md`
gained the line ``- [2026-10-29 12:24] `main` list``. The session deleted
that line by hand before archiving. A session that had not read the output
would have archived the word `list` as friction for the sweep to triage.
Expected: an unknown subcommand is refused and nothing is logged.

## Causal chain

- The word `list` became a friction entry.
  - The session guessed a subcommand name. `show` is the real one.
    - The script's `case` sent every first argument that was not `show` or
      `init` to the logging branch. Commit `848717821`, written by an agent,
      wrote it:

      ```sh
      case "${1:-}" in
        show) ... ;;
        init) ... ;;
        *)                 # ← ❌ a mistyped subcommand and a friction sentence take the same branch
          ensure_file
          ...
      ```

      - The interface puts the free-text sentence in the same positional
        argument as the subcommand names, so the script cannot tell a typo
        from a sentence. Its own usage line read
        `scripts/kaizen.sh [--from <label>] "<what went wrong, one sentence>" | show`.
        This was the second time a session guessed at `kaizen.sh`'s
        subcommands, after
        [`the-wrapper-that-hid-the-subcommand`](./the-wrapper-that-hid-the-subcommand.md).
        **Machine:** the command's interface made the guess silent.

## Root cause of occurrence

*Thought free text and subcommand names could share the first argument,
because a sentence never looks like a subcommand, actually a mistyped or
guessed subcommand looks exactly like a one-word sentence.* Machine, for the
script's author: the interface left the script no way to refuse a wrong
verb.

## Detection failure causes

- **Typing and linter:** a shell argument has no type.
- **Local validation:** the script printed `logged as main: list`, which only
  a reader who checks every output notices.
- **Code review:** no reviewer sees the gitignored log until the archive is
  committed.

## Countermeasure

The session removed the line from `KAIZEN.md` before
`scripts/kaizen.sh archive`.

## Eradication

**Type:** DevX check (level 2)

**Reference:** commit [`bf651455d`](https://github.com/hugoleborso/borso.fr/commit/bf651455d)
(PR #232) made the logging branch refuse an argument with no whitespace.
Commit [`2e5e2948d`](https://github.com/hugoleborso/borso.fr/commit/2e5e2948d)
(PR #418) later made it refuse any line without `--where`. Both hold in
`scripts/kaizen.sh`:

```sh
  *)
    if [[ "$*" != *[[:space:]]* ]]; then
      printf 'scripts/kaizen.sh: "%s" is not a subcommand (show, archive, balance, init), and one word is not a friction sentence. Nothing logged.\n' "$*" >&2
      exit 1
    fi
    if [ -z "$WHERE" ]; then
      printf 'scripts/kaizen.sh: say where you saw it with --where ...' >&2
      exit 1
    fi
```

This entry first said level 1. Both are runtime refusals inside the
catch-all branch, so a guessed subcommand of two words with a `--where` is
still logged. Level 2 is what holds.

**Proposed:** subtract the heuristic. The `--where` refusal already rejects
`scripts/kaizen.sh list`, so the one-word check can be deleted. Then put the
sentence behind its own subcommand or flag, such as
`scripts/kaizen.sh log --where "<place>" "<what you saw>"`, and make the
catch-all branch refuse every unknown first argument. A wrong verb would then
fail whatever its length, with no heuristic at all.

**Proof it can fail:** measured on the fix's branch. With the fix removed:

```text
$ scripts/kaizen.sh list
[kaizen] logged as main: list
exit 0
```

With the fix:

```text
$ scripts/kaizen.sh list
scripts/kaizen.sh: "list" is not a subcommand (show, archive, init), and one word is not a friction sentence. Nothing logged.
exit 1
```

**Similar instances:** the refusal names the subcommands by hand, and the
list is already behind the script. It says "show, archive, balance, init",
while the `case` also takes `sweep-input` (measured with
`grep -n "^  [a-z-]*)" scripts/kaizen.sh`). A dedicated `log` subcommand
would let the catch-all print the usage instead of a list kept by hand.
